import { MeshBasicMaterial, MeshLambertMaterial } from "three";

// The N64 three-point texture filter, written for this game from the published
// description of the console's Reality Display Processor. Where bilinear
// filtering blends the four texels around a sample, the N64 blended only the
// three texels of the triangle that contains it, weighted barycentrically,
// which is where its soft textures get their faint diagonal seams. A texture
// drawn through it must be uploaded with NEAREST filtering, so that each fetch
// below returns one exact texel.
export const THREE_POINT_GLSL = /* glsl */ `
vec4 n64ThreePoint( sampler2D tex, vec2 uv ) {
	vec2 size = vec2( textureSize( tex, 0 ) );
	vec2 texel = uv * size - 0.5;
	vec2 cell = floor( texel );
	vec2 f = texel - cell;
	vec2 texelStep = 1.0 / size;
	vec2 origin = ( cell + 0.5 ) * texelStep;
	bool upper = f.x + f.y >= 1.0;
	vec4 corner = texture2D( tex, upper ? origin + texelStep : origin );
	vec4 across = texture2D( tex, origin + vec2( texelStep.x, 0.0 ) );
	vec4 down = texture2D( tex, origin + vec2( 0.0, texelStep.y ) );
	vec2 w = upper ? 1.0 - f.yx : f;
	return corner + w.x * ( across - corner ) + w.y * ( down - corner );
}
`;

// The three.js shader chunks the filter hooks. tests/unit/counter-n64.test.js
// fails if a three.js upgrade renames them, which would otherwise silently
// drop the filter and fall back to plain texture sampling.
export const MAP_PARS_INCLUDE = "#include <map_pars_fragment>";
export const MAP_INCLUDE = "#include <map_fragment>";
const THREE_POINT_MAP = "#ifdef USE_MAP\n\tdiffuseColor *= n64ThreePoint( map, vMapUv );\n#endif";

export function patchThreePoint(fragmentShader) {
  return fragmentShader
    .replace(MAP_PARS_INCLUDE, `${MAP_PARS_INCLUDE}\n${THREE_POINT_GLSL}`)
    .replace(MAP_INCLUDE, THREE_POINT_MAP);
}

function threePoint(material) {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = patchThreePoint(shader.fragmentShader);
  };
  material.customProgramCacheKey = () => "n64-three-point";
  return material;
}

// Flat Lambert lighting throughout; textured surfaces sample through the filter.
export const litTextured = (map) => threePoint(new MeshLambertMaterial({ map }));
export const litFlat = () => new MeshLambertMaterial({ vertexColors: true });
export const litColor = (color) => new MeshLambertMaterial({ color });
// Lamps: unlit, still fogged.
export const glowFlat = () => new MeshBasicMaterial({ vertexColors: true });
// Daylight through the storefront glass: unlit and unfogged, so it shines through the haze.
export const daylight = () => new MeshBasicMaterial({ vertexColors: true, fog: false });
