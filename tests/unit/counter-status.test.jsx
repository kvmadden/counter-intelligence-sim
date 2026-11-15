// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CLAIMS } from "../../src/counter/claims.js";
import { CLAIM_STATUS } from "../../src/counter/claim-status.js";
import { Debrief, MissionStatus } from "../../src/counter/FileScreens.jsx";
import { outcomeFor } from "../../src/counter/outcomes.js";
import { PATIENTS, conversationOf } from "../../src/counter/patients.js";
import { CAP_NOTES } from "../../src/counter/tiers.js";
import { play } from "./helpers/tree-walk.js";

afterEach(cleanup);

const [jordan] = PATIENTS;
const RAKE = ["counter.offer-shot", "hesitant.ask-pause", "concern.ask-permission", "concern.offer-facts", "open.next-bus", "today.offer-tdap"];
const noop = () => {};

describe("mission status renders the run's outcome as data", () => {
  it("prints the tier and what it means, the ending, the endings found and each objective's status", () => {
    const outcome = outcomeFor(play("jordan", ...RAKE), jordan);
    const { container } = render(<MissionStatus patient={jordan} outcome={outcome} fresh found={["rake-insurance"]} onContinue={noop} />);
    expect(container.querySelector(".ci-tier-name").textContent).toBe(outcome.tier.label);
    expect(container.querySelector(".ci-tier-means").textContent).toBe(outcome.tier.means);
    expect(container.querySelector(".ci-ending-name").textContent).toBe(outcome.ending.name);
    expect(container.querySelectorAll(".ci-tier-pips i")).toHaveLength(outcome.tier.of);
    expect(container.querySelectorAll(".ci-tier-pips .is-lit")).toHaveLength(outcome.tier.rank);
    expect([...container.querySelectorAll(".ci-status-word")].map((node) => node.textContent)).toEqual(outcome.objectives.map((objective) => objective.status));
    const ledger = container.querySelector(".ci-ledger").textContent;
    expect(ledger, "the file's own, fixed level").toContain("Agent");
    expect(ledger).toContain(`1 / ${conversationOf(jordan).endings.length}`);
    expect(container.querySelector(".ci-new")?.textContent).toBe("New");
  });

  it("marks an ending new only on the run that first finds it", () => {
    const outcome = outcomeFor(play("jordan", "close.bag"), jordan);
    const { container } = render(<MissionStatus patient={jordan} outcome={outcome} fresh={false} found={["just-the-bag"]} onContinue={noop} />);
    expect(container.querySelector(".ci-new")).toBeNull();
  });

  it("renders any outcome it is handed, so the screen never invents its own wording", () => {
    const outcome = {
      tier: { id: "t", label: "A tier from data", means: "What it means, from data.", rank: 2, of: 5 },
      ending: { id: "e", name: "An ending from data", best: true },
      objectives: [{ id: "o", text: "An objective from data.", met: false, status: "A STATUS FROM DATA" }],
    };
    const status = render(<MissionStatus patient={jordan} outcome={outcome} onContinue={noop} />);
    for (const text of ["A tier from data", "What it means, from data.", "An ending from data", "Best case", "An objective from data.", "A STATUS FROM DATA"]) {
      expect(status.container.textContent, text).toContain(text);
    }
    expect(status.container.querySelectorAll(".ci-tier-pips i")).toHaveLength(5);
  });
});

