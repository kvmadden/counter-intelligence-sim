// Cartoon stings, synthesized. No audio assets, nothing fetched. Silent until
// the player turns sound on; the context unlocks on that gesture.
let ctx = null;
let enabled = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

export function setSoundEnabled(on) {
  enabled = !!on;
  if (enabled) {
    const c = ensure();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  }
}

export function isSoundEnabled() {
  return enabled;
}

function tone({ type = "sine", from, to = from, at = 0, dur = 0.12, gain = 0.08, curve = "exp" }) {
  const c = ensure();
  if (!c || !enabled) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) {
    if (curve === "lin") osc.frequency.linearRampToValueAtTime(to, t0 + dur);
    else osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sting = {
  // referee whistle
  bark: () => { tone({ type: "square", from: 1900, to: 2300, dur: 0.14, gain: 0.05 }); tone({ type: "square", from: 2300, to: 1900, at: 0.14, dur: 0.1, gain: 0.04 }); },
  // boing
  ok: () => { tone({ from: 220, to: 660, dur: 0.16, gain: 0.09 }); tone({ type: "triangle", from: 660, to: 520, at: 0.16, dur: 0.12, gain: 0.05 }); },
  // slide whistle down
  fail: () => tone({ from: 900, to: 220, dur: 0.38, gain: 0.08, curve: "lin" }),
  // rising trill
  faster: () => { for (let i = 0; i < 5; i += 1) tone({ type: "triangle", from: 500 + i * 140, at: i * 0.06, dur: 0.06, gain: 0.06 }); },
  tick: () => tone({ type: "square", from: 1400, dur: 0.03, gain: 0.03 }),
  // drum roll
  rush: () => { for (let i = 0; i < 8; i += 1) tone({ type: "square", from: 160 + (i % 2) * 40, at: i * 0.05, dur: 0.04, gain: 0.06 }); },
  // buzzer
  over: () => { tone({ type: "square", from: 120, dur: 0.55, gain: 0.07 }); tone({ type: "sawtooth", from: 121, dur: 0.55, gain: 0.03 }); },
};
