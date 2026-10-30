/* audio.js — Web Audio synthesis. No external assets. Browser-only; no-op in Node.
   Music OFF by default (M toggles), announcer voice ON by default (V toggles). */

const AU = (() => {
  const has = (typeof window !== 'undefined') && !!(window.AudioContext || window.webkitAudioContext);
  let AC = null, master = null, musicGain = null;
  let musicOn = false, voiceOn = (has);
  let musicTimer = null, nextNote = 0, stepIdx = 0;

  function ensure() {
    if (!has) return false;
    if (!AC) {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain();
      master.gain.value = 0.5;
      master.connect(AC.destination);
      musicGain = AC.createGain();
      musicGain.gain.value = 0.32;
      musicGain.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return true;
  }

  function tone(type, f0, f1, dur, peak, delay) {
    if (!ensure()) return;
    delay = delay || 0;
    const t0 = AC.currentTime + delay;
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, fType, f0, f1, peak, delay) {
    if (!ensure()) return;
    delay = delay || 0;
    const t0 = AC.currentTime + delay;
    const len = Math.max(1, (AC.sampleRate * dur) | 0);
    const buf = AC.createBuffer(1, len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = AC.createBufferSource();
    src.buffer = buf;
    const f = AC.createBiquadFilter();
    f.type = fType;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // ---- SFX ---------------------------------------------------------------
  const sfx = {
    tick:    () => tone('square', 1500, 900, 0.03, 0.035),
    card:    () => { noise(0.12, 'bandpass', 700, 1800, 0.10); tone('triangle', 300, 520, 0.09, 0.07); },
    arm:     () => tone('triangle', 660, 880, 0.09, 0.13),
    whoosh:  () => noise(0.30, 'bandpass', 400, 1600, 0.22),
    swat:    () => { tone('sine', 170, 55, 0.10, 0.5); noise(0.05, 'highpass', 2200, 2200, 0.18); },
    thud:    () => tone('sine', 120, 45, 0.14, 0.32),
    swish:   () => noise(0.25, 'highpass', 1600, 600, 0.20),
    rim:     () => { tone('square', 950, 700, 0.12, 0.22); tone('square', 1400, 900, 0.07, 0.10, 0.02); },
    dunk:    () => { tone('sine', 95, 38, 0.35, 0.65); noise(0.22, 'lowpass', 500, 90, 0.5); },
    ant:     () => tone('sawtooth', 220, 780, 0.30, 0.08),
    buzzer:  () => tone('square', 175, 175, 0.8, 0.35),
    fire:    () => { noise(0.55, 'bandpass', 300, 2400, 0.26); tone('sawtooth', 120, 320, 0.4, 0.06); },
    cheer:   () => { noise(1.1, 'bandpass', 850, 1500, 0.24); noise(0.9, 'bandpass', 1400, 900, 0.14, 0.15); },
    chime:   () => { tone('triangle', 660, 660, 0.16, 0.20); tone('triangle', 990, 990, 0.22, 0.20, 0.13); },
    fail:    () => tone('square', 420, 180, 0.30, 0.16),
    coin:    () => { tone('square', 988, 988, 0.06, 0.16); tone('square', 1319, 1319, 0.24, 0.16, 0.06); },
    champ:   () => { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.22, 0.2, i * 0.12)); },
    wrong() {
      // Game-show wrong answer buzzer: descending square wave
      tone('square', 380, 200, 0.35, 0.25);
      tone('square', 280, 150, 0.25, 0.25, 0.1);
    },
    murmur() {
      noise(1.5, 'bandpass', 400, 800, 0.04);
    },
    cheerShort() {
      noise(0.4, 'bandpass', 800, 2000, 0.15);
      noise(0.3, 'bandpass', 1200, 2400, 0.1, 0.1);
    },
  };

  // ---- music: laid-back 96 BPM loop (under the 110 cap) -------------------
  const BPM = 96, SPB = 60 / BPM; // 0.625s per beat
  const kick  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,1];
  const snare = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
  const hat   = [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1];
  const bass  = [55,0,0,55, 0,65.4,0,55, 49,0,49,0, 65.4,0,49,0]; // A1 C2 G1 A1
  const chords = { 0: [220, 261.6, 329.6], 8: [174.6, 220, 261.6] }; // Am / F

  function scheduleStep(s, t) {
    const e = (dur, peak) => {
      const g = AC.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g.connect(musicGain);
      return g;
    };
    if (kick[s]) {
      const o = AC.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      o.connect(e(0.16, 0.5)); o.start(t); o.stop(t + 0.2);
    }
    if (snare[s]) {
      const len = (AC.sampleRate * 0.14) | 0;
      const buf = AC.createBuffer(1, len, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = AC.createBufferSource(); src.buffer = buf;
      const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
      src.connect(f); f.connect(e(0.14, 0.28)); src.start(t);
    }
    if (hat[s]) {
      const len = (AC.sampleRate * 0.03) | 0;
      const buf = AC.createBuffer(1, len, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = AC.createBufferSource(); src.buffer = buf;
      const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
      src.connect(f); f.connect(e(0.03, 0.08)); src.start(t);
    }
    const b = bass[s];
    if (b) {
      const o = AC.createOscillator(); o.type = 'triangle';
      o.frequency.value = b;
      o.connect(e(SPB * 0.45, 0.30)); o.start(t); o.stop(t + SPB * 0.5);
    }
    if (chords[s]) {
      for (const f of chords[s]) {
        const o = AC.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = f;
        const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
        o.connect(lp); lp.connect(e(SPB * 0.9, 0.05)); o.start(t); o.stop(t + SPB);
      }
    }
  }

  function musicTick() {
    while (nextNote < AC.currentTime + 0.12) {
      scheduleStep(stepIdx % 16, nextNote);
      stepIdx++;
      nextNote += SPB / 2; // 8th notes
    }
  }

  function setMusic(on) {
    if (!ensure()) return;
    if (on && !musicOn) {
      musicOn = true;
      nextNote = AC.currentTime + 0.05;
      stepIdx = 0;
      musicTimer = setInterval(musicTick, 30);
    } else if (!on && musicOn) {
      musicOn = false;
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  // ---- announcer voice (optional, V) ---------------------------------------
  let voicePicked = null;
  function pickVoice() {
    if (voicePicked) return voicePicked;
    try {
      const vs = window.speechSynthesis.getVoices() || [];
      voicePicked = vs.find(v => /male|david|alex|fred|george|gordon/i.test(v.name)) ||
                    vs.find(v => v.lang === 'en-US') || vs[0] || null;
    } catch (e) { voicePicked = null; }
    return voicePicked;
  }

  function say(text) {
    if (!voiceOn || !has || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05; u.pitch = 0.55; u.volume = 0.9;
      const v = pickVoice();
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* voice is optional */ }
  }

  function toggleMusic() { setMusic(!musicOn); return musicOn; }
  function toggleVoice() { voiceOn = !voiceOn; if (!voiceOn && has) { try { window.speechSynthesis.cancel(); } catch (e) {} } return voiceOn; }

  function cleanup() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
      musicOn = false;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    if (AC && AC.state !== 'closed') {
      try { AC.suspend(); } catch (e) {}
    }
  }

  return {
    ensure, sfx, say, cleanup,
    toggleMusic, toggleVoice,
    get musicOn() { return musicOn; },
    get voiceOn() { return voiceOn; },
    available: has,
  };
})();

export { AU };
