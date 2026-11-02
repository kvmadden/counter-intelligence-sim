import { describe, expect, it } from "vitest";
import { CLAIMS } from "../../src/counter/claims.js";
import { CLAIM_STATUS } from "../../src/counter/claim-status.js";
import { CAP_NOTES } from "../../src/counter/tiers.js";
import { conversations, makeEngine } from "../../src/counter/engine.js";

// The reducer, proven on a small fixture tree so no script edit can break it. The real
// trees are walked end to end in counter-trees.test.js.
const fixture = {
  id: "fixture",
  patient: "Pat",
  rushed: false,
  maxTurns: 3,
  start: "a",
  briefing: "A fixture.",
  equipment: "One pen.",
  nodes: {
    a: {
      line: "Hello.",
      choices: [
        { id: "a.perm", family: "ask", label: "May I?", set: ["permission"], reply: "Sure.", next: "a", note: "Asked first." },
        { id: "a.ask", family: "ask", label: [{ when: ["seen"], text: "And now?" }, { text: "How are you?" }], set: ["heard"], reply: "Fine.", next: "b" },
        { id: "a.sit", family: "sit", label: "(Wait.)", set: ["seen"], reply: [{ when: ["seen"], text: "Still here." }, { text: "Hm." }], next: "a" },
        { id: "a.push", family: "offer", label: "Just do it.", push: true, set: ["declined"], reply: "No.", next: "no" },
      ],
    },
    b: {
      line: "What now?",
      choices: [
        { id: "b.yes", family: "offer", label: "Want it?", claims: ["flu-two-weeks"], reply: "Yes.", note: "Offered.", end: [{ when: ["heard", "permission"], ending: "best" }, { ending: "yes" }] },
      ],
    },
    no: {
      line: "No.",
      choices: [
        { id: "no.push", family: "offer", label: "Sure?", push: true, reply: "Bye.", end: "gone" },
        { id: "no.close", family: "close", label: "Okay.", reply: [{ when: ["pushed"], text: "Thanks, I guess." }, { text: "Thanks." }], end: "open" },
      ],
    },
  },
  closes: [{ id: "close.any", family: "close", requires: ["!declined"], label: "Bye.", reply: "Bye.", end: [{ when: ["heard"], ending: "open" }, { ending: "none" }] }],
  timeout: { line: "Out of time.", ending: "open" },
  endings: {
    best: { name: "Best", rung: "today", best: true, debrief: "Best case.", huddle: "Why best?" },
    yes: { name: "Yes", rung: "today", debrief: "A yes.", huddle: "Why yes?" },
    open: { name: "Open", rung: "door-open", debrief: "Door open.", huddle: "Why open?" },
    gone: { name: "Gone", rung: "door-open", debrief: "Gone.", huddle: "Why gone?" },
    none: { name: "None", rung: "none", debrief: "Nothing.", huddle: "Why nothing?" },
  },
};

const { createRun, optionsFor, takeTurn, outcomeOf, debriefFor } = makeEngine({ fixture });
const turn = (state, id) => takeTurn(state, id, state.revision);
const play = (...ids) => ids.reduce(turn, createRun("fixture"));
const ids = (state, family) => optionsFor(state, family).map((option) => option.id);

