import { describe, expect, it } from "vitest";
import { FAMILIES, optionsFor } from "../../src/counter/engine.js";
import { RUNGS } from "../../src/counter/tiers.js";
import { TREES } from "../../src/counter/trees/index.js";
import { walk } from "./helpers/tree-walk.js";

// the design notes, edge case 12: an exhaustive path walk over every
// tree. Every node, choice and ending reachable, Close live everywhere, no loops.
const PUNCTUATION = /[;—]/; // Kevin, 2026-09-15: no semicolons or em-dashes in the games.
const TARGETING = /\b(extract\w*|targets?|targeted|suspects?|interrogat\w*|surveil\w*)\b/i;
const MAX_LABEL = 72; // four staff lines must fit at 390x844 (the browser suite proves the layout)

const textsOf = (value) => (Array.isArray(value) ? value.map((variant) => variant.text) : value == null ? [] : [value]);
const choicesOf = (tree) => [...Object.values(tree.nodes).flatMap((node) => node.choices ?? []), ...(tree.closes ?? [])];
const endingIdsOf = (value) => (Array.isArray(value) ? value.map((variant) => variant.ending) : [value]);
const copyOf = (tree) => [
  tree.briefing, tree.equipment,
  ...Object.values(tree.nodes).flatMap((node) => textsOf(node.line)),
  ...choicesOf(tree).flatMap((choice) => [...textsOf(choice.label), ...textsOf(choice.reply), choice.note]),
  ...textsOf(tree.timeout.line),
  ...Object.values(tree.endings).flatMap((ending) => [ending.name, ending.debrief, ending.huddle]),
  ...Object.values(tree.shared ?? {}),
].filter(Boolean);

describe.each(Object.keys(TREES))("the %s conversation tree", (id) => {
  const tree = TREES[id];
  const { finished, live, loops } = walk(id);

  it("is well formed: unique choice ids, real destinations, known families, rungs and endings", () => {
    const ids = choicesOf(tree).map((choice) => choice.id);
    expect(new Set(ids).size, "choice ids are unique").toBe(ids.length);
    expect(tree.nodes[tree.start], "the start node exists").toBeTruthy();
    for (const choice of choicesOf(tree)) {
      expect(FAMILIES, choice.id).toContain(choice.family);
      expect(Boolean(choice.next) !== Boolean(choice.end), `${choice.id} goes to a node or an ending, never both or neither`).toBe(true);
      if (choice.next) expect(tree.nodes[choice.next], `${choice.id} -> ${choice.next}`).toBeTruthy();
      if (choice.end) for (const ending of endingIdsOf(choice.end)) expect(tree.endings[ending], `${choice.id} -> ${ending}`).toBeTruthy();
      if (choice.end) expect(choice.reply, `${choice.id} gives the patient a last line`).toBeTruthy();
    }
    for (const ending of endingIdsOf(tree.timeout.ending)) expect(tree.endings[ending], `timeout -> ${ending}`).toBeTruthy();
    for (const [endingId, ending] of Object.entries(tree.endings)) {
      expect(RUNGS, endingId).toContain(ending.rung);
      expect(ending.name && ending.debrief && ending.huddle, `${endingId} has a name, a debrief line and a huddle prompt`).toBeTruthy();
    }
  });

  it("ends every path within the turn cap, with no loops", () => {
    expect(loops).toEqual([]);
    expect(finished.length, "paths walked").toBeGreaterThan(20);
    for (const run of finished) expect(run.turns, run.taken.join(" > ")).toBeLessThanOrEqual(tree.maxTurns);
  });

  it("reaches every node, every choice and every ending", () => {
    const nodes = new Set([...live, ...finished].map((state) => state.node));
    expect([...nodes].sort()).toEqual(Object.keys(tree.nodes).sort());
    const taken = new Set(finished.flatMap((run) => run.taken));
    expect(choicesOf(tree).map((choice) => choice.id).filter((choiceId) => !taken.has(choiceId)), "choices no path takes").toEqual([]);
    const endings = new Set(finished.map((run) => run.ending));
    expect([...endings].sort()).toEqual(Object.keys(tree.endings).sort());
  });

  it("keeps Close live in every state, so there is never a dead end", () => {
    expect(live.length, "live states checked").toBeGreaterThan(20);
    for (const state of live) expect(optionsFor(state, "close").length, state.taken.join(" > ") || "opener").toBeGreaterThan(0);
  });

  it("offers at most four sub-choices under any move", () => {
    for (const state of live) {
      for (const family of FAMILIES) expect(optionsFor(state, family).length, `${family} after ${state.taken.join(" > ") || "opener"}`).toBeLessThanOrEqual(4);
    }
  });

  it("never ends a pushed run on an ending where the vaccine never came up", () => {
    const pushed = finished.filter((run) => run.pushes > 0);
    expect(pushed.length, "pushed paths checked").toBeGreaterThan(0);
    for (const run of pushed) expect(tree.endings[run.ending].rung, run.taken.join(" > ")).not.toBe("none");
  });

  it("has at least six endings to discover, and at least one best case", () => {
    expect(Object.keys(tree.endings).length).toBeGreaterThanOrEqual(6);
    expect(Object.values(tree.endings).filter((ending) => ending.best).length).toBeGreaterThanOrEqual(1);
  });

  it("gives every exchange a line from each side", () => {
    for (const run of finished) {
      for (const beat of run.transcript) expect(typeof beat.text === "string" && beat.text.trim().length > 0, `${run.taken.join(" > ")} :: ${beat.optionId}`).toBe(true);
    }
  });

  it("keeps staff lines short enough to fit four to a screen", () => {
    for (const choice of choicesOf(tree)) for (const label of textsOf(choice.label)) expect(label.length, label).toBeLessThanOrEqual(MAX_LABEL);
  });

  it("uses no semicolons or em-dashes anywhere in its copy (Kevin, 2026-09-15)", () => {
    const copy = copyOf(tree);
    expect(copy.length, "strings checked").toBeGreaterThan(50);
    for (const text of copy) expect(text, text).not.toMatch(PUNCTUATION);
  });

  it("never frames the patient as a target, a suspect or someone to extract from", () => {
    for (const text of copyOf(tree)) expect(text, text).not.toMatch(TARGETING);
  });
});
