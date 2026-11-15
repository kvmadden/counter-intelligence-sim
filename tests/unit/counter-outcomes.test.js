import { describe, expect, it } from "vitest";
import { OUTCOME_TIERS, outcomeFor } from "../../src/counter/outcomes.js";
import { PATIENTS } from "../../src/counter/patients.js";
import { TIER_LADDER } from "../../src/counter/tiers.js";
import { play } from "./helpers/tree-walk.js";

const [jordan] = PATIENTS;
const RAKE = ["counter.offer-shot", "hesitant.ask-pause", "concern.ask-permission", "concern.offer-facts", "open.next-bus", "today.offer-tdap"];

// What mission status and the debrief show, straight from the branching engine.
describe("the run outcome", () => {
  it("carries the engine's named ending and its tier", () => {
    const outcome = outcomeFor(play("jordan", ...RAKE), jordan);
    expect(outcome.ending).toEqual({ id: "rake-insurance", name: "Rake insurance", best: true, rung: "today" });
    expect(outcome.tier).toMatchObject({ id: "telling-everyone", label: "I'm telling everyone about this pharmacist.", rank: 6, of: 6, capped: null });
  });

  it("carries the file's own objectives, each with the line that reads beside it", () => {
    expect(outcomeFor(play("jordan", ...RAKE), jordan).objectives).toEqual([
      { id: "bring-it-up", text: "Bring up the vaccine.", met: true, status: "OBSERVED" },
      { id: "find-the-barrier", text: "Find out what's in the way.", met: true, status: "OBSERVED" },
    ]);
    expect(outcomeFor(play("jordan", "close.bag"), jordan).objectives.map((o) => o.status)).toEqual(["NOT OBSERVED", "NOT OBSERVED"]);
  });

  it("has nothing to show mid-run", () => {
    expect(outcomeFor(play("jordan", "counter.ask-time"), jordan)).toBeNull();
  });

  it("ranks against the tier ladder the screens show", () => {
    expect(OUTCOME_TIERS).toBe(TIER_LADDER);
  });
});
