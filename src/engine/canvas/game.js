import { T, BAL, TECHNIQUES, CHARS, COPY, SHOTS, SHOT_IDS } from './data.js';
import { L, TL, TLmark, setCharIndex, mulberry32 } from './logic.js';
import { AU, R, FONT, setArt } from './assets.js';
import { drawFrame } from './render.js';
import { G, ST } from './state.js';
/* game.js — state machine + pacing constitution + frame-timeline instrumentation. */





function pickLine(arr) { return arr[(Math.random() * arr.length) | 0]; }
function nextPending() {
  for (let i = 0; i < 4; i++) if (!G.cleared[i]) return i;
  return -1;
}

function newGameState() {
  G.mode = 'title'; G.st = ST.INTRO; G.stT = 0; G.time = 0; G.paused = false;
  G.round = 0; G.cleared = [false, false, false, false]; G.continues = 0;
  G.enc = null; G.obj = null; G.typing = null; G.arm = null;
  G.cutin = null; G.cutaway = null; G.result = null;
  G.flash = null; G.shakeT = 0;
  G.encStats = { ex: 0, clean: 0, maxHeat: 0, air: 0, shots: 0 };
  G.runStats = { exchanges: 0, clean: 0, air: 0 };
  G.allStats = [];
  G.debriefData = null;
  G.debriefTarget = null;
  G.chosenResponse = null;
  TL.length = 0;
  TLmark('boot');
}
newGameState();

// ============================================================================
// FLOW
// ============================================================================
function startEncounter(i) {
  setCharIndex(i);
  G.round = i;
  G.enc = L.newEnc(i);
  G.encRng = mulberry32(((G.baseSeed * 31 + i * 1013 + 7) ^ 0x9e37) >>> 0);
  G.mode = 'battle';
  G.st = ST.INTRO; G.stT = 0;
  G.obj = null; G.arm = null; G.result = null; G.cutin = null; G.cutaway = null;
  G.flash = null; G.shakeT = 0; G.menuKind = 'counter';
  G.chosenResponse = null;
  G.encStats = { ex: 0, clean: 0, maxHeat: 0, air: 0, shots: 0 };
  TLmark('enc_start', i);
  AU.sfx.card();
}

function beginObjection() {
  const enc = G.enc;
  enc.clock = Math.max(0, enc.clock - BAL.EXCHANGE_COST);
  TLmark('clock_tick', enc.clock);
  G.obj = L.pickObjection(enc, G.encRng);
  G.chosenResponse = null;
  G.encStats.ex++;
  G.runStats.exchanges++;
  G.st = ST.OBJCARD; G.stT = 0;
  AU.sfx.card();
}

function openResult(r) {
  G.result = { title: r.title, line: r.line, next: r.next, auto: 0 };
  G.st = ST.RESULT; G.stT = 0;
  TLmark('result_in');
}

function closeResult(how) {
  TLmark(how === 'auto' ? 'result_auto' : 'result_out');
  const r = G.result;
  G.result = null;
  G.stT = 0;
  const enc = G.enc;
  if (r.next === 'win' && enc.goals >= enc.need) { endWin(); return; }
  if (enc.doubt >= BAL.DOUBT_MAX) { endLose(); return; }
  beginObjection();
}

function fireMove() {
  TLmark('move_fire');
  const a = G.arm;
  let res;
  if (a.kind === 'response') {
    res = L.applyResponse(G.enc, a.responseObj, G.obj, CHARS[G.round]);
  } else {
    res = L.applyPitch(G.enc, a.id, G.encRng);
  }
  if (a.kind === 'response') {
    if (res.result === 'good') {
      G.encStats.clean++; G.runStats.clean++;
      G.encStats.maxHeat = Math.max(G.encStats.maxHeat, G.enc.heat || 0);
    }
    if (!res.shot) res.shot = { id: 'LAYUP' };
  } else {
    G.encStats.shots++;
    if (!res.made) { G.encStats.air++; G.runStats.air++; }
  }
  res.moveId = a.kind === 'response' ? null : a.id;
  const cutinName = a.kind === 'response'
    ? (a.responseObj && a.responseObj.text && a.responseObj.text.length > 36
        ? a.responseObj.text.slice(0, 33) + '...'
        : (a.responseObj ? a.responseObj.text : 'RESPONSE'))
    : 'PITCH - ' + SHOTS[a.id].name;
  G.cutin = {
    res: res,
    name: cutinName,
  };
  G.arm = null;
  G.st = ST.CUTIN; G.stT = 0;
  AU.sfx.whoosh();
}

