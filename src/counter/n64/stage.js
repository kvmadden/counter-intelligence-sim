import {
  AmbientLight,
  ColorManagement,
  DirectionalLight,
  Fog,
  LinearSRGBColorSpace,
  MathUtils,
  NearestFilter,
  PerspectiveCamera,
  Scene,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { store } from "../theme.js";
import { buildPharmacy } from "./pharmacy.js";
import { buildPatient, lookFor } from "./patient.js";
import { buildPenHand } from "./penHand.js";
import { createPostPass } from "./post.js";
import * as paint from "./textures.js";

// N64-era colour: no linear-light management. Palette values reach the frame
// as authored, and lighting happens in gamma space, as the hardware did it.
ColorManagement.enabled = false;

// The internal render width in pixels. The canvas is upscaled by CSS with the
// browser's smooth (linear) filter: that is what makes it soft and smeary like
// an N64 on a CRT, rather than crisp-pixel SNES.
export const RENDER_WIDTH = 200;

// Standing behind the counter, looking down across it at the patient: the head
// sits in the upper third, the counter top fills the lower third.
const EYE = { x: 0, y: 1.62, z: 1.55 };
const PITCH = MathUtils.degToRad(13);
const LOOK = { x: 0, y: EYE.y - EYE.z * Math.tan(PITCH), z: 0 };
// At least this vertical field of view, widened when the viewport is too narrow
// to keep the patient's shoulders in frame. A touch wider than the Facility
// passes, so the pharmacist's gear on the counter reaches into the corners.
const MIN_VFOV = 58;
const PATIENT_HALF_WIDTH = 0.5;
const HAND_DEPTH = 0.42;

// Small, deterministic head turns, one per exchange.
const HEAD_POSES = [
  { x: 0, y: 0, z: 0 },
  { x: -0.05, y: 0.1, z: 0.02 },
  { x: 0.03, y: -0.08, z: -0.03 },
  { x: -0.02, y: 0.05, z: 0.04 },
];
const TURN_FRAMES = 7; // one head turn at the N64's ~15 frames a second
const TURN_FRAME_MS = 66;
// The opening pan (Kevin, 2026-09-15): the camera starts turned left, on the
// pharmacist's own stock bays and bins of filled bags, and sweeps to the patient
// in about a second and a half at the same frame rate. Skipped under reduced motion.
const PAN = { yaw: MathUtils.degToRad(65), frames: 22 };

// Returns a stage, or throws. When it throws, the WebGL context it opened has
// already been released: browsers allow only a handful per page.
export function createStage(canvas, options = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: "low-power" });
  try {
    return buildStage(renderer, canvas, options);
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
}

