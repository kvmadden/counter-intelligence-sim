import { useEffect, useRef, useState } from "react";
import sceneArt from "./assets/counter-scene.png";
import jordanFace from "./assets/patient-face-64.png";
import jordanHair from "./assets/patient-hair-32.png";
import marcusFace from "./assets/patients/marcus-face-64.png";
import marcusHair from "./assets/patients/marcus-hair-32.png";
import priyaFace from "./assets/patients/priya-face-64.png";
import priyaHair from "./assets/patients/priya-hair-32.png";
import samFace from "./assets/patients/sam-face-64.png";
import samHair from "./assets/patients/sam-hair-32.png";
import waltFace from "./assets/patients/walt-face-64.png";
import waltHair from "./assets/patients/walt-hair-32.png";
import { createStage } from "./n64/stage.js";

// Each patient's face and hair textures, cut from their photo by
// scripts/make-face-texture.mjs. The look itself (build, clothes, hair) is in
// n64/patient.js. A patient without their own falls back to Jordan's.
const FACES = {
  jordan: { faceUrl: jordanFace, hairUrl: jordanHair },
  sam: { faceUrl: samFace, hairUrl: samHair },
  marcus: { faceUrl: marcusFace, hairUrl: marcusHair },
  priya: { faceUrl: priyaFace, hairUrl: priyaHair },
  walt: { faceUrl: waltFace, hairUrl: waltHair },
};

// A looks preview, for proof renders of a patient whose file is not on SELECT FILE
// yet: only a build run as `vite build --mode looks` reads ?look=<id> and dresses the
// encounter as that patient. Vite writes the mode in as a constant at build time and
// no .env file can set it, so every other build compares "production" with "looks",
// and the minifier drops the URL read from the bundle.
function lookOf(patientId) {
  if (import.meta.env.MODE === "looks") return new URLSearchParams(window.location.search).get("look") ?? patientId;
  return patientId;
}

// The encounter's game screen: plain three.js (no react-three-fiber, which needs
// React 19; this game is on 18.3) rendered at an N64-sized internal resolution.
// It renders on demand and never on a loop: once when ready, on resize, and a
// seven-frame head turn per exchange, skipped under prefers-reduced-motion.
// Without WebGL it falls back to the illustration and the encounter still plays.
// The scene is built once per mount for one patient, so the encounter keys it by
// patient id: a different patient mounts a fresh scene, and the first beat reaches it.
export default function N64Scene({ patientId, beat, label }) {
  const hostRef = useRef(null);
  const glRef = useRef(null);
  const stageRef = useRef(null);
  const [status, setStatus] = useState({ mode: "starting", drawCalls: undefined });
  const [camera, setCamera] = useState("panning");

  useEffect(() => {
    let active = true;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // The canvas belongs to this effect, not to React: a canvas whose context was
    // lost or released must never be handed to a new renderer.
    const canvas = document.createElement("canvas");
    canvas.className = "enc-scene-canvas";
    canvas.setAttribute("aria-hidden", "true");
    glRef.current.appendChild(canvas);
    const lookId = lookOf(patientId);
    let stage;
    try {
      stage = createStage(canvas, {
        patientId: lookId,
        ...(Object.hasOwn(FACES, lookId ?? "") ? FACES[lookId] : FACES.jordan),
        reducedMotion,
        onReady: ({ drawCalls }) => active && setStatus({ mode: "webgl", drawCalls }),
        onLost: () => active && setStatus({ mode: "fallback", drawCalls: undefined }),
        onCamera: (state) => active && setCamera(state),
      });
    } catch {
      canvas.remove();
      setStatus({ mode: "fallback", drawCalls: undefined });
      return undefined;
    }
    stageRef.current = stage;
    const observer = new ResizeObserver(([entry]) => stage.resize(entry.contentRect.width, entry.contentRect.height));
    observer.observe(hostRef.current);
    return () => {
      active = false;
      observer.disconnect();
      stage.dispose();
      stageRef.current = null;
      canvas.remove();
    };
    // Once per mount: a different patient is a different key, so a fresh mount.
  }, []);

  useEffect(() => {
    stageRef.current?.beat(beat);
  }, [beat]);

  return <div ref={hostRef} className="enc-scene" role="img" aria-label={label} data-scene={status.mode} data-draw-calls={status.drawCalls} data-camera={camera}>
    <div ref={glRef} className="enc-scene-gl" />
    {status.mode === "fallback" && <img className="enc-scene-fallback" src={sceneArt} alt="" />}
  </div>;
}
