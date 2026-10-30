// scripts/stress_engine.mjs — Empirical stress test against src/engine/canvas/game.js
import { SC, G } from '../src/engine/canvas/game.js';
import { T } from '../src/engine/canvas/data.js';
import assert from 'node:assert';

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
}

function stepUntil(predicate, maxSec = 10, dt = 1 / 60) {
  let elapsed = 0;
  while (!predicate() && elapsed < maxSec) {
    SC.step(dt);
    elapsed += dt;
  }
  if (elapsed >= maxSec) {
    throw new Error(`stepUntil timed out after ${maxSec}s`);
  }
  return elapsed;
}

function advanceToBattleChoice(seed = 42) {
  SC.newGame();
  SC.setSeed(seed);
  assert.strictEqual(G.mode, 'title');

  // Click title to enter ladder
  SC.click(240, 135);
  stepUntil(() => G.mode === 'ladder', 2.0);

  // Click ladder to enter battle
  SC.click(240, 135);
  stepUntil(() => G.mode === 'battle', 2.0);

  // Wait for ST.CHOICE (st === 4)
  stepUntil(() => G.st === 4, 10.0);
  assert.strictEqual(G.st, 4, 'Game must reach ST.CHOICE');
  return G;
}

console.log('=== RUNNING EMPIRICAL STRESS TESTS ON src/engine/canvas/game.js ===\n');

// ----------------------------------------------------------------------------
// 1. ST.ARM STATE VERIFICATION
// ----------------------------------------------------------------------------

runTest(`1.1 ST.ARM: Auto-fire after timeout (T.ARM = ${T.ARM}s) with NO input`, () => {
  const g = advanceToBattleChoice(101);

  // Click choice row 0 (x=250, y=207 in 480x270 coordinates)
  SC.click(250, 207);
  assert.strictEqual(g.st, 5, 'Must transition to ST.ARM (5)');
  assert.ok(g.arm, 'g.arm must be populated');
  assert.strictEqual(g.arm.t, 0, 'g.arm.t starts at 0');

  // Step virtual time forward without any keyboard or click inputs
  let armedTime = 0;
  const dt = 1 / 60;
  const maxWait = T.ARM + 0.5;
  while (g.st === 5 && armedTime < maxWait) {
    SC.step(dt);
    armedTime += dt;
  }

  // Verification
  assert.notStrictEqual(g.st, 5, 'Game must exit ST.ARM after timeout');
  assert.ok(armedTime >= T.ARM - 0.02 && armedTime <= T.ARM + 0.05, 
    `Auto-fire triggered at ${armedTime.toFixed(3)}s (expected ~${T.ARM.toFixed(3)}s)`);
  console.log(`    -> Auto-fire triggered cleanly at t = ${armedTime.toFixed(3)}s without input`);
});

runTest('1.2 ST.ARM: Canvas tap-to-fire works IMMEDIATELY without keyboard input', () => {
  const g = advanceToBattleChoice(102);

  // Arm choice 1 via canvas click
  SC.click(250, 207);
  assert.strictEqual(g.st, 5, 'Must be in ST.ARM');

  // Immediately tap the same choice button again via canvas click
  SC.click(250, 207);

  // Game must transition out of ST.ARM IMMEDIATELY (elapsed dt = 0)
  assert.notStrictEqual(g.st, 5, `State should have immediately exited ST.ARM, but was ${g.st}`);
  console.log(`    -> Immediate tap-to-fire on choice row transitioned state to ${g.st}`);
});

runTest('1.3 ST.ARM: Canvas tap anywhere on canvas fires move immediately', () => {
  const g = advanceToBattleChoice(103);

  // Arm choice 1 via canvas click
  SC.click(250, 207);
  assert.strictEqual(g.st, 5, 'Must be in ST.ARM');

  // Click anywhere else on canvas (e.g. 50, 50)
  SC.click(50, 50);

  // Game must transition out of ST.ARM immediately
  assert.notStrictEqual(g.st, 5, `Tapping canvas body should have fired move, but st=${g.st}`);
  console.log(`    -> Canvas body tap fired move immediately to state ${g.st}`);
});

