// Shared by the tree, tier and claims suites: every path through a conversation tree.
import { FAMILIES, createRun as gameCreateRun, optionsFor as gameOptionsFor, takeTurn as gameTakeTurn } from "../../../src/counter/engine.js";

const GAME = { createRun: gameCreateRun, optionsFor: gameOptionsFor, takeTurn: gameTakeTurn };

// A state the walk has seen before, ignoring the turn count and what was taken: the
// same node with the same flags and pressure means a move changed nothing.
export const loopKey = (state) => `${state.node}|${[...state.flags].sort().join(",")}|${state.pushes}|${state.pushedAfterNo}`;

// Depth first, every legal move from every reachable state, until each run ends.
export function walk(patientId, engine = GAME) {
  const finished = [];
  const live = [];
  const loops = [];
  const visit = (state, seen) => {
    if (state.phase === "ended") { finished.push(state); return; }
    live.push(state);
    const key = loopKey(state);
    if (seen.has(key)) { loops.push(`${state.taken.join(" > ")} came back to ${key}`); return; }
    const next = new Set(seen).add(key);
    for (const family of FAMILIES) {
      for (const option of engine.optionsFor(state, family)) visit(engine.takeTurn(state, option.id, state.revision), next);
    }
  };
  visit(engine.createRun(patientId), new Set());
  return { finished, live, loops };
}

// Play named moves in order, and fail loudly on a move that is not legal where it is
// played, so a script edit that breaks a path shows up as that path's name.
export function play(patientId, ...ids) {
  return ids.reduce((state, id) => {
    const next = GAME.takeTurn(state, id, state.revision);
    if (next === state) throw new Error(`"${id}" is not a legal move after ${state.taken.join(" > ") || "the opener"}`);
    return next;
  }, GAME.createRun(patientId));
}
