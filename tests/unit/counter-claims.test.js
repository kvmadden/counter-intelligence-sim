import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { checkLedger, factShaped, selfTest, unusedClaims } from "../../scripts/check-claims.mjs";
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

  it("keeps source URLs in the built ledger for explicit anchors", () => {
    const config = fs.readFileSync(new URL('../../vite.config.js', import.meta.url), 'utf8')
    expect(config).not.toContain('stripClaimUrls')
    for (const claim of Object.values(CLAIMS)) expect(claim.source.url).toMatch(/^https:\/\/www\.cdc\.gov\//)
  })

  it("carries only exact manifest source URLs into the debrief", () => {
    const errors = []
    for (const id of Object.keys(TREES)) {
      for (const run of walk(id).finished) for (const source of debriefFor(run).sources) {
        if (source.url !== CLAIMS[source.id].source.url || source.reviewed !== false) errors.push({ path: run.taken, source })
      }
    }
    expect(errors).toEqual([])
  })
})