function buildStage(renderer, canvas, { patientId, faceUrl, hairUrl, reducedMotion = false, onReady, onLost, onCamera }) {
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(store.fog, 1);
  renderer.info.autoReset = false;

  const target = new WebGLRenderTarget(RENDER_WIDTH, RENDER_WIDTH, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    generateMipmaps: false,
    depthBuffer: true,
    stencilBuffer: false,
  });
  const post = createPostPass(target.texture);

  // The patient's look: their build, clothes and hair (patient.js), Jordan's by default.
  const look = lookFor(patientId);
  const face = paint.imageTexture(faceUrl);
  const hair = paint.imageTexture(hairUrl, { repeat: true });
  const textures = {
    floorTiles: paint.floorTiles(),
    ceilingTiles: paint.ceilingTiles(),
    storeWall: paint.storeWall(),
    gondolaStock: paint.gondolaStock(),
    signs: paint.signAtlas(),
    counterTop: paint.counterTop(),
    pharmacyStock: paint.pharmacyStock(),
    bagBins: paint.bagBins(),
    cloth: paint[look.cloth.paint](look.palette),
    face: face.texture,
    hair: hair.texture,
  };

  const scene = new Scene();
  scene.fog = new Fog(store.fog, 3.8, 11.5);
  // Flat Lambert light under fluorescent tubes: a strong ambient and one soft key
  // from overhead and a little to the left, kept under 1 so the photo face holds
  // its own colour. (three.js Lambert divides by pi, hence the factors.)
  const key = new DirectionalLight(store.lamp, 0.46 * Math.PI);
  key.position.set(-0.8, 3.4, 1.8);
  scene.add(new AmbientLight(store.lamp, 0.52 * Math.PI), key);
  scene.add(buildPharmacy(textures));
  const patient = buildPatient(textures, look);
  scene.add(patient.group);

  const camera = new PerspectiveCamera(55, 1, 0.05, 30);
  camera.position.set(EYE.x, EYE.y, EYE.z);
  // Looks at the patient turned `yaw` radians to the left, keeping the same downward pitch.
  const aim = (yaw) => {
    const dx = LOOK.x - EYE.x;
    const dz = LOOK.z - EYE.z;
    camera.lookAt(EYE.x + dx * Math.cos(yaw) + dz * Math.sin(yaw), LOOK.y, EYE.z - dx * Math.sin(yaw) + dz * Math.cos(yaw));
  };
  let panStep = reducedMotion ? PAN.frames : 0;
  let panTimer = 0;
  aim(reducedMotion ? 0 : PAN.yaw);
  onCamera?.(reducedMotion ? "settled" : "panning");
  const hand = buildPenHand();
  camera.add(hand);
  scene.add(camera);

  let height = RENDER_WIDTH;
  let sized = false;
  let texturesReady = false;
  let contextLost = false; // the browser took the context back (an iPhone backgrounding the tab)
  let broken = false; // a shader failed to compile: never present a frame drawn with it
  let live = false; // the last frame drew cleanly, and data-scene says webgl
  let disposed = false;
  let sceneCalls = 0;
  let timer = 0;

  const goDark = () => {
    live = false;
    window.clearTimeout(timer);
    window.clearTimeout(panTimer);
    panTimer = 0; // a restored context picks the pan up where it stopped
    onLost?.();
  };

  function panTick() {
    panStep += 1;
    const eased = 1 - (1 - panStep / PAN.frames) ** 3;
    aim(PAN.yaw * (1 - eased));
    render();
    if (panStep < PAN.frames) {
      panTimer = window.setTimeout(panTick, TURN_FRAME_MS);
    } else {
      panTimer = 0;
      onCamera?.("settled");
    }
  }

  // three still counts draw calls when a program fails to compile, so without
  // this a broken shader would announce a live scene. Fall back instead, and
  // say so on the console, where the browser tests fail on any error.
  renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
    const log = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertexShader), gl.getShaderInfoLog(fragmentShader)]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    console.error(`N64 scene: a shader failed to compile; showing the illustration instead. ${log}`.trim());
    broken = true;
    goDark();
  };

  function render() {
    if (!sized || !texturesReady || contextLost || broken || disposed) return;
    renderer.info.reset();
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    sceneCalls = renderer.info.render.calls;
    renderer.setRenderTarget(null);
    if (broken || contextLost) return;
    renderer.render(post.scene, post.camera);
    if (broken || contextLost || live) return;
    live = true;
    onReady?.({ drawCalls: sceneCalls, width: RENDER_WIDTH, height });
    if (panStep < PAN.frames && !panTimer) panTimer = window.setTimeout(panTick, TURN_FRAME_MS);
  }

  function frame(aspect) {
    const distance = EYE.z - LOOK.z;
    const tanHalf = Math.max(Math.tan(MathUtils.degToRad(MIN_VFOV / 2)), PATIENT_HALF_WIDTH / (distance * aspect));
    camera.fov = MathUtils.radToDeg(2 * Math.atan(tanHalf));
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // Keep the pen hand pinned to the lower-right corner at any aspect.
    const halfHeight = HAND_DEPTH * tanHalf;
    hand.position.set(halfHeight * aspect * 0.8, -halfHeight * 0.9, -HAND_DEPTH);
  }

  function resize(cssWidth, cssHeight) {
    if (!(cssWidth > 0 && cssHeight > 0)) return;
    const next = Math.max(1, Math.round((RENDER_WIDTH * cssHeight) / cssWidth));
    if (next !== height || !sized) {
      height = next;
      renderer.setSize(RENDER_WIDTH, height, false);
      target.setSize(RENDER_WIDTH, height);
    }
    sized = true;
    frame(RENDER_WIDTH / height);
    render();
  }

  let current = { ...HEAD_POSES[0] };
  let lastBeat = null;
  const pose = (p) => {
    patient.head.rotation.set(p.x, p.y, p.z);
    current = { ...p };
  };
  function beat(index) {
    const next = HEAD_POSES[Math.abs(index) % HEAD_POSES.length];
    const first = lastBeat === null;
    if (index === lastBeat) return;
    lastBeat = index;
    window.clearTimeout(timer);
    if (first || reducedMotion) {
      pose(next);
      render();
      return;
    }
    const from = { ...current };
    let step = 0;
    const tick = () => {
      step += 1;
      const t = step / TURN_FRAMES;
      const eased = 1 - (1 - t) * (1 - t);
      pose({ x: from.x + (next.x - from.x) * eased, y: from.y + (next.y - from.y) * eased, z: from.z + (next.z - from.z) * eased });
      render();
      if (step < TURN_FRAMES) timer = window.setTimeout(tick, TURN_FRAME_MS);
    };
    tick();
  }

  // The lost context took its GL objects with it, but three's managers from that
  // context stay subscribed to each object's "dispose". After a restore, a resize (the
  // render target's setSize) or leaving the encounter would have them delete handles
  // from the lost context, and WebKit logs each one as INVALID_OPERATION. Drop those
  // stale hooks, and three subscribes afresh as it re-uploads each object into the new
  // context. `_listeners` is three's EventDispatcher store (0.186). The browser test
  // for a lost and restored context holds this on WebKit.
  function forgetLostGl() {
    const owned = [target, ...(target.textures ?? [target.texture]), ...Object.values(textures), ...post.gpuObjects];
    scene.traverse((object) => {
      if (!object.isMesh) return;
      for (const material of [object.material].flat()) {
        owned.push(material, ...Object.values(material).filter((value) => value?.isTexture));
        for (const uniform of Object.values(material.uniforms ?? {})) if (uniform?.value?.isTexture) owned.push(uniform.value);
      }
      owned.push(object.geometry);
    });
    for (const object of owned) delete object?._listeners?.dispose;
  }

  const onContextLost = (event) => {
    event.preventDefault(); // asks the browser to hand the context back when it can
    contextLost = true;
    forgetLostGl();
    goDark();
  };
  // iOS drops the context when a tab goes to the background. three's own listener
  // has already rebuilt its GL state by the time this runs: restore the clear
  // colour and redraw, which announces the scene live again.
  const onContextRestored = () => {
    contextLost = false;
    renderer.setClearColor(store.fog, 1);
    render();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  Promise.all([face.ready, hair.ready]).then(
    () => {
      texturesReady = true;
      render();
    },
    () => {
      broken = true;
      goDark();
    },
  );

  function dispose() {
    disposed = true;
    window.clearTimeout(timer);
    window.clearTimeout(panTimer);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    scene.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose());
    });
    Object.values(textures).forEach((texture) => texture.dispose());
    target.dispose();
    post.dispose();
    renderer.dispose();
    if (!contextLost) renderer.forceContextLoss();
  }

  return { resize, beat, dispose, drawCalls: () => sceneCalls };
}