function afterCutin() {
  const r = G.cutin.res;
  if (r.kind === 'response') {
    G.evalResult = r.result;
    G.st = ST.EVALUATE; G.stT = 0;
    TLmark('evaluate_in');
  } else {
    G.cutaway = { kind: (r.made ? r.shot.id : 'airball').toLowerCase(), t: 0, dur: T.CUTAWAY_S, res: r };
    G.st = ST.CUTAWAY; G.stT = 0;
    TLmark('cutaway_in');
    if (r.made && r.shot.id === 'DUNK') AU.sfx.ant();
    if (!r.made) AU.sfx.fail();
  }
}

function afterEvaluate() {
  const r = G.cutin.res;
  if (r.result === 'good') {
    G.cutaway = { kind: 'swat', t: 0, dur: T.CUTAWAY, res: r };
    G.st = ST.CUTAWAY; G.stT = 0;
    TLmark('cutaway_in');
    AU.sfx.swat();
  } else if (r.result === 'bad') {
    G.cutaway = { kind: 'halfparry', t: 0, dur: T.CUTAWAY, res: r };
    G.st = ST.CUTAWAY; G.stT = 0;
    TLmark('cutaway_in');
    AU.sfx.thud();
  } else {
    // adequate: no cutaway, just result
    const cP = CHARS[G.round];
    const line = (cP && cP.adequateLines) ? pickLine(cP.adequateLines)
      : ((COPY && COPY.adequateLines) ? pickLine(COPY.adequateLines) : 'THE PATIENT CONSIDERS YOUR WORDS, BUT REMAINS UNSURE.');
    openResult({ title: 'ADEQUATE', line: line, tech: r.technique, next: 'next' });
  }
}

function afterCutaway() {
  const cw = G.cutaway;
  G.cutaway = null;
  const cP = CHARS[G.round];
  if (cw.kind === 'swat') {
    if (cw.res.ignited) {
      G.st = ST.FIRE; G.stT = 0;
      G.fireLine = pickLine(COPY.heatLines);
      G.flash = { word: "HE'S ON FIRE!", t: 0, dur: T.FIRE };
      TLmark('fire_in');
      AU.sfx.fire(); AU.sfx.cheer();
      AU.say("HE'S ON FIRE!");
    } else {
      openResult({ title: 'CLEAN COUNTER', line: pickLine(cP.cleanLines), tech: cw.res.technique, next: 'next' });
    }
  } else if (cw.kind === 'halfparry') {
    openResult({ title: 'HALF-PARRY', line: pickLine(COPY.mismatchLines), tech: cw.res.technique, next: 'next' });
  } else if (cw.res.made) {
    const K = cw.kind.toUpperCase();
    if (K === 'DUNK' || K === 'THREE') {
      AU.sfx.cheer();
      AU.say('BOOMSHAKALAKA!');
    }
    openResult({ title: K + ' GOOD', line: COPY.shotLines[K], next: 'win' });
  } else {
    openResult({ title: 'AIRBALL', line: COPY.airballLine, next: 'next' });
  }
}

function endWin() {
  if (G.enc) {
    const s = G.enc.stats ? { ...G.enc.stats } : { good: 0, adequate: 0, bad: 0, shots: 0, made: 0, exchanges: 0 };
    s.stats = s;
    G.allStats.push(s);
  }
  G.cleared[G.round] = true;
  G.st = ST.ENDWIN; G.stT = 0;
  TLmark('enc_win');
  AU.sfx.chime(); AU.sfx.cheer();
  AU.say('AND THE MOVE CONNECTS!');
}

