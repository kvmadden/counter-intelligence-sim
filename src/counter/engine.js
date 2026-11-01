// The conversation reducer. Every patient is a data-only tree in ./trees/, and this
// file runs any of them. It never names a patient, a line or an ending.
//
// Kevin, 2026-09-15 (the design notes): a branching tree per patient,
// flags that carry earlier choices into later replies, named endings to discover, and
// a tier computed from the outcome AND how the player got there (./tiers.js).
//
// A tree is plain data:
//   { id, patient, rushed, maxTurns, start, briefing, equipment,
//     nodes:   { [id]: { line, choices: [Choice] } },
//     closes:  [Choice],            offered at every node, so Close is always live
//     timeout: { line, ending },    the turn cap reached with no ending yet
//     endings: { [id]: { name, rung, best, debrief, huddle } },
//     shared:  { [flag]: "the patient's own words" } }   for the Rx handheld
//   Choice: { id, family, label, requires, set, push, claims, note, reply, next | end }
// A text (line, label, reply) is a string, or a list of { when, text } variants where
// the first whose `when` holds wins. An ending (`end`, `timeout.ending`) is an id or a
// list of { when, ending } variants. A condition is a list of flags, "!" negating one.
// Labels and replies read the flags as they stood BEFORE the move, endings the flags
// after it. Two derived flags join the author's: "pushed" once any push move has been
// taken, and "pushed-after-no" once a push followed the patient's "declined".
import { CLAIMS } from "./claims.js";
import { CAP_NOTES, tierFor } from "./tiers.js";
import { TREES } from "./trees/index.js";

export const FAMILIES = Object.freeze(["ask", "offer", "sit", "close"]);

export const holds = (flags, when = []) => when.every((term) => (term.startsWith("!") ? !flags.includes(term.slice(1)) : flags.includes(term)));

export function textOf(value, flags = []) {
  if (!Array.isArray(value)) return value;
  return value.find((variant) => holds(flags, variant.when))?.text;
}

function endingOf(value, flags) {
  if (!Array.isArray(value)) return value;
  return value.find((variant) => holds(flags, variant.when))?.ending;
}

const withDerived = (state) => [
  ...state.flags,
  ...(state.pushes > 0 ? ["pushed"] : []),
  ...(state.pushedAfterNo ? ["pushed-after-no"] : []),
];

