import { describe, expect, it } from "vitest";
import { ShaderChunk, ShaderLib, Texture } from "three";
import { MAP_INCLUDE, MAP_PARS_INCLUDE, litTextured, patchThreePoint } from "../../src/counter/n64/materials.js";

describe("N64 three-point texture filter", () => {
  it("still finds the three.js chunks it replaces, so an upgrade cannot silently drop it", () => {
    expect(ShaderChunk.map_fragment).toContain("texture2D( map, vMapUv )");
    expect(ShaderLib.lambert.fragmentShader).toContain(MAP_PARS_INCLUDE);
    expect(ShaderLib.lambert.fragmentShader).toContain(MAP_INCLUDE);
    expect(patchThreePoint(ShaderLib.lambert.fragmentShader)).not.toContain(MAP_INCLUDE);
  });

  it("is really applied by the textured-material factory, so the crisp look cannot quietly return", () => {
    const material = litTextured(new Texture());
    const shader = { fragmentShader: ShaderLib.lambert.fragmentShader, vertexShader: ShaderLib.lambert.vertexShader, uniforms: {} };
    material.onBeforeCompile(shader);
    expect(shader.fragmentShader).toContain("vec4 n64ThreePoint( sampler2D tex, vec2 uv )");
    expect(shader.fragmentShader).toContain("diffuseColor *= n64ThreePoint( map, vMapUv );");
    expect(material.customProgramCacheKey()).toBe("n64-three-point");
  });
});