function endLose() {
  if (G.enc) {
    const s = G.enc.stats ? { ...G.enc.stats } : { good: 0, adequate: 0, bad: 0, shots: 0, made: 0, exchanges: 0 };
    s.stats = s;
    G.allStats.push(s);
  }
  G.st = ST.ENDLOSE; G.stT = 0;
  TLmark('enc_lose');
  AU.sfx.buzzer();
  AU.say('AND ' + CHARS[G.round].name + ' WALKS AWAY.');
}

function showDebrief(target) {
  G.debriefTarget = target || (nextPending() === -1 ? 'champion' : 'gameover');
  G.debriefData = {
    grades: G.allStats.map(s => L.gradeEncounter(s)),
    totalGood: G.allStats.reduce((a, s) => a + (s.good || 0), 0),
    totalBad: G.allStats.reduce((a, s) => a + (s.bad || 0), 0),
    totalExchanges: G.allStats.reduce((a, s) => a + (s.exchanges || 0), 0),
  };
  G.mode = 'debrief';
  G.st = ST.DEBRIEF;
  G.stT = 0;
  TLmark('debrief_in');
}

function finishDebrief() {
  TLmark('debrief_out');
  const target = G.debriefTarget || (nextPending() === -1 ? 'champion' : 'gameover');
  G.mode = target;
  G.stT = 0;
  if (target === 'champion') {
    TLmark('champion');
    AU.sfx.champ();
    AU.say('WE HAVE A PHARMACY CHAMPION!');
  } else {
    TLmark('gameover');
    AU.sfx.buzzer();
  }
}

// ============================================================================
// UPDATE
// ============================================================================
function battleUpdate(dt) {
  G.stT += dt;

  switch (G.st) {
    case ST.INTRO:
      if (G.stT >= T.INTRO) { TLmark('intro_out'); beginObjection(); }
      break;

    case ST.OBJCARD:
      if (G.stT >= T.OBJCARD) {
        G.typing = { n: 0 };
        G.st = ST.OBJTYPE; G.stT = 0;
        TLmark('typ_start');
      }
      break;

    case ST.OBJTYPE: {
      const len = G.obj.text.length;
      const n = Math.min(len, Math.floor(G.stT * T.CPS));
      if (n > G.typing.n) {
        if (Math.floor(n / 2) > Math.floor(G.typing.n / 2)) AU.sfx.tick();
        G.typing.n = n;
      }
      if (n >= len) {
        G.stT = 0;
        TLmark('typ_done', len);
        if (G.enc.clock <= 0) {
          G.st = ST.FORCEDCARD; G.stT = 0;
          TLmark('forcedcard_in');
          AU.sfx.buzzer();
        } else {
          G.st = ST.YOUCARD; G.stT = 0;
          TLmark('youcard_in');
          AU.sfx.card();
        }
      }
      break;
    }

    case ST.YOUCARD:
      if (G.stT >= T.YOUCARD) {
        G.menuKind = 'counter';
        G.st = ST.CHOICE; G.stT = 0;
        TLmark('choice_in');
      }
      break;

    case ST.FORCEDCARD:
      if (G.stT >= T.FORCEDCARD) {
        G.menuKind = 'shot';
        G.st = ST.CHOICE; G.stT = 0;
        TLmark('choice_in_forced');
      }
      break;

    case ST.CHOICE:
      break; // time stops: player thinks at leisure

    case ST.ARM:
      G.arm.t += dt;
      if (G.arm.t >= T.ARM) fireMove();
      break;

    case ST.CUTIN:
      if (G.stT >= T.CUTIN) { TLmark('cutin_out'); afterCutin(); }
      break;

    case ST.EVALUATE: {
      const evalDur = (typeof T !== 'undefined' && T.EVALUATE) || 0.8;
      if (G.stT >= evalDur) {
        TLmark('evaluate_out');
        afterEvaluate();
      }
      break;
    }

    case ST.CUTAWAY: {
      G.cutaway.t += dt;
      const cw = G.cutaway;
      if (cw.kind === 'dunk' && !cw.slammed && cw.t >= cw.dur * 0.42) {
        cw.slammed = true;
        G.shakeT = 0.5;
        if (!G.flash) G.flash = { word: 'BOOMSHAKALAKA!', t: 0, dur: 1.15 };
        TLmark('dunk_slam');
        AU.sfx.dunk();
      }
      if ((cw.kind === 'layup' || cw.kind === 'three' || cw.kind === 'airball') && !cw.hit && cw.t >= cw.dur * 0.5) {
        cw.hit = true;
        TLmark('rim_hit');
        if (cw.kind === 'airball') AU.sfx.rim();
        else {
          AU.sfx.swish();
          if (cw.kind === 'three') AU.sfx.cheer();
        }
      }
      if (cw.t >= cw.dur) {
        G.stT = 0;
        TLmark('cutaway_out');
        afterCutaway();
      }
      break;
    }

    case ST.FIRE:
      if (G.stT >= T.FIRE) {
        G.stT = 0;
        G.flash = null;
        TLmark('fire_out');
        openResult({ title: 'HEAT MAX', line: G.fireLine, next: 'next' });
      }
      break;

    case ST.RESULT:
      G.result.auto += dt;
      if (G.result.auto >= T.RESULT_AUTO) closeResult('auto');
      break;

    case ST.ENDWIN:
    case ST.ENDLOSE:
      break; // waiting for player
  }

  if (G.flash) {
    G.flash.t += dt;
    if (G.flash.t >= G.flash.dur) G.flash = null;
  }
  if (G.shakeT > 0) G.shakeT -= dt;
}

