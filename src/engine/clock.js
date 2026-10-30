import { useEffect, useRef, useState } from "react";

// The shot clock. Driven by animation-frame timestamps, so a backgrounded tab or
// a sleeping projector does not burn the window: while document.hidden the
// elapsed time is not charged, and the first visible frame re-bases the clock.
export function useShotClock({ durationMs, running, onExpire, key }) {
  const [remaining, setRemaining] = useState(durationMs);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    setRemaining(durationMs);
    if (!running) return undefined;
    let raf = 0;
    let last = performance.now();
    let left = durationMs;
    let done = false;
    const onVisible = () => { last = performance.now(); };
    const tick = (now) => {
      if (done) return;
      if (!document.hidden) left -= now - last;
      last = now;
      if (left <= 0) {
        done = true;
        setRemaining(0);
        expireRef.current?.();
        return;
      }
      setRemaining(left);
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisible);
    raf = requestAnimationFrame(tick);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [durationMs, running, key]);

  return remaining;
}

// A plain delay that survives hidden tabs the same way. Used for barks,
// results and interstitials.
export function useDelay(ms, active, onDone, key) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (!active) return undefined;
    const id = setTimeout(() => doneRef.current?.(), ms);
    return () => clearTimeout(id);
  }, [ms, active, key]);
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}
