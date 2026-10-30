// What a finished run shows on mission status: its tier on the ladder in ./tiers.js,
// its named ending (some are best-case), and the file's objectives, each OBSERVED or
// NOT OBSERVED. Kevin, 2026-09-15: outcomes are "all of this", endings to discover
// AND ranked tiers. The tier and the ending come from the branching engine.
import { outcomeOf } from "./engine.js";
import { evaluateObjectives, objectivesForTier, scenarioFor } from "./objectives.js";

export { TIER_LADDER as OUTCOME_TIERS } from "./tiers.js";

export const OBJECTIVE_STATUS = { met: "OBSERVED", unmet: "NOT OBSERVED" };

export function outcomeFor(run, patient) {
  const outcome = outcomeOf(run);
  if (!outcome) return null;
  const scenario = scenarioFor(run);
  const texts = new Map(objectivesForTier(patient.level, scenario).map(({ id, text }) => [id, text]));
  const objectives = evaluateObjectives(run, patient.level, scenario).map(({ id, met }) => ({
    id,
    text: texts.get(id),
    met,
    status: met ? OBJECTIVE_STATUS.met : OBJECTIVE_STATUS.unmet,
  }));
  return { tier: outcome.tier, ending: outcome.ending, objectives };
}
