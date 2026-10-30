import { G, ST } from './state.js';
import { BAL, CHARS, T } from './data.js';
/* logic.js — pure, deterministic turn logic. No rendering/audio/time here.
   The fuzz harness and the balance bot drive these functions directly. */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickRng(arr, rng) { return arr[Math.floor(rng() * arr.length) % arr.length]; }

const L = {
  newEnc(i) {
    const charIdx = (i !== undefined) ? i : (typeof CHAR_INDEX !== 'undefined' ? CHAR_INDEX : 0);
    const c = CHARS[charIdx];
    return {
      id: c ? c.id : undefined,
      charIdx: charIdx,
      trust: c.startTrust,
      doubt: 0,
      goals: 0,
      need: c.goals,
      clock: BAL.PITCH_CLOCK,
      heat: 0,
      fire: false,
      forcedUsed: false,
      lastType: null,
      lastTypeCount: 0,
      usedLines: {},
      usedObjs: {},
      stats: { good: 0, adequate: 0, bad: 0, shots: 0, made: 0, exchanges: 0 },
    };
  },

  // Draw the patient's next objection from unused pool.
  pickObjection(enc, rng) {
    const charIdx = enc.charIdx !== undefined ? enc.charIdx : (typeof CHAR_INDEX !== 'undefined' ? CHAR_INDEX : 0);
    const c = CHARS[charIdx];
    if (!enc.usedObjs) enc.usedObjs = {};
    const pool = c.objections.filter((_, i) => !enc.usedObjs[i]);
    if (pool.length === 0) {
      // Reset pool
      enc.usedObjs = {};
      return this.pickObjection(enc, rng);
    }
    const idx = Math.floor(rng() * pool.length);
    const origIdx = c.objections.indexOf(pool[idx]);
    enc.usedObjs[origIdx] = true;
    return pool[idx];
  },

  applyResponse(enc, responseObj, obj, charData) {
    const q = responseObj.q; // 'good', 'adequate', or 'bad'
    let res;
    
    // Track stats
    if (!enc.stats) enc.stats = { good: 0, adequate: 0, bad: 0, shots: 0, made: 0, exchanges: 0 };
    enc.stats.exchanges++;
    enc.stats[q]++;
    
    if (!charData && typeof CHARS !== 'undefined') {
      charData = CHARS[enc.charIdx !== undefined ? enc.charIdx : (typeof CHAR_INDEX !== 'undefined' ? CHAR_INDEX : 0)];
    }
    charData = charData || {};

    if (q === 'good') {
      // Best response: full trust gain, build heat, no doubt
      const tg = BAL.CLEAN_TRUST + (charData.cleanBonus || 0);
      enc.trust = Math.min(BAL.TRUST_MAX, enc.trust + tg);
      enc.heat = Math.min(BAL.HEAT_MAX, enc.heat + 1);
      const wasLit = enc.fire;
      if (!enc.fire && enc.heat >= BAL.HEAT_MAX) { enc.fire = true; }
      res = { kind: 'response', result: 'good', trustGain: tg, doubtGain: 0, 
              ignited: !wasLit && enc.fire, heat: enc.heat, technique: responseObj.tech };
    } else if (q === 'adequate') {
      // OK response: small trust gain, no heat change, no doubt
      const tg = 4; // ADEQUATE_TRUST constant
      enc.trust = Math.min(BAL.TRUST_MAX, enc.trust + tg);
      res = { kind: 'response', result: 'adequate', trustGain: tg, doubtGain: 0,
              ignited: false, heat: enc.heat, technique: responseObj.tech };
    } else { // bad
      // Bad response: no trust, reset heat, add doubt
      enc.heat = 0;
      enc.fire = false;
      const dg = charData.sticky ? obj.doubt + 1 : obj.doubt;
      enc.doubt += dg;
      res = { kind: 'response', result: 'bad', trustGain: 0, doubtGain: dg,
              ignited: false, heat: 0, technique: null };
    }
    return res;
  },

  pitchOdds(enc, shotId, rng) {
    let o = BAL.SHOT_BASE[shotId] + enc.trust * BAL.SHOT_PER[shotId];
    if (enc.fire) o += BAL.FIRE_BONUS;
    if (enc.clock <= 0 && !enc.forcedUsed) o += BAL.FORCED_BONUS * 100;
    return Math.max(0.05, Math.min(1, o / 100));
  },

  applyPitch(enc, shotId, rng) {
    const odds = L.pitchOdds(enc, shotId, rng);
    const roll = rng();
    const made = roll < odds;
    if (!enc.stats) enc.stats = { good: 0, adequate: 0, bad: 0, shots: 0, made: 0, exchanges: 0 };
    enc.stats.shots++;
    if (made) enc.stats.made++;
    if (!enc.forcedUsed && enc.clock <= 0) enc.forcedUsed = true;
    let res = { kind: 'pitch', made: made, odds: odds, roll: roll, shot: { id: shotId } };
    if (made) {
      enc.goals += BAL.SHOT_GOALS[shotId];
      if (enc.fire) { enc.fire = false; enc.heat = 0; } // the fire is spent on the finisher
    } else {
      enc.doubt += BAL.SHOT_FAIL_DOUBT[shotId];
      enc.heat = 0;
      if (enc.fire) { enc.fire = false; } // fizzes out on the airball
    }
    return res;
  },

  gradeEncounter(enc) {
    const s = enc.stats || { good: 0, adequate: 0, bad: 0, shots: 0, made: 0, exchanges: 0 };
    const total = s.good + s.adequate + s.bad;
    if (total === 0) return { listen: 'F', address: 'F', recommend: 'F' };
    
    const empathyPct = s.good / total;
    const badPct = s.bad / total;
    
    // Listening & Acknowledging: based on good response rate
    const listen = empathyPct >= 0.7 ? 'A' : empathyPct >= 0.5 ? 'B' : empathyPct >= 0.3 ? 'C' : 'F';
    
    // Addressing Concerns: inverse of bad response rate  
    const address = badPct <= 0.1 ? 'A' : badPct <= 0.25 ? 'B' : badPct <= 0.4 ? 'C' : 'F';
    
    // Making the Recommendation: did they take shots at good trust levels?
    const shotQuality = s.shots > 0 && s.made > 0 ? (s.made / s.shots) : 0;
    const recommend = shotQuality >= 0.7 ? 'A' : shotQuality >= 0.5 ? 'B' : shotQuality >= 0.3 ? 'C' : 'F';
    
    return { listen, address, recommend, empathyPct, badPct, shotQuality };
  },
};

// CHAR_INDEX is set by game.js before calling L.* (keeps L pure & compact).
let CHAR_INDEX = 0;
function setCharIndex(i) { CHAR_INDEX = i; }

const TL = []; // frame timeline: {name, t, extra}
function TLmark(name, extra) { TL.push({ name: name, t: G.time, extra: extra }); }

export { L, TL, TLmark, setCharIndex, mulberry32 };