function debriefUpdate(dt) {
  G.stT += dt;
  if (G.stT >= 8.0) finishDebrief();
}

function update(dt) {
  if (G.paused) return;
  G.time += dt;
  if (G.mode === 'battle') battleUpdate(dt);
  else if (G.mode === 'debrief') debriefUpdate(dt);
}

// ============================================================================
// INPUT
// ============================================================================
function armResponse(responseObj) {
  G.chosenResponse = responseObj;
  G.arm = { kind: 'response', responseObj: responseObj, t: 0 };
  G.st = ST.ARM; G.stT = 0;
  TLmark('arm_start');
  AU.sfx.arm();
}

function armPitch(shotId) {
  G.arm = { kind: 'pitch', id: shotId, t: 0 };
  G.st = ST.ARM; G.stT = 0;
  TLmark('arm_start');
  AU.sfx.arm();
}

function armMove(kind, idOrObj) {
  if (kind === 'response') armResponse(idOrObj);
  else armPitch(idOrObj);
}

function battlePress(key) {
  const st = G.st;
  
  if (st === ST.OBJTYPE) {
    if (key === 'Enter' || key === ' ' || key === 'Space') {
      const len = G.obj.text.length;
      if (G.typing.n < len) {
        G.stT = len / T.CPS;
        G.typing.n = len;
        AU.sfx.tick();
      }
    }
    return;
  }

  if (st === ST.CHOICE) {
    if (G.menuKind === 'shot') {
      if (key === '1' || key === '2' || key === '3') {
        const shotId = SHOT_IDS[+key - 1];
        armPitch(shotId);
      } else if ((key === 'Escape' || key === 'Backspace' || key === '4') && G.enc.clock > 0) {
        G.menuKind = 'counter'; G.stT = 0;
        TLmark('menu_counter');
        AU.sfx.card();
      }
    } else {
      if (key === '1' || key === '2' || key === '3') {
        const i = +key - 1;
        if (G.obj && G.obj.responses && G.obj.responses[i]) {
          armResponse(G.obj.responses[i]);
        }
      } else if (key === '4') {
        G.menuKind = 'shot'; G.stT = 0;
        TLmark('menu_shot');
        AU.sfx.card();
      }
    }
    return;
  }
  if (st === ST.ARM) {
    const a = G.arm;
    if (key === 'Enter' || key === ' ' || key === 'Space') {
      fireMove();
      return;
    }
    if (key === 'Escape' || key === 'Backspace') {
      G.arm = null;
      G.st = ST.CHOICE; G.stT = 0;
      TLmark('arm_cancel');
      AU.sfx.tick();
      return;
    }
    const i = +key - 1;
    if (key === '1' || key === '2' || key === '3') {
      if (a.kind === 'response') {
        if (G.obj && G.obj.responses && G.obj.responses[i]) {
          if (G.obj.responses[i] !== a.responseObj) {
            TLmark('rearm', i);
            armResponse(G.obj.responses[i]);
          } else {
            fireMove();
          }
        }
      } else {
        if (i >= 0 && i < SHOT_IDS.length) {
          if (SHOT_IDS[i] !== a.id) {
            TLmark('rearm', SHOT_IDS[i]);
            armPitch(SHOT_IDS[i]);
          } else {
            fireMove();
          }
        }
      }
    } else if (key === '4') {
      if (a.kind === 'response') {
        G.menuKind = 'shot'; G.st = ST.CHOICE; G.stT = 0; G.arm = null;
        TLmark('menu_shot');
        AU.sfx.card();
      } else {
        // If already in shot mode, pressing 4 again could cancel back to responses
        G.menuKind = 'counter'; G.st = ST.CHOICE; G.stT = 0; G.arm = null;
        TLmark('menu_counter');
        AU.sfx.card();
      }
    }
    return;
  }
  if (st === ST.EVALUATE) {
    if (key === 'Enter') {
      const evalDur = (typeof T !== 'undefined' && T.EVALUATE) || 0.8;
      G.stT = evalDur;
      TLmark('evaluate_skip');
    }
    return;
  }
  if (st === ST.CUTAWAY) {
    if (key === 'Enter') {
      G.cutaway.t = G.cutaway.dur;
      TLmark('cutaway_skip');
    }
    return;
  }
  if (st === ST.RESULT) {
    closeResult('key');
    return;
  }
  if (st === ST.ENDWIN) {
    if (G.stT >= T.END_LOCK && (key === 'Enter' || key === '1')) {
      if (G.round === 3) {
        showDebrief('champion');
      } else {
        G.mode = 'ladder'; G.st = ST.INTRO; G.stT = 0;
        TLmark('to_ladder');
        AU.sfx.coin();
      }
    }
    return;
  }
  if (st === ST.ENDLOSE) {
    if (G.stT < T.END_LOCK) return;
    if (key === '1') {
      G.continues++;
      TLmark('continue');
      AU.sfx.coin();
      startEncounter(G.round);
    } else if (key === '2') {
      showDebrief('gameover');
    }
  }
}