describe("the debrief, one idea to a page", () => {
  it("opens on the transcript, then shows what happened, what moved things, and the sources over their own pages", () => {
    const run = play("jordan", ...RAKE);
    const { container, getByRole } = render(<Debrief patient={jordan} run={run} outcome={outcomeFor(run, jordan)} onContinue={noop} />);
    expect(container.querySelectorAll(".ci-transcript li")).toHaveLength(run.transcript.length);
    expect(container.querySelector(".ci-sources")).toBeNull();

    fireEvent.click(getByRole("tab", { name: "What happened" }));
    expect(container.querySelector(".ci-brief-lead").textContent).toMatch(/flu shot and a tetanus booster/);
    expect(container.querySelector(".ci-transcript")).toBeNull();

    fireEvent.click(getByRole("tab", { name: "What moved it" }));
    expect(container.textContent).toContain("Asking about the pause brought out her real worry.");
    expect(container.querySelector(".ci-transcript")).toBeNull();

    // Sources over 3 a page: the first 3 of Jordan's four claims, then the rest.
    fireEvent.click(getByRole("tab", { name: "Sources" }));
    const pageOne = [...container.querySelectorAll(".ci-sources li")];
    expect(pageOne).toHaveLength(3);
    for (const [index, id] of run.claims.slice(0, 3).entries()) expect(pageOne[index].textContent).toContain(CLAIMS[id].source.title);
    expect(container.textContent).not.toMatch(/pending clinical review by Kevin Madden, PharmD/); // only the last page carries it

    fireEvent.click(getByRole("button", { name: "Next page" }));
    const pageTwo = [...container.querySelectorAll(".ci-sources li")];
    expect(pageTwo).toHaveLength(run.claims.length - 3);
    for (const [index, id] of run.claims.slice(3).entries()) expect(pageTwo[index].textContent).toContain(CLAIMS[id].source.title);
    expect(container.textContent).toMatch(/pending clinical review by Kevin Madden, PharmD/);
    expect(pageTwo[0].querySelector("[data-review-status]").textContent).toBe("Pharmacist review pending");
  });

  it("says kindly why a run that pushed past a no was capped", () => {
    const run = play("jordan", "counter.offer-shot", "hesitant.ask-skip", "declined.push-again");
    const { container, getByRole } = render(<Debrief patient={jordan} run={run} outcome={outcomeFor(run, jordan)} onContinue={noop} />);
    fireEvent.click(getByRole("tab", { name: "What happened" }));
    expect(container.textContent).toContain(CAP_NOTES["pushed-after-no"]);
  });

  it("says there is nothing to cite when no health fact came up", () => {
    const run = play("jordan", "close.bag");
    const { container, getByRole } = render(<Debrief patient={jordan} run={run} outcome={outcomeFor(run, jordan)} onContinue={noop} />);
    fireEvent.click(getByRole("tab", { name: "Sources" }));
    expect(container.textContent).toContain("nothing to cite");
  });

  it("says nothing moved things either way on a quickest-close run with no notes", () => {
    const run = play("jordan", "close.bag");
    const { container, getByRole } = render(<Debrief patient={jordan} run={run} outcome={outcomeFor(run, jordan)} onContinue={noop} />);
    fireEvent.click(getByRole("tab", { name: "What moved it" }));
    expect(container.querySelector(".ci-moved-list")).toBeNull();
    expect(container.textContent).toContain("Nothing moved this one either way.");
  });
});

it('renders every debrief source anchor against its claim manifest with keyboard focus', () => {
  const run = play('jordan', ...RAKE)
  const seen = new Set()
  // Exercise the same rendered component for every manifest entry over real pages.
  for (const id of Object.keys(CLAIMS)) {
    const fixture = { ...run, claims: [id] }
    const view = render(<Debrief patient={jordan} run={fixture} outcome={outcomeFor(fixture, jordan)} onContinue={noop} />)
    fireEvent.click(view.getByRole('tab', { name: 'Sources' }))
    const anchor = view.container.querySelector('a[data-claim-id]')
    expect(anchor.getAttribute('data-claim-id')).toBe(id)
    expect(anchor.getAttribute('href')).toBe(CLAIMS[id].source.url)
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.getAttribute('aria-label')).toContain('opens in a new tab')
    expect(anchor.getAttribute('referrerpolicy')).toBe('no-referrer')
    anchor.focus()
    expect(document.activeElement).toBe(anchor)
    const status = view.container.querySelector('[data-review-status]')
    expect(status.getAttribute('data-review-status')).toBe(CLAIM_STATUS[id].status)
    if (CLAIM_STATUS[id].status === 'approved') {
      expect(status.textContent).toBe(`Pharmacist approved ${CLAIM_STATUS[id].reviewedOn}`)
      expect(view.container.textContent).toContain('approved by Kevin Madden, PharmD')
    } else {
      expect(status.textContent).toBe('Pharmacist review pending')
      expect(view.container.textContent).toContain('pending clinical review by Kevin Madden, PharmD')
    }
    seen.add(id)
    view.unmount()
  }
  expect(seen.size).toBe(24)
})