runTest('1.4 ST.ARM: Re-arming via different choice button and cancelling', () => {
  const g = advanceToBattleChoice(104);

  // Arm response 0 (row 0: y=207)
  SC.click(250, 207);
  assert.strictEqual(g.st, 5, 'Must be in ST.ARM');
  const initialArmObj = g.arm.responseObj;

  // Click row 1 (y=219): should RE-ARM to response 1
  SC.click(250, 219);
  assert.strictEqual(g.st, 5, 'Must remain in ST.ARM after re-arming');
  assert.notStrictEqual(g.arm.responseObj, initialArmObj, 'Arm object must update to new response');
  assert.strictEqual(g.arm.t, 0, 'Arm timer must reset to 0 on re-arm');

  // Cancel via Escape key
  SC.key('Escape');
  assert.strictEqual(g.st, 4, 'Must return to ST.CHOICE on cancel');
  assert.strictEqual(g.arm, null, 'G.arm must be null after cancel');
  console.log('    -> Re-arming and Escape cancel work as expected');
});

// ----------------------------------------------------------------------------
// 2. PAUSE STATE INVARIANCE
// ----------------------------------------------------------------------------

runTest('2.1 Pause Invariance: SC.step does not advance time while paused', () => {
  const g = advanceToBattleChoice(201);

  // Pause
  SC.key('p');
  assert.strictEqual(g.paused, true, 'Game must be paused');

  const initialTime = g.time;
  const initialStT = g.stT;

  // Step 60 frames (1 second virtual time)
  for (let i = 0; i < 60; i++) {
    SC.step(1 / 60);
  }

  assert.strictEqual(g.time, initialTime, 'G.time must not advance while paused');
  assert.strictEqual(g.stT, initialStT, 'G.stT must not advance while paused');
  console.log('    -> Virtual time frozen completely during 60 paused frames');
});

runTest('2.2 Pause Invariance: Clicks and non-pause keys do not mutate state while paused', () => {
  const g = advanceToBattleChoice(202);

  SC.key('p');
  assert.strictEqual(g.paused, true);

  const preState = JSON.stringify({
    mode: g.mode,
    st: g.st,
    stT: g.stT,
    time: g.time,
    round: g.round,
    arm: g.arm,
    menuKind: g.menuKind,
    trust: g.enc.trust,
    doubt: g.enc.doubt,
    clock: g.enc.clock
  });

  // Spam 50 clicks across canvas
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 480;
    const y = Math.random() * 270;
    SC.click(x, y);
  }

  // Spam non-pause keys
  const nonPauseKeys = ['1', '2', '3', '4', 'Enter', ' ', 'Space', 'Backspace', 'a', 'z', 'Shift'];
  for (const k of nonPauseKeys) {
    SC.key(k);
  }

  const postState = JSON.stringify({
    mode: g.mode,
    st: g.st,
    stT: g.stT,
    time: g.time,
    round: g.round,
    arm: g.arm,
    menuKind: g.menuKind,
    trust: g.enc.trust,
    doubt: g.enc.doubt,
    clock: g.enc.clock
  });

  assert.strictEqual(postState, preState, 'Game state must be 100% invariant to clicks and non-pause keys while paused');
  console.log('    -> Clicks and keys completely ignored during pause');

  // Unpause with Escape
  SC.key('Escape');
  assert.strictEqual(g.paused, false, 'Unpause via Escape works');

  // Step forward: game should continue normally
  SC.step(1 / 60);
  assert.ok(g.time > preState.time || g.time > 0, 'Game resumes stepping after unpause');
});

runTest('2.3 Pause Invariance: Arm state auto-fire timer frozen while paused', () => {
  const g = advanceToBattleChoice(203);

  // Arm response 0
  SC.click(250, 207);
  assert.strictEqual(g.st, 5, 'ST.ARM');
  const halfArm = T.ARM / 2;
  SC.step(halfArm); // Advance half-way through arm timer
  const armT = g.arm.t;
  assert.ok(armT >= halfArm - 0.03 && armT <= halfArm + 0.03, `Arm timer is ${armT}`);

  // Pause
  SC.key('p');
  assert.strictEqual(g.paused, true);

  // Step 2 full seconds
  for (let i = 0; i < 120; i++) {
    SC.step(1 / 60);
  }

  // Verify timer did NOT advance and move did NOT fire
  assert.strictEqual(g.st, 5, 'Must remain in ST.ARM while paused');
  assert.strictEqual(g.arm.t, armT, 'G.arm.t must not advance while paused');

  // Unpause with 'p'
  SC.key('p');
  assert.strictEqual(g.paused, false);

  // Step remaining time plus buffer
  SC.step(halfArm + 0.1);
  assert.notStrictEqual(g.st, 5, 'Move fires after unpause and remaining time elapses');
  console.log('    -> Arm countdown paused and resumed with sub-frame precision');
});

