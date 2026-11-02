import { describe, expect, it } from "vitest";
import { CLAIMS } from "../../src/counter/claims.js";
import { conversations, treeFor } from "../../src/counter/engine.js";
import { MISSION_LINE, TIERS, evaluateObjectives, objectivePrompts, objectivesForTier } from "../../src/counter/objectives.js";
import { PATIENTS, conversationOf } from "../../src/counter/patients.js";
import { play, walk } from "./helpers/tree-walk.js";

const RUSHED = { rushed: true };
const UNHURRIED = { rushed: false };
// Still binding: no goal or observation targets the patient, and objectives read
// observed or not, never passed or failed. counter-tiers.test.js holds the tier rules.
const TARGETING = /extract|target|\bmark\b|suspect|interrogat|surveil/i;
const VERDICT = /\bfail(ed|s)?\b|\bpass(ed|es)?\b/i;
// Every line an objective can print, a varying one under each of its reasons.
const linesOf = (o) => [o.text, o.resultMet, ...(typeof o.resultUnmet === "function" ? [o.resultUnmet({ claims: ["x"], pushes: 1 }), o.resultUnmet({ claims: [], pushes: 0 })] : [o.resultUnmet])];
const resultOf = (run, tier, id, scenario) => evaluateObjectives(run, tier, scenario).find((o) => o.id === id);

// Jordan's paths, walked straight off her tree.
// Rake insurance: she asks first, hears safety facts, then the Tdap booster from her record.
const RAKE = ["counter.offer-shot", "hesitant.ask-pause", "concern.ask-permission", "concern.offer-facts", "open.next-bus", "today.offer-tdap"];
// The same respectful yes, closed with a seat: no fact about how a vaccine protects.
const NEXT_BUS = [...RAKE.slice(0, -1), "today.close-seat"];
// Eight exchanges with no ending, so Jordan's bus arrives (her cap is 8). The sit-after
// fact comes before any ask, and the timing facts about protection come last.
const TIMEOUT = ["counter.ask-time", "rush.offer-shot", "hesitant.offer-next-bus", "hesitant.ask-pause", "concern.sit", "concern.ask-permission", "concern.offer-facts", "open.why-now"];
const LONG = ["counter.ask-time", "rush.offer-shot", "hesitant.sit", "concern.sit", "close.bag"];
const COMMUNITY_MOVES = ["today.ask-cousin", "booking.ask-anyone"];
// Every finished run of Jordan's tree, so each rule below is held on every path.
const RUNS = walk("jordan").finished;
const rungOf = (run) => treeFor(run).endings[run.ending].rung;

describe("the mission and the three levels", () => {
  it("states the mission Kevin set", () => {
    expect(MISSION_LINE).toBe("Protect the community, one counter at a time.");
  });

  it("names three levels in escalating order", () => {
    expect(TIERS.map((tier) => tier.id)).toEqual(["agent", "secret-agent", "00-agent"]);
    expect(TIERS.every((tier) => tier.label && tier.subtitle)).toBe(true);
  });

  it("adds objectives cumulatively rather than swapping them per level", () => {
    const agent = objectivesForTier("agent", RUSHED);
    const secretAgent = objectivesForTier("secret-agent", RUSHED);
    const doubleO = objectivesForTier("00-agent", RUSHED);
    expect([agent.length, secretAgent.length, doubleO.length]).toEqual([2, 4, 7]);
    expect(agent.every((objective) => secretAgent.some((o) => o.id === objective.id))).toBe(true);
    expect(secretAgent.every((objective) => doubleO.some((o) => o.id === objective.id))).toBe(true);
  });

  it("falls back to Agent for an unknown level", () => {
    expect(objectivesForTier("nonexistent")).toEqual(objectivesForTier("agent"));
  });

  it("never phrases a goal or an observation as targeting the patient, as a pass or a fail, or with a semicolon or a dash", () => {
    const words = objectivesForTier("00-agent", RUSHED).flatMap(linesOf).join(" ");
    expect(words).not.toMatch(TARGETING);
    expect(words).not.toMatch(VERDICT);
    expect(words).not.toMatch(/[;—]/);
  });
});

describe("objectivePrompts (the briefing and the Rx handheld)", () => {
  it("returns only the stated goal text, with no status field at all", () => {
    const prompts = objectivePrompts("secret-agent");
    expect(prompts).toEqual([
      { id: "bring-it-up", text: "Bring up the vaccine." },
      { id: "find-the-barrier", text: "Find out what's in the way." },
      { id: "ask-first", text: "Ask before you share a fact." },
      { id: "fact-that-protects", text: "Share a fact that protects." },
    ]);
    expect(prompts.some((p) => "met" in p)).toBe(false);
  });
});