function press(key) {
  if (G.paused) return;
  if (G.mode === 'title') {
    if (key === 'Enter' || key === '1' || key === '2') {
      G.mode = 'ladder'; G.st = ST.INTRO; G.stT = 0;
      TLmark('to_ladder');
      AU.sfx.coin();
    }
    return;
  }
  if (G.mode === 'ladder') {
    if (key === 'Enter') {
      const i = nextPending();
      if (i >= 0) startEncounter(i);
      else { showDebrief('champion'); }
    }
    return;
  }
  if (G.mode === 'debrief') {
    if (key === 'Enter' || key === '1' || key === ' ' || key === 'Space') {
      finishDebrief();
    }
    return;
  }
  if (G.mode === 'champion') {
    if (key === '1' || key === 'Enter') { newGameState(); TLmark('to_title'); }
    return;
  }
  if (G.mode === 'gameover') {
    if (key === 'Enter' || key === '1') { newGameState(); TLmark('to_title'); }
    return;
  }
  battlePress(key);
}

// click targets: {x,y,w,h,key} — canvas click = key press
function clickables() {
  const all = { x: 0, y: 0, w: 480, h: 270 };
  const rowShot = (i, key) => ({ x: 126, y: 202 + i * 12, w: 350, h: 11, key: key });
  const rowCounter = (i, key) => ({ x: 126, y: 196 + i * 18, w: 350, h: 18, key: key });
  const row = (i, key) => (G.menuKind === 'counter' ? rowCounter(i, key) : rowShot(i, key));
  if (G.mode === 'title') return [{ ...all, key: 'Enter' }];
  if (G.mode === 'ladder') return [{ ...all, key: 'Enter' }];
  if (G.mode === 'debrief') return [{ ...all, key: 'Enter' }];
  if (G.mode === 'champion') return [{ ...all, key: '1' }];
  if (G.mode === 'gameover') return [{ ...all, key: 'Enter' }];

  if (G.mode !== 'battle') return [];
  const st = G.st;
  if (st === ST.CHOICE) {
    if (G.menuKind === 'shot') {
      const r = [row(0, '1'), row(1, '2'), row(2, '3')];
      if (G.enc.clock > 0) r.push(row(3, '4'));
      return r;
    }
    return [row(0, '1'), row(1, '2'), row(2, '3'), row(3, '4')];
  }
  if (st === ST.ARM) {
    const r = [{ ...all, key: 'Enter' }, row(0, '1'), row(1, '2'), row(2, '3')];
    if (G.enc.clock > 0) r.push(row(3, '4'));
    return r;
  }
  if (st === ST.EVALUATE) return [{ ...all, key: 'Enter' }];
  if (st === ST.CUTAWAY) return [{ x: 0, y: 0, w: 480, h: 186, key: 'Enter' }];
  if (st === ST.RESULT) return [{ ...all, key: 'Enter' }];
  if (st === ST.ENDWIN && G.stT >= T.END_LOCK) return [{ ...all, key: 'Enter' }];
  if (st === ST.ENDLOSE && G.stT >= T.END_LOCK)
    return [rowShot(2, '1'), rowShot(3, '2')];
  return [];
}

