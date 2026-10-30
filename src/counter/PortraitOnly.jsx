import { useEffect, useState } from "react";
import { RxCursor } from "./FileFurniture.jsx";

// A phone turned sideways (Kevin, 2026-09-16: "if they turn their phone sideways, it
// needs to tell them it only works in portrait mode"). iOS Safari lets a web page lock
// nothing, so the game says so instead. Landscape, a coarse pointer and no more than
// 500px tall is a phone on its side. A tablet on its side or a desktop window is
// taller, or has a fine pointer, and never sees this. The game stays mounted
// underneath, only inert, so turning back picks up exactly where the player was.
export const PHONE_SIDEWAYS = "(orientation: landscape) and (max-height: 500px) and (pointer: coarse)";

export function usePhoneSideways() {
  const [sideways, setSideways] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(PHONE_SIDEWAYS).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(PHONE_SIDEWAYS);
    const update = () => setSideways(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return sideways;
}

// One screen, clear of the island and the home bar, asking the player to turn back.
export function PortraitOnly() {
  return <div className="ci-portrait-only" role="alert">
    <RxCursor className="ci-portrait-mark" />
    <p className="ci-portrait-title">Turn your phone upright</p>
    <p className="ci-portrait-note">Counter Intelligence plays in portrait. Your file is right where you left it.</p>
  </div>;
}
