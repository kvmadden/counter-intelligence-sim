import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAMILIES, optionsFor } from "../../src/counter/engine.js";
import { CLAIMS } from "../../src/counter/claims.js";
import { TREES } from "../../src/counter/trees/index.js";
import { walk } from "./helpers/tree-walk.js";

// Kevin, 2026-11-01: this game carries no COVID content. The Vax or Fiction exception
// (2026-11-12) does not extend here. Covers trees, claims and docs, source text and data.
const ROOT = join(import.meta.dirname, "../..");
const TERM = /covid|sars-?cov|coronavirus/i;
// Real source URLs are data, not content: only visible text, claims, offers and debriefs count.
const withoutUrls = (text) => text.replace(/https?:\/\/[^\s"')]+/g, "");
const hasTerm = (text) => TERM.test(withoutUrls(text));

const filesUnder = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? filesUnder(path) : [path];
});

describe("no COVID content", () => {
  it("is absent from every tree file, the claims ledger and every doc", () => {
    const files = [...filesUnder(join(ROOT, "src/counter/trees")), join(ROOT, "src/counter/claims.js"), ...filesUnder(join(ROOT, "docs")).filter((f) => /\.(md|json|txt)$/.test(f)), join(ROOT, "README.md")];
    expect(files.length, "the sweep sees its targets").toBeGreaterThan(8);
    const hits = files.filter((file) => hasTerm(readFileSync(file, "utf8"))).map((file) => file.slice(ROOT.length + 1));
    expect(hits).toEqual([]);
  });

  it("is absent from the loaded trees and claims, ids included", () => {
    const hits = [];
    for (const [id, tree] of Object.entries(TREES)) if (hasTerm(JSON.stringify(tree))) hits.push(`tree ${id}`);
    for (const [id, claim] of Object.entries(CLAIMS)) if (hasTerm(id + JSON.stringify(claim))) hits.push(`claim ${id}`);
    expect(Object.keys(TREES)).toHaveLength(5);
    expect(hits).toEqual([]);
  });
});

describe("every script still plays to an ending", () => {
  it.each(Object.keys(TREES))("%s has no dead end and every ending is reachable", (id) => {
    const { finished, live } = walk(id);
    expect(finished.length, "paths played").toBeGreaterThan(20);
    for (const state of live) {
      const moves = FAMILIES.flatMap((family) => optionsFor(state, family));
      expect(moves.length, `a move exists after ${state.taken.join(" > ")}`).toBeGreaterThan(0);
    }
    const reached = new Set(finished.map((run) => run.ending));
    for (const ending of Object.keys(TREES[id].endings)) expect(reached.has(ending), `${id} reaches ${ending}`).toBe(true);
  });
});