// An engine bound to a set of trees. The game uses the one below, bound to ./trees/.
// Tests bind small fixture trees, so the reducer is proven apart from any script.
export function makeEngine(trees, claims = CLAIMS) {
  const treeFor = (state) => trees[state?.patientId];

  function createRun(patientId) {
    const tree = trees[patientId];
    if (!tree) throw new Error(`No conversation tree for patient "${patientId}"`);
    return {
      phase: "encounter",
      patientId: tree.id,
      node: tree.start,
      revision: 0,
      turns: 0,
      maxTurns: tree.maxTurns,
      flags: [],
      taken: [],
      pushes: 0,
      pushedAfterNo: false,
      claims: [],
      notes: [],
      transcript: [{ speaker: tree.patient, text: textOf(tree.nodes[tree.start].line), optionId: "opener", family: null }],
      ending: null,
      endedBy: null,
    };
  }

  // Every choice the player may take right now: the node's own plus the tree's closes,
  // each at most once per run, and only where its `requires` holds.
  function available(state) {
    const tree = treeFor(state);
    if (!tree || state.phase !== "encounter") return [];
    const flags = withDerived(state);
    return [...(tree.nodes[state.node]?.choices ?? []), ...(tree.closes ?? [])]
      .filter((choice) => !state.taken.includes(choice.id) && holds(flags, choice.requires));
  }

  function optionsFor(state, family) {
    if (!state) return [];
    const flags = withDerived(state);
    return available(state)
      .filter((choice) => choice.family === family)
      .map((choice) => ({ id: choice.id, label: textOf(choice.label, flags) }));
  }

  function takeTurn(state, optionId, expectedRevision) {
    if (!state || state.phase !== "encounter" || state.revision !== expectedRevision) return state;
    const choice = available(state).find((candidate) => candidate.id === optionId);
    if (!choice) return state;
    const tree = treeFor(state);
    const before = withDerived(state);

    const flags = [...state.flags];
    for (const flag of choice.set ?? []) if (!flags.includes(flag)) flags.push(flag);
    const moved = {
      ...state,
      flags,
      pushes: state.pushes + (choice.push ? 1 : 0),
      pushedAfterNo: state.pushedAfterNo || (Boolean(choice.push) && state.flags.includes("declined")),
      taken: [...state.taken, choice.id],
      revision: state.revision + 1,
      turns: state.turns + 1,
    };
    const after = withDerived(moved);

    const endingId = choice.end ? endingOf(choice.end, after) : null;
    const node = endingId ? state.node : (choice.next ?? state.node);
    const reply = choice.reply !== undefined ? textOf(choice.reply, before) : textOf(tree.nodes[node].line, before);
    const cited = [...state.claims];
    for (const id of choice.claims ?? []) if (!cited.includes(id)) cited.push(id);
    const transcript = [
      ...state.transcript,
      { speaker: "You", text: textOf(choice.label, before), optionId: choice.id, family: choice.family, push: Boolean(choice.push) },
      { speaker: tree.patient, text: reply, optionId: choice.id, family: null },
    ];
    const next = { ...moved, node, claims: cited, transcript, notes: choice.note ? [...state.notes, choice.note] : state.notes };

    if (endingId) return { ...next, phase: "ended", ending: endingId, endedBy: "choice" };
    if (next.turns >= next.maxTurns) {
      return {
        ...next,
        phase: "ended",
        ending: endingOf(tree.timeout.ending, after),
        endedBy: "timeout",
        transcript: [...transcript, { speaker: tree.patient, text: textOf(tree.timeout.line, after), optionId: "timeout", family: null }],
      };
    }
    return next;
  }

  // The finished run's named ending and its tier, for mission status. Null mid-run.
  function outcomeOf(state) {
    const ending = state?.ending ? treeFor(state)?.endings[state.ending] : null;
    if (!ending) return null;
    const tier = tierFor({
      rung: ending.rung,
      best: Boolean(ending.best),
      pushes: state.pushes,
      pushedAfterNo: state.pushedAfterNo,
      heard: state.flags.includes("heard"),
      permission: state.flags.includes("permission"),
    });
    return { ending: { id: state.ending, name: ending.name, best: Boolean(ending.best), rung: ending.rung }, tier };
  }

  // What the debrief shows: only what was actually said, what moved the patient, a kind
  // word if there was pressure, the sources of any fact the player used, and the
  // ending's huddle prompt for teams who play it together.
  function debriefFor(state) {
    const ending = state?.ending ? treeFor(state)?.endings[state.ending] : null;
    const outcome = outcomeOf(state);
    return {
      observed: state.transcript.filter((beat) => beat.optionId !== "opener").map(({ speaker, text }) => ({ speaker, text })),
      happened: ending?.debrief ?? "",
      moved: [...state.notes],
      method: outcome?.tier.capped ? CAP_NOTES[outcome.tier.capped] : null,
      sources: state.claims.map((id) => ({ id, org: claims[id].source.org, title: claims[id].source.title, accessed: claims[id].source.accessed, url: claims[id].source.url, license: "CDC federal text, US public domain", historicalReview: claims[id].reviewedOn, reviewed: false })),
      discussion: ending?.huddle ?? "",
    };
  }

  // What the patient has said out loud about themselves, for the Rx handheld: the tree's
  // `shared` quotes whose flags are set, in the order they were set. Only their words.
  function sharedFor(state) {
    const shared = treeFor(state)?.shared ?? {};
    return (state?.flags ?? []).filter((flag) => shared[flag]).map((flag) => ({ id: flag, label: shared[flag] }));
  }

  // Per-patient facts the screens need before a run starts.
  const conversations = Object.freeze(Object.values(trees).map((tree) => Object.freeze({
    id: tree.id,
    patient: tree.patient,
    rushed: tree.rushed,
    briefing: tree.briefing,
    equipment: tree.equipment,
    opener: textOf(tree.nodes[tree.start].line),
    maxTurns: tree.maxTurns,
    endings: Object.freeze(Object.entries(tree.endings).map(([id, ending]) => Object.freeze({ id, name: ending.name, best: Boolean(ending.best) }))),
  })));
  const conversationFor = (patientId) => conversations.find((conversation) => conversation.id === patientId);

  return Object.freeze({ treeFor, createRun, optionsFor, takeTurn, outcomeOf, debriefFor, sharedFor, conversations, conversationFor });
}

export const engine = makeEngine(TREES);
export const { treeFor, createRun, optionsFor, takeTurn, outcomeOf, debriefFor, sharedFor, conversations, conversationFor } = engine;