describe("evaluateObjectives (mission status only)", () => {
  it("walks enough of Jordan's tree to mean something", () => {
    expect(RUNS.length).toBeGreaterThan(100);
  });

  it("observes bringing it up and finding what's in the way from the moves alone", () => {
    expect(evaluateObjectives(play("jordan", "close.bag"), "agent")).toEqual([
      { id: "bring-it-up", met: false, result: "The vaccine didn't come up this time." },
      { id: "find-the-barrier", met: false, result: "What was in the way didn't come out this time." },
    ]);
    const notToday = play("jordan", "counter.offer-shot", "hesitant.ask-pause", "close.bag");
    expect(rungOf(notToday)).toBe("door-open");
    expect(evaluateObjectives(notToday, "agent").every((o) => o.met), "a respectful not-today observes both").toBe(true);
  });

  it("never reads the ending below 00 Agent, on any path", () => {
    const endings = Object.keys(treeFor(RUNS[0]).endings);
    for (const run of RUNS) {
      const swapped = { ...run, ending: endings.find((id) => id !== run.ending) };
      expect(evaluateObjectives(swapped, "secret-agent"), run.taken.join(" > ")).toEqual(evaluateObjectives(run, "secret-agent"));
    }
  });

  it("observes asking first only when permission comes before the first fact", () => {
    expect(resultOf(play("jordan", ...RAKE), "secret-agent", "ask-first")).toEqual({ id: "ask-first", met: true, result: "You asked before you shared a fact." });
    const factFirst = play("jordan", ...TIMEOUT);
    expect(factFirst.flags).toContain("permission");
    expect(resultOf(factFirst, "secret-agent", "ask-first")).toEqual({ id: "ask-first", met: false, result: "A fact came before the ask this time." });
    expect(resultOf(play("jordan", "close.bag"), "secret-agent", "ask-first")).toEqual({ id: "ask-first", met: false, result: "No fact came up this time." });
  });

  it("counts only facts about how a vaccine protects as a fact that protects", () => {
    expect(Object.keys(CLAIMS).filter((id) => CLAIMS[id].protects)).toEqual(["flu-two-weeks", "tdap-ten-years", "ve-good-match", "milder-illness", "flu-protects-others", "baby-two-weeks", "flu-65-preferred", "pneumo-50-plus"]);
    expect(resultOf(play("jordan", ...NEXT_BUS), "secret-agent", "fact-that-protects")).toEqual({ id: "fact-that-protects", met: false, result: "No fact about how it protects came up this time." });
    expect(resultOf(play("jordan", ...TIMEOUT), "secret-agent", "fact-that-protects").met).toBe(true);
  });

  it("observes protection beyond the counter exactly when a move reached past the patient", () => {
    let reached = 0;
    for (const run of RUNS) {
      const past = run.taken.some((id) => COMMUNITY_MOVES.includes(id));
      reached += past ? 1 : 0;
      expect(resultOf(run, "00-agent", "beyond-the-counter").met, run.taken.join(" > ")).toBe(past);
    }
    expect(reached, "some path reaches past the counter").toBeGreaterThan(0);
  });

  it("never observes a yes that took a push, on any path", () => {
    let pushedYes = 0;
    let cleanYes = 0;
    for (const run of RUNS) {
      const yes = ["today", "scheduled"].includes(rungOf(run));
      const result = resultOf(run, "00-agent", "yes-without-pushing");
      expect(result.met, run.taken.join(" > ")).toBe(yes && run.pushes === 0);
      if (run.pushes) expect(result.result).toBe("There was a push along the way.");
      if (yes && run.pushes) pushedYes += 1;
      if (yes && !run.pushes) cleanYes += 1;
    }
    expect([pushedYes > 0, cleanYes > 0], "the tree has both a pushed yes and a clean one").toEqual([true, true]);
  });
});

describe("the four-exchange objective follows the patient's rush (Kevin, 2026-09-15)", () => {
  const efficiency = "wrap-it-up";

  it("applies when the patient is in a rush", () => {
    expect(objectivesForTier("00-agent", RUSHED).map((o) => o.id)).toContain(efficiency);
    expect(conversations.find((conversation) => conversation.id === "jordan").rushed).toBe(true);
    expect(resultOf(play("jordan", ...LONG), "00-agent", efficiency)).toEqual({ id: efficiency, met: false, result: "It took a few more exchanges to wrap up." });
    expect(resultOf(play("jordan", "close.bag"), "00-agent", efficiency).met).toBe(true);
  });

  it("never counts running out of time as wrapping it up", () => {
    const timedOut = play("jordan", ...TIMEOUT);
    expect(timedOut.endedBy).toBe("timeout");
    expect(resultOf(timedOut, "00-agent", efficiency).met).toBe(false);
  });

  it("is left out when the patient is not in a rush, so taking longer is never even observed", () => {
    expect(objectivesForTier("00-agent", UNHURRIED).map((o) => o.id)).not.toContain(efficiency);
    expect(evaluateObjectives(play("jordan", ...LONG), "00-agent", UNHURRIED).map((o) => o.id)).not.toContain(efficiency);
  });

  it("never assumes an unknown patient is in a hurry", () => {
    expect(objectivesForTier("00-agent").map((o) => o.id)).not.toContain(efficiency);
  });

  it("makes every conversation say whether its patient is in a rush", () => {
    expect(conversations.length).toBeGreaterThan(0);
    for (const conversation of conversations) expect(typeof conversation.rushed, conversation.id).toBe("boolean");
  });
});

// A file whose own objectives can never all be observed would be a broken promise. Each
// new patient's tree must leave at least one path that observes every one of them.
describe("every file's objectives can all be observed", () => {
  it.each(PATIENTS.map((patient) => [patient.id, patient]))("on at least one path of %s's tree", (id, patient) => {
    const scenario = conversationOf(patient);
    const runs = walk(id).finished;
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.some((run) => evaluateObjectives(run, patient.level, scenario).every((o) => o.met))).toBe(true);
  });
});
