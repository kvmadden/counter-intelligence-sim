import { describe, expect, it } from "vitest";
import { debriefFor, outcomeOf } from "../../src/counter/engine.js";
import { CAP_NOTES, RUNGS, TIER_LADDER, tierFor } from "../../src/counter/tiers.js";
import { TREES } from "../../src/counter/trees/index.js";
import { play, walk } from "./helpers/tree-walk.js";

// Kevin, 2026-09-15: ranked tiers, where the top weighs the outcome AND how you got
// there. A pushed yes never outranks a respectful not-today, and pushing after a no
// caps the tier. These replace the old no-score tests.
const TARGETING = /\b(extract\w*|targets?|suspects?|interrogat\w*|surveil\w*)\b/i;
const NOT_YET = ["door-open", "thinking"];
const YES = ["today", "scheduled"];

function everyCombination() {
  const combos = [];
  for (const rung of RUNGS) for (const best of [false, true]) for (const pushes of [0, 1, 2]) {
    for (const pushedAfterNo of [false, true]) for (const heard of [false, true]) for (const permission of [false, true]) {
      if (pushedAfterNo && pushes === 0) continue; // a push after a no is still a push
      if (pushes > 0 && rung === "none") continue; // pushing raises the vaccine, so it did come up (counter-trees holds this on every path)
      const input = { rung, best, pushes, pushedAfterNo, heard, permission };
      combos.push({ input, tier: tierFor(input) });
    }
  }
  return combos;
}