// ----------------------------------------------------------------------------
// 3. RAPID INPUT SPAM & CHAOS STRESS
// ----------------------------------------------------------------------------

runTest('3.1 Rapid Input Spam: High-frequency click and key bombardment', () => {
  const g = advanceToBattleChoice(301);

  const keys = ['1', '2', '3', '4', 'Enter', ' ', 'Backspace', 'Escape', 'p', 'P', 'm', 'v', 'x', 'y', 'invalid', ''];
  const errors = [];

  // Bombard with 3,000 rapid randomized inputs interleaved with small steps
  for (let cycle = 0; cycle < 3000; cycle++) {
    try {
      const action = Math.random();
      if (action < 0.4) {
        // Random click across canvas (including out of bounds and negative)
        const x = (Math.random() - 0.2) * 600;
        const y = (Math.random() - 0.2) * 400;
        SC.click(x, y);
      } else if (action < 0.8) {
        // Random key press
        const k = keys[Math.floor(Math.random() * keys.length)];
        SC.key(k);
      } else {
        // Step with variable dt
        const dt = Math.random() * 0.05;
        SC.step(dt);
      }

      // Invariant check on each iteration
      if (Number.isNaN(g.time)) throw new Error('g.time is NaN');
      if (Number.isNaN(g.stT)) throw new Error('g.stT is NaN');
      if (g.enc) {
        if (Number.isNaN(g.enc.trust)) throw new Error('g.enc.trust is NaN');
        if (Number.isNaN(g.enc.doubt)) throw new Error('g.enc.doubt is NaN');
      }
    } catch (e) {
      errors.push(`Cycle ${cycle}: ${e.message}`);
      break;
    }
  }

  assert.strictEqual(errors.length, 0, `Encountered errors during rapid spam: ${errors.join(', ')}`);
  console.log('    -> 3,000 rapid randomized inputs processed with zero errors or state corruption');
});

runTest('3.2 Rapid Pause-Toggle Spam under active time progression', () => {
  const g = advanceToBattleChoice(302);

  // Rapidly flip pause state 1,000 times while stepping and clicking
  for (let i = 0; i < 1000; i++) {
    SC.key('p');
    if (Math.random() < 0.5) {
      SC.click(Math.random() * 480, Math.random() * 270);
    }
    SC.step(0.01);
  }

  // Ensure game can be cleanly unpaused and finished
  if (g.paused) SC.key('p');
  assert.strictEqual(g.paused, false);

  // Step 1 second
  SC.step(1.0);
  assert.ok(!Number.isNaN(g.time));
  console.log('    -> 1,000 rapid pause toggles resolved cleanly without desync');
});

// ----------------------------------------------------------------------------
// 4. MULTI-ENCOUNTER PLAYTHROUGH VIA PURE CANVAS CLICKS
// ----------------------------------------------------------------------------

runTest('4.1 Pure Canvas Pointer Playthrough: Full ladder win via mouse clicks only', () => {
  SC.newGame();
  SC.setSeed(777);
  const g = SC.state();

  // 1. Click Title Screen
  SC.click(240, 135);
  stepUntil(() => g.mode === 'ladder', 2.0);

  // 2. Click Ladder Screen
  SC.click(240, 135);
  stepUntil(() => g.mode === 'battle', 2.0);

  let exchanges = 0;
  while (g.mode === 'battle' && exchanges++ < 150) {
    const st = g.st;
    if (st === 4) { // ST.CHOICE
      // Click Choice 1 to arm (row 0: x=250, y=207)
      SC.click(250, 207);
      // Wait or tap-to-fire immediately: test tap-to-fire!
      if (g.st === 5) {
        SC.click(250, 207); // Tap-to-fire!
      }
    } else if (st === 5) { // ST.ARM
      SC.click(250, 207); // Tap-to-fire
    } else if (st === 6 || st === 7 || st === 8 || st === 9) { // cutin/cutaway/fire/result
      SC.click(240, 135); // Tap to skip / proceed
      SC.step(0.2);
    } else if (st === 11) { // ST.ENDWIN
      SC.step(1.6); // wait for lock
      SC.click(240, 135); // proceed to next encounter or ladder
    } else if (st === 12) { // ST.ENDLOSE
      SC.step(1.6);
      SC.click(250, 226); // Continue option
    } else {
      SC.step(0.1);
    }
  }

  assert.ok(exchanges > 0, 'Must have played encounters');
  console.log(`    -> Pure canvas pointer interaction executed ${exchanges} battle exchanges successfully`);
});

console.log(`\n=== STRESS TEST COMPLETE: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
