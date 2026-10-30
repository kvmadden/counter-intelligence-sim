import {
  BufferGeometry,
  DataTexture,
  Float32BufferAttribute,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  RGBAFormat,
  RepeatWrapping,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
} from "three";

// The last pass: reduce the low-resolution frame to 5 bits per channel, as the
// N64's RGBA5551 framebuffer did (32 levels, 0..31), with an ordered dither to
// break up the banding that leaves in fog and flat light.
export const COLOR_DEPTH = 31;

// The dither matrix: the standard 4x4 Bayer pattern (the ordered dither the
// N64's RDP offered), generated here rather than shipped as an image.
const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

/*! Counter Intelligence: N64-style colour-depth reduction with ordered dither.
 * GLSL port of the band-dither post-process in godot-n64-shader-demo, which is
 * itself based on the dither post shader in godot-psx-shaders-demo.
 *
 * MIT License
 *
 * Copyright (c) 2020 MenacingMecha
 * Copyright (c) 2019 Lucas Rodrigues, Witty Cognomen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export const DITHER_FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D ditherTex;
uniform float colDepth;
uniform bool ditherBanding;
varying vec2 vUv;
vec3 quantized( vec2 uv ) {
	vec4 color = texture2D( tScene, uv );
	vec2 dithSize = vec2( textureSize( ditherTex, 0 ) );
	vec2 bufSize = vec2( textureSize( tScene, 0 ) );
	vec3 dith = texture2D( ditherTex, uv * ( bufSize / dithSize ) ).rgb;
	dith -= 0.5;
	color.rgb = round( color.rgb * colDepth + dith * ( ditherBanding ? 1.0 : 0.0 ) ) / colDepth;
	return color.rgb;
}
void main() {
	// Not part of the port: the N64's video interface softened each scanline on its
	// way to the TV, which is what smeared its dither. A 1-2-1 horizontal blend of
	// the quantized neighbours does the same.
	vec2 dx = vec2( 1.0 / float( textureSize( tScene, 0 ).x ), 0.0 );
	vec3 color = 0.25 * quantized( vUv - dx ) + 0.5 * quantized( vUv ) + 0.25 * quantized( vUv + dx );
	gl_FragColor = vec4( color, 1.0 );
}
`;

function ditherTexture() {
  const data = new Uint8Array(BAYER_4X4.length * 4);
  BAYER_4X4.forEach((value, index) => {
    const level = Math.round(((value + 0.5) / 16) * 255);
    data.set([level, level, level, 255], index * 4);
  });
  const texture = new DataTexture(data, 4, 4, RGBAFormat, UnsignedByteType);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export function createPostPass(sceneTexture) {
  const dither = ditherTexture();
  const material = new ShaderMaterial({
    uniforms: {
      tScene: { value: sceneTexture },
      ditherTex: { value: dither },
      colDepth: { value: COLOR_DEPTH },
      ditherBanding: { value: true },
    },
    vertexShader: VERTEX,
    fragmentShader: DITHER_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  // One triangle that covers the whole frame.
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute("uv", new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new Scene();
  scene.add(mesh);
  return {
    scene,
    camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    // What this pass holds on the GPU, so a lost context can be swept (stage.js).
    gpuObjects: [geometry, material, dither],
    dispose() {
      geometry.dispose();
      material.dispose();
      dither.dispose();
    },
  };
}
