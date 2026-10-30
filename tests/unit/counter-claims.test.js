import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkLedger, factShaped, selfTest, unusedClaims } from "../../scripts/check-claims.mjs";
import { dropUrlFields } from "../../scripts/vite-plugins.mjs";
import { CLAIMS } from "../../src/counter/claims.js";
import { debriefFor } from "../../src/counter/engine.js";
import { TREES } from "../../src/counter/trees/index.js";
import { walk } from "./helpers/tree-walk.js";

// Kevin, 2026-09-15: facts at conversation level, accurate, from the CDC or other
// established public-health sources, each carrying his review stamp. These replace the
// old no-clinical-term tests: vaccine words now ship, and facts are held to sources.
describe("the claims ledger", () => {
  it("has nothing wrong with it except missing review stamps, which only Kevin adds", () => {
    expect(checkLedger().filter((problem) => problem.rule !== "unreviewed claim")).toEqual([]);
  });

  it("proves its gate RED on every planted problem, from a baseline that is clean once stamped", () => {
    const { baseline, missed, planted } = selfTest();
    expect(baseline).toEqual([]);
    expect(missed).toEqual([]);
    expect(planted).toBeGreaterThanOrEqual(6);
  });

  it("cites every claim somewhere, so nothing sits in the ledger unused", () => {
    expect(unusedClaims()).toEqual([]);
  });

  it("keeps claims in plain sentences, with no semicolons or em-dashes", () => {
    for (const [id, claim] of Object.entries(CLAIMS)) expect(claim.text, id).not.toMatch(/[;—]/);
  });

  it("reads public-health facts as facts, and ordinary counter talk as talk", () => {
    for (const fact of ["It takes about two weeks to kick in.", "The shot can't give you flu.", "We'd have you sit about fifteen minutes after.", "Flu usually peaks in winter."]) {
      expect(factShaped(fact), fact).toBe(true);
    }
    for (const talk of ["Two minutes, tops. Your bag's right here.", "Want your flu shot while you're here?", "How long have you got?"]) {
      expect(factShaped(talk), talk).toBe(false);
    }
  });
});

describe("sources in the debrief", () => {
  it.each(Object.keys(TREES))("lists, on every %s path, exactly the claims its staff lines cited", (id) => {
    const tree = TREES[id];
    const byId = new Map([...Object.values(tree.nodes).flatMap((node) => node.choices), ...tree.closes].map((choice) => [choice.id, choice]));
    let citing = 0;
    for (const run of walk(id).finished) {
      const expected = [...new Set(run.taken.flatMap((choiceId) => byId.get(choiceId).claims ?? []))];
      const { sources } = debriefFor(run);
      expect(sources.map((source) => source.id), run.taken.join(" > ")).toEqual(expected);
      for (const source of sources) expect(source).toMatchObject({ org: CLAIMS[source.id].source.org, title: CLAIMS[source.id].source.title });
      if (sources.length) citing += 1;
    }
    expect(citing, "paths that cited a fact").toBeGreaterThan(0);
  });

  it("strips every source URL from the ledger at build time and leaves each claim whole", () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const source = fs.readFileSync(path.join(root, "src/counter/claims.js"), "utf8");
    expect((source.match(/\burl:\s*"https:\/\//g) ?? []).length, "URLs kept in the repo for review").toBe(Object.keys(CLAIMS).length);
    const stripped = dropUrlFields(source);
    expect(stripped).not.toMatch(/https?:\/\//);
    const shipped = new Function(stripped.replace("export const CLAIMS =", "return"))();
    expect(Object.keys(shipped)).toEqual(Object.keys(CLAIMS));
    for (const [id, claim] of Object.entries(shipped)) {
      expect(claim.source, id).toEqual({ org: CLAIMS[id].source.org, title: CLAIMS[id].source.title, accessed: CLAIMS[id].source.accessed });
      expect(claim.text, id).toBe(CLAIMS[id].text);
    }
  });

  it("never carries a source URL into the debrief (the bundle ships offline)", () => {
    for (const id of Object.keys(TREES)) {
      for (const run of walk(id).finished) expect(JSON.stringify(debriefFor(run))).not.toMatch(/https?:/);
    }
  });
});