describe("the conversation reducer", () => {
  it("opens on the start node's line, with nothing taken and no ending", () => {
    const run = createRun("fixture");
    expect(run).toMatchObject({ phase: "encounter", node: "a", turns: 0, maxTurns: 3, flags: [], pushes: 0, ending: null });
    expect(run.transcript).toEqual([{ speaker: "Pat", text: "Hello.", optionId: "opener", family: null }]);
    expect(() => createRun("nobody")).toThrow(/No conversation tree/);
  });

  it("offers each node's choices by family plus the tree's closes, each once, where its conditions hold", () => {
    const run = createRun("fixture");
    expect(ids(run, "ask")).toEqual(["a.perm", "a.ask"]);
    expect(ids(run, "close")).toEqual(["close.any"]);
    const waited = turn(run, "a.sit");
    expect(ids(waited, "sit")).toEqual([]);
    const refused = turn(run, "a.push");
    expect(ids(refused, "close")).toEqual(["no.close"]);
  });

  it("reads labels and replies from the flags as they stood before the move", () => {
    const waited = turn(createRun("fixture"), "a.sit");
    expect(waited.transcript.at(-1).text).toBe("Hm.");
    expect(optionsFor(waited, "ask").find((option) => option.id === "a.ask").label).toBe("And now?");
  });

  it("records each exchange as the player's line and the patient's reply", () => {
    const run = turn(createRun("fixture"), "a.ask");
    expect(run.transcript.slice(1)).toEqual([
      { speaker: "You", text: "How are you?", optionId: "a.ask", family: "ask", push: false },
      { speaker: "Pat", text: "Fine.", optionId: "a.ask", family: null },
    ]);
    expect(run).toMatchObject({ node: "b", turns: 1, revision: 1, flags: ["heard"] });
  });

  it("resolves an ending from the flags after the move", () => {
    expect(play("a.ask", "b.yes")).toMatchObject({ phase: "ended", ending: "yes", endedBy: "choice" });
    expect(play("a.perm", "a.ask", "b.yes")).toMatchObject({ phase: "ended", ending: "best" });
  });

  it("refuses a stale revision, an unknown option, a spent option and any move after the end", () => {
    const first = createRun("fixture");
    const next = takeTurn(first, "a.sit", first.revision);
    expect(takeTurn(next, "a.perm", first.revision)).toBe(next);
    expect(turn(next, "does-not-exist")).toBe(next);
    expect(turn(next, "a.sit")).toBe(next);
    const ended = play("close.any");
    expect(turn(ended, "a.ask")).toBe(ended);
  });

  it("counts pushes, and knows a push after a no when it sees one", () => {
    const refused = play("a.push");
    expect(refused).toMatchObject({ pushes: 1, pushedAfterNo: false, flags: ["declined"] });
    const pursued = turn(refused, "no.push");
    expect(pursued).toMatchObject({ pushes: 2, pushedAfterNo: true, ending: "gone" });
    expect(outcomeOf(pursued).tier).toMatchObject({ rank: 1, capped: "pushed-after-no" });
    expect(debriefFor(pursued).method).toBe(CAP_NOTES["pushed-after-no"]);
    expect(turn(refused, "no.close").transcript.at(-1).text).toBe("Thanks, I guess.");
  });

  it("ends a run gently at the turn cap, with the patient's own last line", () => {
    const run = play("a.sit", "a.perm", "a.ask");
    expect(run).toMatchObject({ phase: "ended", ending: "open", endedBy: "timeout", turns: 3 });
    expect(run.transcript.at(-1)).toEqual({ speaker: "Pat", text: "Out of time.", optionId: "timeout", family: null });
  });

  it("debriefs only what happened: the exchanges, what moved things, the cited sources and the huddle", () => {
    const debrief = debriefFor(play("a.perm", "a.ask", "b.yes"));
    expect(debrief.observed.map((beat) => beat.text)).toEqual(["May I?", "Sure.", "How are you?", "Fine.", "Want it?", "Yes."]);
    expect(debrief.happened).toBe("Best case.");
    expect(debrief.moved).toEqual(["Asked first.", "Offered."]);
    expect(debrief.method).toBeNull();
    expect(debrief.sources).toEqual([{ id: "flu-two-weeks", org: "CDC", title: "Key Facts About Seasonal Flu Vaccine", accessed: "2026-11-01", url: CLAIMS["flu-two-weeks"].source.url, license: "CDC federal text, US public domain", historicalReview: null, review: CLAIM_STATUS["flu-two-weeks"], reviewed: false }]);
    expect(debrief.discussion).toBe("Why best?");
    expect(debriefFor(play("close.any")).sources).toEqual([]);
  });

  it("gives the best case the top tier only when the patient was heard and asked first", () => {
    expect(outcomeOf(play("a.perm", "a.ask", "b.yes"))).toMatchObject({ ending: { id: "best", best: true }, tier: { rank: 6 } });
    expect(outcomeOf(play("a.ask", "b.yes")).tier.rank).toBe(5);
    expect(outcomeOf(createRun("fixture"))).toBeNull();
  });
});

describe("the game's conversations", () => {
  it("describe each patient for the screens without starting a run", () => {
    expect(conversations.map((conversation) => conversation.id)).toEqual(["jordan", "marcus", "priya", "sam", "walt"]);
    const [jordan] = conversations;
    expect(jordan).toMatchObject({ patient: "Jordan", rushed: true, maxTurns: 8, opener: "I'm in a rush. Is this going to take long?" });
    expect(jordan.endings.length).toBeGreaterThanOrEqual(6);
    expect(Object.isFrozen(jordan)).toBe(true);
  });
});