function click(x, y) {
  if (G.paused) return;
  const list = clickables();
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) { press(c.key); return; }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================
const SC = {
  step: update,
  draw: () => drawFrame(G),
  press: press,
  click: (x,y) => { AU.ensure(); click(x,y); },
  clickables: clickables,
  key(k) { AU.ensure();
    if (k === 'p' || k === 'P') {
      G.paused = !G.paused;
      TLmark(G.paused ? 'pause_on' : 'pause_off');
      return 'pause';
    }
    if (k === 'Escape' && G.paused) {
      G.paused = false;
      TLmark('pause_off');
      return 'pause';
    }
    if (G.paused) return 'paused';
    if (k === 'm' || k === 'M') return 'music:' + AU.toggleMusic();
    if (k === 'v' || k === 'V') return 'voice:' + AU.toggleVoice();
    press(k);
    return 'ok';
  },
  setSeed(n) { G.baseSeed = (n >>> 0) || 1; },
  state: () => G,
  timeline: () => TL,
  setArt: setArt,
  newGame: newGameState,
  snapshot: () => R.buf,
  pitchOdds: (id) => (G.enc ? L.pitchOdds(G.enc, id, () => 0) : 0),
  lintOn() { R.lint.on = true; R.lint.records.length = 0; },
  lintOff() { R.lint.on = false; },
  lintRecords() { return R.lint.records; },
};

let loopId = null;

export function initCanvasGame(canvas, audioCtx) {
  if (canvas) {
    R.initBrowser(canvas);
    const cancelLoop = startGame();
    return () => {
      cancelLoop();
      AU.cleanup();
    };
  }
}

export function startGame() {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    SC.step(dt);
    SC.draw();
    loopId = requestAnimationFrame(frame);
  }
  loopId = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(loopId);
}

export { SC, G };
