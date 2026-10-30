import { describe, expect, it } from "vitest";
import { createRun } from "../../src/counter/engine.js";
import { rampIndex } from "../../src/counter/ExchangeArcs.jsx";
import { exchangeSegments } from "../../src/counter/hud.js";
import { play } from "./helpers/tree-walk.js";

describe("HUD exchange arcs", () => {
  it("count exchanges used, and are blind to what was shared, offered or observed", () => {
    expect(exchangeSegments(createRun("jordan"))).toEqual({ total: 8, used: 0 });
    const shared = play("jordan", "counter.ask-time"); // she shares her bus
    const offered = play("jordan", "counter.offer-fast"); // the player makes an offer
    const neither = play("jordan", "counter.ask-permission"); // nothing shared, nothing offered
    expect(shared.flags).toContain("bus");
    expect(offered.transcript.at(-2).family).toBe("offer");
    for (const run of [shared, offered, neither]) expect(exchangeSegments(run)).toEqual({ total: 8, used: 1 });
  });

  it("samples each colour ramp across any number of segments, so none falls off the end", () => {
    for (const count of [1, 4, 6, 8, 10, 12]) {
      const picks = Array.from({ length: count }, (_, index) => rampIndex(index, count, 6));
      expect(Math.min(...picks), `count ${count}`).toBe(0);
      expect(Math.max(...picks), `count ${count}`).toBe(count > 1 ? 5 : 0);
      for (const pick of picks) expect(Number.isInteger(pick) && pick >= 0 && pick <= 5, `count ${count}: ${pick}`).toBe(true);
    }
  });

  it("clamps to the budget even when handed a run outside it", () => {
    // The engine never produces these; the clamp is what keeps a bad run from drawing 9 of 6.
    expect(exchangeSegments({ turns: 9, maxTurns: 6 })).toEqual({ total: 6, used: 6 });
    expect(exchangeSegments({ turns: -1, maxTurns: 6 })).toEqual({ total: 6, used: 0 });
  });
});
