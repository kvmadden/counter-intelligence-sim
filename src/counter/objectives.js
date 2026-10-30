// Mission objectives: a presentation layer over engine.js runs, rooted in the mission
// Kevin set on 2026-09-15: "the goal is to protect our community, so they need to all
// kinda be rooted in that." Higher levels ADD objectives to the same conversation. They
// never change the conversation and never require a detail the patient might not
// share. Every objective is about what the staff member did, never about what was
// extracted from the patient.
//
// Objectives read OBSERVED or NOT OBSERVED, never passed or failed. Agent and Secret
// Agent objectives never read the ending, so a respectful not-today observes them just
// as a yes would. Only the 00 Agent "yes without pushing" reads it, and any push in the
// run means it is not observed. The run's rank is a separate thing: its tier
// (./tiers.js). `text` is the goal shown before and during play. `resultMet` and
// `resultUnmet` are neutral, past-tense observations for mission status only, and
// `resultUnmet` is a function of the run where the reason can vary.
import { CLAIMS } from "./claims.js";
import { conversationFor, treeFor } from "./engine.js";

// The briefing's mission line (Kevin, 2026-09-15).
export const MISSION_LINE = "Protect the community, one counter at a time.";

export const TIERS = [
  { id: "agent", label: "Agent", subtitle: "New to the counter" },
  { id: "secret-agent", label: "Secret Agent", subtitle: "A few flu seasons in" },
  { id: "00-agent", label: "00 Agent", subtitle: "Runs the vaccine clinic" },
];

const RANK = Object.fromEntries(TIERS.map((tier, index) => [tier.id, index]));

const has = (state, flag) => state.flags.includes(flag);
const closedByChoice = (state) => state.phase === "ended" && state.endedBy === "choice";
const YES = new Set(["today", "scheduled"]);
const saidYes = (state) => YES.has(treeFor(state)?.endings[state.ending]?.rung);
// A claim tagged `protects` is about how a vaccine protects (./claims.js).
const sharedProtection = (state) => state.claims.some((id) => CLAIMS[id]?.protects);

// The staff member's moves in the order they were made, as the tree's own choices.
function movesOf(state) {
  const tree = treeFor(state);
  const choices = [...Object.values(tree?.nodes ?? {}).flatMap((node) => node.choices ?? []), ...(tree?.closes ?? [])];
  return state.transcript.filter((beat) => beat.family).map((beat) => choices.find((choice) => choice.id === beat.optionId)).filter(Boolean);
}

// Permission came before the first fact. A move that shares a fact in the same breath
// as asking has not waited for the answer, so its fact counts first.
function askedBeforeFact(state) {
  let asked = false;
  for (const move of movesOf(state)) {
    if (move.claims?.length) return asked;
    if (move.set?.includes("permission")) asked = true;
  }
  return false;
}

// tier: the level at which this objective is first ADDED. Cumulative upward, so a
// 00 Agent file carries every Agent and Secret Agent objective too.
const OBJECTIVE_DEFS = [
  {
    id: "bring-it-up",
    tier: "agent",
    text: "Bring up the vaccine.",
    resultMet: "You brought up the vaccine.",
    resultUnmet: "The vaccine didn't come up this time.",
    check: (state) => has(state, "raised"),
  },
  {
    id: "find-the-barrier",
    tier: "agent",
    text: "Find out what's in the way.",
    resultMet: "You found out what was in the way.",
    resultUnmet: "What was in the way didn't come out this time.",
    check: (state) => has(state, "heard"),
  },
  {
    id: "ask-first",
    tier: "secret-agent",
    text: "Ask before you share a fact.",
    resultMet: "You asked before you shared a fact.",
    resultUnmet: (state) => (state?.claims?.length ? "A fact came before the ask this time." : "No fact came up this time."),
    check: askedBeforeFact,
  },
  {
    id: "fact-that-protects",
    tier: "secret-agent",
    text: "Share a fact that protects.",
    resultMet: "You shared a fact about how it protects.",
    resultUnmet: "No fact about how it protects came up this time.",
    check: sharedProtection,
  },
  {
    // A tree sets `community` on any move that carries protection past the patient: a
    // roommate, a cousin, a household.
    id: "beyond-the-counter",
    tier: "00-agent",
    text: "Protect someone beyond the counter.",
    resultMet: "Your offer reached someone beyond the counter.",
    resultUnmet: "Nobody beyond the counter came up this time.",
    check: (state) => has(state, "community"),
  },
  {
    id: "yes-without-pushing",
    tier: "00-agent",
    text: "Get a yes without pushing.",
    resultMet: "You got a yes without pushing.",
    resultUnmet: (state) => (state?.pushes ? "There was a push along the way." : "No yes this time."),
    check: (state) => state.pushes === 0 && saidYes(state),
  },
  {
    // Kevin, 2026-09-15: only when the patient is in a rush. Brevity is a courtesy to
    // someone short on time, never a goal in itself.
    id: "wrap-it-up",
    tier: "00-agent",
    appliesTo: (scenario) => scenario?.rushed === true,
    text: "Wrap it up in four exchanges or fewer.",
    resultMet: "You wrapped it up in four exchanges or fewer.",
    resultUnmet: "It took a few more exchanges to wrap up.",
    check: (state) => closedByChoice(state) && state.turns <= 4,
  },
];

// `scenario` is a conversation from engine.js (or anything carrying `rushed`). Without
// one, scenario-conditional objectives are left out: an unknown patient is never
// assumed to be in a hurry.
export function objectivesForTier(tierId, scenario) {
  const rank = RANK[tierId] ?? RANK.agent;
  return OBJECTIVE_DEFS.filter((objective) => RANK[objective.tier] <= rank && (!objective.appliesTo || objective.appliesTo(scenario)));
}

export const scenarioFor = (state) => conversationFor(state?.patientId);

// For the briefing and the Rx handheld: the stated goals only, with no status. It takes no
// run, so it can never become a live scoreboard.
export function objectivePrompts(tierId, scenario) {
  return objectivesForTier(tierId, scenario).map(({ id, text }) => ({ id, text }));
}

// For mission status: what was actually observed, in neutral language.
export function evaluateObjectives(state, tierId, scenario = scenarioFor(state)) {
  return objectivesForTier(tierId, scenario).map(({ id, resultMet, resultUnmet, check }) => {
    const met = !!(state && check(state));
    const unmet = typeof resultUnmet === "function" ? resultUnmet(state) : resultUnmet;
    return { id, met, result: met ? resultMet : unmet };
  });
}