describe("the tier ladder", () => {
  const combos = everyCombination();

  it("has six named rungs, lowest first, and none of them targets the patient", () => {
    expect(TIER_LADDER.length).toBe(6);
    expect(new Set(TIER_LADDER.map((tier) => tier.id)).size).toBe(6);
    for (const tier of TIER_LADDER) {
      expect(tier.label && tier.means, tier.id).toBeTruthy();
      expect(`${tier.label} ${tier.means}`).not.toMatch(TARGETING);
    }
  });

  it("ranks every pressured answer below every respectful not-yet, whatever else happened", () => {
    const pressured = combos.filter(({ input }) => input.pushes > 0);
    const respectfulNotYet = combos.filter(({ input }) => input.pushes === 0 && NOT_YET.includes(input.rung));
    expect(pressured.length).toBeGreaterThan(0);
    expect(respectfulNotYet.length).toBeGreaterThan(0);
    expect(Math.max(...pressured.map(({ tier }) => tier.rank))).toBeLessThan(Math.min(...respectfulNotYet.map(({ tier }) => tier.rank)));
  });

  it("caps any run that pushed after a no at the bottom rung", () => {
    for (const { input, tier } of combos.filter(({ input: i }) => i.pushedAfterNo)) {
      expect(tier.rank, JSON.stringify(input)).toBe(1);
      expect(tier.capped).toBe("pushed-after-no");
    }
  });

  it("saves the top rung for a best case reached by hearing the patient and asking first", () => {
    const top = combos.filter(({ tier }) => tier.rank === TIER_LADDER.length);
    expect(top.length).toBeGreaterThan(0);
    for (const { input } of top) expect(input).toMatchObject({ best: true, heard: true, permission: true, pushes: 0 });
    expect(tierFor({ rung: "today", best: true, heard: true, permission: false }).rank).toBeLessThan(TIER_LADDER.length);
  });

  it("keeps every verdict true to what happened, in the patient's own words", () => {
    for (const { input, tier } of combos) {
      const where = JSON.stringify(input);
      if (input.rung !== "today") expect(tier.label, where).not.toMatch(/Got my shot/);
      if (input.rung !== "scheduled") expect(tier.label, where).not.toMatch(/Booked it/);
      if (!YES.includes(input.rung)) expect(tier.label, where).not.toMatch(/said yes|wore me down/);
      if (YES.includes(input.rung)) expect(tier.label, where).not.toMatch(/so I said no|Didn't get it|followed me to the door/);
    }
    expect(tierFor({ rung: "today", best: true, heard: true, permission: true }).label).toBe("I'm telling everyone about this pharmacist.");
    expect(tierFor({ rung: "door-open", pushes: 1, pushedAfterNo: true }).label).toBe("They followed me to the door.");
  });

  it("refuses an outcome rung it does not know", () => {
    expect(() => tierFor({ rung: "maybe" })).toThrow(/Unknown outcome rung/);
  });
});

describe.each(Object.keys(TREES))("tiers over every path of the %s tree", (id) => {
  const ranked = walk(id).finished.map((run) => ({ run, ...outcomeOf(run) }));

  it("never ranks a pushed yes above a respectful not-today", () => {
    const pushedYes = ranked.filter(({ run, ending }) => run.pushes > 0 && YES.includes(ending.rung));
    const respectfulNo = ranked.filter(({ run, ending }) => run.pushes === 0 && NOT_YET.includes(ending.rung));
    expect(pushedYes.length, "paths with a pushed yes").toBeGreaterThan(0);
    expect(respectfulNo.length, "paths with a respectful not-today").toBeGreaterThan(0);
    expect(Math.max(...pushedYes.map(({ tier }) => tier.rank))).toBeLessThan(Math.min(...respectfulNo.map(({ tier }) => tier.rank)));
  });

  it("caps every path that pushed after a no, and says why kindly in the debrief", () => {
    const afterNo = ranked.filter(({ run }) => run.pushedAfterNo);
    expect(afterNo.length, "paths that pushed after a no").toBeGreaterThan(0);
    for (const { run, tier } of afterNo) {
      expect(tier.rank, run.taken.join(" > ")).toBe(1);
      expect(debriefFor(run).method).toBe(CAP_NOTES["pushed-after-no"]);
    }
    for (const { run } of ranked.filter(({ run: r }) => r.pushes === 0)) expect(debriefFor(run).method, run.taken.join(" > ")).toBeNull();
  });

  it("puts the top rung within reach", () => {
    expect(ranked.some(({ tier }) => tier.rank === TIER_LADDER.length)).toBe(true);
  });
});

describe("Jordan: the same moment, played two ways", () => {
  it("ranks a gracious close after her no well above pushing past it", () => {
    const graceful = outcomeOf(play("jordan", "counter.offer-shot", "hesitant.ask-skip", "declined.close-graceful"));
    const pushed = outcomeOf(play("jordan", "counter.offer-shot", "hesitant.ask-skip", "declined.push-again"));
    expect(graceful.ending.id).toBe("door-open");
    expect(pushed.ending.id).toBe("exit-pursued");
    expect(pushed.tier.rank).toBe(1);
    expect(graceful.tier.rank).toBeGreaterThan(pushed.tier.rank);
  });

  it("ranks the same best-case ending higher when she was heard and asked first", () => {
    const listened = outcomeOf(play("jordan", "counter.ask-permission", "permission.ask-feel", "concern.offer-facts", "open.book", "booking.ask-anyone"));
    const hurried = outcomeOf(play("jordan", "counter.offer-shot", "hesitant.offer-book", "booking.ask-anyone"));
    expect(listened.ending).toMatchObject({ id: "party-of-two", best: true });
    expect(hurried.ending).toMatchObject({ id: "party-of-two", best: true });
    expect(listened.tier.rank).toBe(6);
    expect(hurried.tier.rank).toBe(5);
  });

  it("ranks a pushed yes below a respectful not-today", () => {
    const pushedYes = outcomeOf(play("jordan", "counter.offer-shot", "hesitant.push-quick"));
    const notToday = outcomeOf(play("jordan", "counter.offer-shot", "close.bag"));
    expect(pushedYes.ending.id).toBe("fine-fine");
    expect(notToday.ending.id).toBe("door-open");
    expect(pushedYes.tier.rank).toBeLessThan(notToday.tier.rank);
  });
});
