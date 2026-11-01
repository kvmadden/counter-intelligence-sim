import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { CLAIMS } from "../../src/counter/claims.js";
import { conversationFor, createRun, optionsFor, takeTurn } from "../../src/counter/engine.js";
import { MISSION_LINE, objectivePrompts } from "../../src/counter/objectives.js";
import { TREES } from "../../src/counter/trees/index.js";
import { walk } from "../unit/helpers/tree-walk.js";

// Counts come from Jordan's tree, so a new ending or a longer cap never breaks a check.
const ENDINGS = Object.keys(TREES.jordan.endings).length;
const CAP = TREES.jordan.maxTurns;
// Jordan's Agent objectives straight from source, so a new objective never breaks a check.
const OBJECTIVES = objectivePrompts("agent", conversationFor("jordan")).map((objective) => objective.text);
// A line's text straight from Jordan's tree, so a copy pass never breaks a check.
const replyOf = (id) => Object.values(TREES.jordan.nodes).flatMap((node) => node.choices).find((choice) => choice.id === id).reply;

const FAMILY_LABEL = { ask: "Ask", offer: "Offer", sit: "Sit with it", close: "Close" };

// The family and the label as it read at that point (an earlier flag can change a
// later line) for each id in a finished run's `taken`, replayed from the top.
function movesFor(patientId, ids) {
  let state = createRun(patientId);
  return ids.map((id) => {
    const found = ["ask", "offer", "sit", "close"]
      .map((family) => ({ family, option: optionsFor(state, family).find((option) => option.id === id) }))
      .find((entry) => entry.option);
    if (!found) throw new Error(`"${id}" is not a legal move at this point in the run`);
    state = takeTurn(state, id, state.revision);
    return { family: found.family, label: found.option.label };
  });
}

// Rewritten for the branching conversation engine (Kevin, 2026-09-15): Jordan's tree
// in src/counter/trees/jordan.js, run by the generic reducer in src/counter/engine.js.
// There are no takes or variants any more, only nodes, choices and named endings.
// The paths below are walked straight off that tree, not invented.

// Any console error or uncaught page error fails the test that caused it, the
// file:// standalone test included: a shader that fails to compile logs one.
const problems = new WeakMap();
test.beforeEach(async ({ page }) => {
  const seen = [];
  problems.set(page, seen);
  page.on("console", (message) => { if (message.type() === "error") seen.push(`console.error: ${message.text()}`); });
  page.on("pageerror", (error) => seen.push(`pageerror: ${error.message}`));
});
test.afterEach(async ({ page }) => {
  expect(problems.get(page) ?? [], "console errors or page errors").toEqual([]);
});

// The flow (Kevin, 2026-09-15): SELECT FILE -> dossier -> briefing -> encounter.
async function begin(page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Jordan/ }).click();
  await page.getByRole("button", { name: /Mission brief/i }).click();
  await page.getByRole("button", { name: "Accept" }).click();
}

// One exchange: open a move family, then take one of its lines by its exact label.
async function move(page, family, label) {
  await page.getByRole("button", { name: family, exact: true }).click();
  await page.getByRole("button", { name: label, exact: true }).click();
}

// Offer the shot, then decline once. Jordan says not today, and this is the shared
// opening half of both the graceful-no and the pushed-after-no paths below.
async function declineOnce(page) {
  await move(page, "Offer", "Not long. Want your flu shot while you're here?");
  await move(page, "Ask", "Want to skip it for today?");
}

// The quickest path through the file: close before the shot ever comes up.
async function quickestClose(page) {
  await move(page, "Close", "Here's your bag. Have a good one!");
}

// Every exchange Jordan allows (her cap is 8) with no ending, so the bus arrives.
async function playToTimeout(page) {
  await move(page, "Ask", "How long have you got?");
  await move(page, "Offer", "Want a flu shot before the 14?");
  await move(page, "Offer", "We'd have you sit about fifteen minutes after. Next 14 instead?");
  await move(page, "Ask", "What is it, then?");
  await move(page, "Sit with it", "(Nod, and let her finish.)");
  await move(page, "Ask", "Can I tell you what usually causes that?");
  await move(page, "Offer", "The shot can't give you flu. Feeling achy after is common, and minor.");
  await move(page, "Offer", "It takes about two weeks to kick in, and flu usually peaks in winter.");
}

test("keeps controls operable without horizontal overflow", async ({ page }) => {
  await begin(page);
  const geometry = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    tooSmall: [...document.querySelectorAll("button")].some((button) => {
      const rect = button.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }),
  }));
  expect(geometry).toEqual({ overflow: false, tooSmall: false });
  // Sit with it has nothing to say at the opening counter, and only wakes up once she hesitates.
  await expect(page.getByRole("button", { name: "Sit with it", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ask", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "How long have you got?", exact: true })).toBeVisible();
});

test("replaces the move tray with choices so the scene and dialogue stay in place", async ({ page }) => {
  await begin(page);
  const dialogueTop = await page.locator(".enc-dialogue").evaluate((element) => element.getBoundingClientRect().top);
  await page.getByRole("button", { name: "Ask", exact: true }).click();

  await expect(page.getByRole("button", { name: "All moves" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Offer", exact: true })).toHaveCount(0);
  expect(await page.locator(".enc-dialogue").evaluate((element) => element.getBoundingClientRect().top)).toBe(dialogueTop);
});

// Kevin, 2026-09-15: difficulty is static per patient. Each file carries one level,
// printed on it, there is no difficulty select, and the objectives are that level's.
test("prints each file's fixed level and endings found, offers no difficulty choice, and the Rx handheld carries that level's objectives", async ({ page }) => {
  await page.goto("/");
  const files = page.getByRole("list", { name: "Patient files" }).getByRole("button");
  // Every file on record, each printed with its one ruled level (Kevin, 2026-09-16:
  // the pyramid), and nothing pads the list.
  await expect(files).toHaveCount(5);
  await expect(page.locator(".ci-folder-name")).toHaveText(["Jordan", "Priya", "Sam", "Walt", "Marcus"]);
  await expect(page.locator(".ci-folder-level")).toHaveText(["Agent", "Agent", "Secret Agent", "Secret Agent", "00 Agent"]);
  await expect(files.first()).toHaveAccessibleName(`Jordan. Agent level. 0 of ${ENDINGS} endings found.`);
  await expect(page.locator(".ci-folder-endings").first()).toHaveText(`Endings 0/${ENDINGS}`);
  // No difficulty choice anywhere. Past SELECT FILE, Jordan's screens name no other level.
  const noChoice = async (where, { otherLevels = true } = {}) => {
    if (otherLevels) await expect(page.getByText(/Secret Agent|00 Agent/), where).toHaveCount(0);
    await expect(page.locator('[role="radio"], [aria-pressed], select'), where).toHaveCount(0);
  };
  await noChoice("select file", { otherLevels: false });

  await files.first().click();
  await expect(page.locator(".ci-level-print")).toHaveText(/Level\s*Agent/);
  await expect(page.locator(".ci-endings-print")).toHaveText(`Endings found · 0 of ${ENDINGS}`);
  await noChoice("dossier");

  await page.getByRole("button", { name: /Mission brief/i }).click();
  await page.getByRole("tab", { name: "Objectives" }).click();
  await expect(page.locator(".ci-brief-page")).toContainText(MISSION_LINE);
  await expect(page.locator(".ci-objective-list li")).toHaveText(OBJECTIVES.map((text, index) => `${"abcdefghij"[index]}.${text}`));
  await noChoice("briefing");

  await page.getByRole("button", { name: "Accept" }).click();
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  const handheld = page.getByRole("dialog", { name: "Rx handheld" });
  await expect(handheld.getByRole("heading", { name: "OBJECTIVES · AGENT" })).toBeVisible();
  await expect(handheld.locator(".enc-lcd-objectives li")).toHaveText(OBJECTIVES);
  await handheld.getByRole("button", { name: "RESUME" }).click();
  await expect(handheld).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Rx handheld/i })).toBeFocused();
});

test("reads the briefing as tabbed pages, by pointer and by keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Jordan/ }).click();
  await page.getByRole("button", { name: /Mission brief/i }).click();
  const tabs = page.getByRole("tablist", { name: "Briefing pages" }).getByRole("tab");
  await expect(tabs).toHaveText(["Situation", "Objectives", "Why it matters"]);
  await expect(page.getByRole("tabpanel")).toContainText(TREES.jordan.briefing);
  await tabs.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(tabs.nth(1)).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Agent objectives");
  await page.keyboard.press("End");
  await expect(page.getByRole("tabpanel")).toContainText("How you open a conversation shapes what someone tells you.");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("dossier-screen")).toBeVisible();
});

// The best case Kevin named in the brief: heard first, asked permission first, and
// both vaccines fit in one visit. Six exchanges, so it also proves the top tier only
// comes from the outcome AND how it was reached (tiers.js).
test("reaches mission status through the best case, marked Best case and New at rank 6 of 6, then the debrief and the huddle", async ({ page }) => {
  await begin(page);
  await move(page, "Offer", "Not long. Want your flu shot while you're here?");
  await move(page, "Ask", "Is it the bus, or is it something else?");
  await move(page, "Ask", "Can I tell you what usually causes that?");
  await move(page, "Offer", "The shot can't give you flu. Feeling achy after is common, and minor.");
  await move(page, "Offer", "Catch the next 14? We'd have you sit about fifteen minutes after.");
  await move(page, "Offer", "Want a COVID-19 vaccine too? It's your call, and both fit in one visit.");

  const status = page.getByTestId("status-screen");
  await expect(status.getByRole("heading", { name: "Mission status" })).toBeVisible();
  await expect(status.locator(".ci-ending-name")).toHaveText("Two for one");
  await expect(status.locator(".ci-best")).toHaveText("Best case");
  await expect(status.locator(".ci-new")).toHaveText("New");
  await expect(status.locator(".ci-tier-pips")).toHaveAttribute("aria-label", "Rank 6 of 6");
  await expect(status.locator(".ci-tier-name")).toHaveText("I'm telling everyone about this pharmacist.");
  await expect(status.locator(".ci-tier-means")).toHaveText("A best case, reached by listening first.");
  await expect(status.locator(".ci-status-list li")).toHaveCount(OBJECTIVES.length); // Jordan's file is the Agent level
  await expect(status.locator(".ci-ledger > div").filter({ hasText: "Endings found" }).locator("dd")).toHaveText(`1 / ${ENDINGS}`);
  await status.getByRole("button", { name: "Continue" }).click();

  const debrief = page.getByTestId("debrief-screen");
  await expect(debrief.locator(".ci-ending-name")).toHaveText("Two for one");
  await expect(debrief.locator(".ci-transcript li")).toHaveCount(13); // the opener, then six exchanges
  await debrief.getByRole("button", { name: "Continue" }).click();

  const huddle = page.getByTestId("huddle-screen");
  await expect(huddle.getByRole("heading", { name: "Talk about it" })).toBeVisible();
  const promptPx = await huddle.locator(".ci-card-prompt").evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(promptPx, "big enough to read across a room").toBeGreaterThanOrEqual(28);
  await huddle.getByRole("button", { name: /Select file/ }).click();

  const files = page.getByRole("list", { name: "Patient files" }).getByRole("button");
  await expect(files.first()).toHaveAccessibleName(`Jordan. Agent level. 1 of ${ENDINGS} endings found.`);
  await expect(page.locator(".ci-folder-endings").first()).toHaveText(`Endings 1/${ENDINGS}`);
});

// Kevin's two rules over every path (tiers.js): a pushed yes never outranks a
// respectful not-today, and pushing after a no caps the tier at the bottom rung.
test("ranks a graceful no above pushing past it, with the kind cap note only on the pushed run's debrief", async ({ page }) => {
  await begin(page);
  await declineOnce(page);
  await move(page, "Close", "Totally fair. We're here all season if you change your mind.");

  const graceStatus = page.getByTestId("status-screen");
  await expect(graceStatus.locator(".ci-ending-name")).toHaveText("Door left open");
  await expect(graceStatus.locator(".ci-tier-pips")).toHaveAttribute("aria-label", "Rank 4 of 6");
  await graceStatus.getByRole("button", { name: "Continue" }).click();
  const graceDebrief = page.getByTestId("debrief-screen");
  await graceDebrief.getByRole("tab", { name: "What happened" }).click();
  await expect(graceDebrief.locator(".ci-brief-note")).toHaveCount(0);

  await begin(page);
  await declineOnce(page);
  await move(page, "Offer", "Are you sure? It's really, really quick.");

  const pushStatus = page.getByTestId("status-screen");
  await expect(pushStatus.locator(".ci-ending-name")).toHaveText("Exit, pursued by a pharmacist");
  await expect(pushStatus.locator(".ci-tier-pips")).toHaveAttribute("aria-label", "Rank 1 of 6");
  await pushStatus.getByRole("button", { name: "Continue" }).click();
  const pushDebrief = page.getByTestId("debrief-screen");
  await pushDebrief.getByRole("tab", { name: "What happened" }).click();
  await expect(pushDebrief.locator(".ci-brief-note")).toHaveText("After a no, the pitch kept going. Taking a no gracefully is what brings people back.");
});

// The endings-found list lives in React memory only (the partners' guardrail): no
// storage, no export, and a reload starts fresh.
test("counts endings found this session, skips the New mark on a repeat, and forgets everything on reload", async ({ page }) => {
  await begin(page);
  await quickestClose(page);
  const firstStatus = page.getByTestId("status-screen");
  await expect(firstStatus.locator(".ci-ending-name")).toHaveText("Just the bag");
  await expect(firstStatus.locator(".ci-new")).toHaveText("New");
  await expect(firstStatus.locator(".ci-ledger > div").filter({ hasText: "Endings found" }).locator("dd")).toHaveText(`1 / ${ENDINGS}`);
  await firstStatus.getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("debrief-screen").getByRole("button", { name: "Continue" }).click();
  await page.getByTestId("huddle-screen").getByRole("button", { name: /Select file/ }).click();

  const files = page.getByRole("list", { name: "Patient files" }).getByRole("button");
  await expect(files.first()).toHaveAccessibleName(`Jordan. Agent level. 1 of ${ENDINGS} endings found.`);
  await expect(page.locator(".ci-folder-endings").first()).toHaveText(`Endings 1/${ENDINGS}`);
  await files.first().click();
  await expect(page.locator(".ci-endings-print")).toHaveText(`Endings found · 1 of ${ENDINGS}`);

  await page.getByRole("button", { name: /To the counter/ }).click();
  await quickestClose(page);
  const secondStatus = page.getByTestId("status-screen");
  await expect(secondStatus.locator(".ci-ending-name")).toHaveText("Just the bag");
  await expect(secondStatus.locator(".ci-new")).toHaveCount(0);
  await expect(secondStatus.locator(".ci-ledger > div").filter({ hasText: "Endings found" }).locator("dd")).toHaveText(`1 / ${ENDINGS}`);

  await page.reload();
  const freshFiles = page.getByRole("list", { name: "Patient files" }).getByRole("button");
  await expect(freshFiles.first()).toHaveAccessibleName(`Jordan. Agent level. 0 of ${ENDINGS} endings found.`);
});

test("reads the debrief as tabbed pages, by pointer and by keyboard, and lists its CDC sources with their review status", async ({ page }) => {
  await begin(page);
  await move(page, "Offer", "Not long. Want your flu shot while you're here?");
  await move(page, "Ask", "Is it the bus, or is it something else?");
  await move(page, "Ask", "Can I tell you what usually causes that?");
  await move(page, "Offer", "The shot can't give you flu. Feeling achy after is common, and minor.");
  await move(page, "Offer", "Catch the next 14? We'd have you sit about fifteen minutes after.");
  await move(page, "Offer", "Want a COVID-19 vaccine too? It's your call, and both fit in one visit.");
  await page.getByTestId("status-screen").getByRole("button", { name: "Continue" }).click();

  const debrief = page.getByTestId("debrief-screen");
  const tabs = debrief.getByRole("tablist", { name: "Debrief pages" }).getByRole("tab");
  await expect(tabs).toHaveText(["Transcript", "What happened", "What moved it", "Sources"]);
  await expect(debrief.locator(".ci-ending-name")).toHaveText("Two for one");

  await tabs.nth(1).click();
  await expect(debrief.getByRole("tabpanel")).toContainText("Jordan caught the next 14 with a flu shot and a COVID-19 vaccine.");

  await page.keyboard.press("End");
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
  await expect(tabs.last()).toBeFocused();
  // Sources page over 3 a page (Kevin's ruling): the first 3 of 5, then the rest.
  await expect(debrief.locator(".ci-kicker")).toHaveText("Sources · 1 of 2");
  await expect(debrief.locator(".ci-sources li")).toHaveCount(3);
  await expect(debrief.locator(".ci-source-org").first()).toHaveText("CDC");
  for (const anchor of await debrief.locator('a[data-claim-id]').all()) {
    const id = await anchor.getAttribute('data-claim-id')
    await expect(anchor).toHaveAttribute('href', CLAIMS[id].source.url)
    await expect(anchor).toHaveAttribute('rel', 'noopener noreferrer')
    await anchor.focus()
    await expect(anchor).toBeFocused()
  }
  // Historical stamps do not count as the new content-bound support review.
  const cited = ["flu-cannot-cause-flu", "flu-side-effects", "sit-after", "covid-personal-call", "same-visit"];
  const reviewText = "Clinical review by Kevin Madden, PharmD pending";
  await expect(debrief.getByText(reviewText, { exact: false })).toHaveCount(0); // only the last page carries it
  await debrief.getByRole("button", { name: "Next page" }).click();
  await expect(debrief.locator(".ci-kicker")).toHaveText("Sources · 2 of 2");
  await expect(debrief.locator(".ci-sources li")).toHaveCount(2);
  await expect(debrief.getByText(reviewText, { exact: false })).toBeVisible();

  await tabs.last().focus();
  await page.keyboard.press("Home");
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await expect(debrief.locator(".ci-ending-name")).toHaveText("Two for one");
});

test("shows nothing to cite on the debrief's Sources page after the quickest close", async ({ page }) => {
  await begin(page);
  await quickestClose(page);
  await page.getByTestId("status-screen").getByRole("button", { name: "Continue" }).click();

  const debrief = page.getByTestId("debrief-screen");
  await debrief.getByRole("tab", { name: "Sources" }).click();
  await expect(debrief.locator(".ci-sources")).toHaveCount(0);
  await expect(debrief.getByText("No health facts came up in this conversation, so there is nothing to cite.")).toBeVisible();
});

// Kevin's ruling (the design notes): a page too long to fit splits
// into more pages, never a scroll. This plays Jordan's heaviest run straight off
// the tree walk (the finished run with the most sources, then the most notes) and
// checks mission status and every page of every debrief tab at both real Safari
// sizes. It also holds the dossier and mission-status stamps clear of a control,
// and the 13px type floor across every screen this run visits.
// Mirrors FileScreens.jsx's SOURCES_PER_PAGE. The guard can't import that module
// (it pulls in patients.js, which imports a JPG the Node-side loader can't parse,
// the same constraint already documented above for TREES/CLAIMS/objectivePrompts),
// so this is a second, hand-kept copy. Keep it in sync by hand.
const SOURCES_PER_PAGE = 3;

// The runs worth playing for a patient: not just the biggest, but the ones that
// land on a page at its worst. `fullLastSourcesPage` ends its Sources tab on a
// completely full last page (a multiple of SOURCES_PER_PAGE) carrying the review
// note too. `pushedAfterNoRun` is capped for pushing after a no, so What happened
// carries both the summary and the kind cap note. `mostNotes` is the run with the
// most rows on What moved it. Any that doesn't exist for this patient is null.
function worstPageRuns(patientId) {
  const { finished } = walk(patientId);
  const mostNotes = finished.reduce((best, run) => (run.notes.length > best.notes.length ? run : best));
  const fullLastSourcesPage = finished
    .filter((run) => run.claims.length > 0 && run.claims.length % SOURCES_PER_PAGE === 0)
    .reduce((best, run) => (!best || run.claims.length > best.claims.length ? run : best), null);
  const pushedAfterNoRun = finished.find((run) => run.pushedAfterNo) ?? null;
  return { mostNotes, fullLastSourcesPage, pushedAfterNoRun };
}

test("fits the worst page of every tree: no page scroll on mission status or any debrief page, Continue always in view, no stamp over a control or over the dossier's name, level or endings line, no text under 13px", async ({ page }) => {
  const readMetrics = () => page.evaluate(() => {
    const rectsOverlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const stamp = document.querySelector(".ci-dossier-stamp, .ci-tier-stamp");
    // Controls, plus the dossier's own name/level/endings text: the stamp may never
    // cross any of them either.
    const controls = [...document.querySelectorAll("button, .ci-ledger dd, .ci-status-list li, .ci-menu-item, .ci-dossier-id h1, .ci-level-print, .ci-endings-print")];
    const continueButton = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Continue");
    const continueRect = continueButton?.getBoundingClientRect();
    // The stamp never hangs past the sheet's own text column either.
    const sheet = document.querySelector(".ci-sheet")?.getBoundingClientRect();
    const stampRect = stamp?.getBoundingClientRect();
    return {
      scroll: document.scrollingElement.scrollHeight - window.innerHeight,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      continueInView: continueRect ? (continueRect.top >= 0 && continueRect.left >= 0 && continueRect.bottom <= innerHeight && continueRect.right <= innerWidth) : true,
      stampOverlap: stamp ? controls.some((el) => el !== stamp && rectsOverlap(stampRect, el.getBoundingClientRect())) : false,
      stampOutOfBounds: stamp && sheet ? (stampRect.left < sheet.left - 0.5 || stampRect.right > sheet.right + 0.5) : false,
      small: [...new Set([
        ...[...document.querySelectorAll("body *")].filter((el) => {
          const ownText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
          const rect = el.getBoundingClientRect();
          // SVG lettering is left out here. The stamps are measured below.
          return ownText && !(el instanceof SVGElement) && rect.width > 0 && rect.height > 0 && parseFloat(getComputedStyle(el).fontSize) < 13;
        }).map((el) => `${parseFloat(getComputedStyle(el).fontSize)}px .${String(el.className).split(" ")[0] || el.tagName.toLowerCase()}`),
        // The stamps are real text drawn in an SVG scaled to its box, so each letter's
        // size is its font size in viewBox units times the SVG's on-screen scale (the
        // hypotenuse, so a tilted stamp is measured true). They hold the floor too.
        ...[...document.querySelectorAll(".ci-stamp text")].map((el) => {
          const ctm = el.ownerSVGElement.getScreenCTM();
          return parseFloat(el.getAttribute("font-size")) * Math.hypot(ctm.c, ctm.d);
        }).filter((px) => px < 13).map((px) => `${px.toFixed(1)}px .ci-stamp text`),
      ])],
    };
  });
  // No page scroll and Continue in view: mission status and every debrief page only
  // (the brief's guard). The stamp and the 13px floor are checked everywhere this
  // run's walkthrough goes.
  const checkFit = async (where) => {
    await page.evaluate(() => document.fonts.ready);
    const m = await readMetrics();
    expect(m.overflow, `${where}: nothing wider than the screen`).toBe(false);
    expect(m.scroll, `${where}: no page scroll`).toBeLessThanOrEqual(0);
    expect(m.continueInView, `${where}: Continue fully in view`).toBe(true);
    expect(m.stampOverlap, `${where}: the stamp never covers a control or the dossier's name, level or endings`).toBe(false);
    expect(m.stampOutOfBounds, `${where}: the stamp never hangs past the sheet`).toBe(false);
    expect(m.small, `${where}: 13px floor`).toEqual([]);
  };
  const checkTypeOnly = async (where) => {
    await page.evaluate(() => document.fonts.ready);
    const m = await readMetrics();
    expect(m.stampOverlap, `${where}: the stamp never covers a control or the dossier's name, level or endings`).toBe(false);
    expect(m.stampOutOfBounds, `${where}: the stamp never hangs past the sheet`).toBe(false);
    expect(m.small, `${where}: 13px floor`).toEqual([]);
  };
  // Pages through every "Next page" a screen offers, checking fit after each.
  const pageThrough = async (scope, label) => {
    await checkFit(label);
    let guard = 0;
    while (await scope.getByRole("button", { name: "Next page" }).count()) {
      await scope.getByRole("button", { name: "Next page" }).click();
      await checkFit(`${label} (next page)`);
      if (++guard > 10) throw new Error(`"Next page" never ran out on ${label}`);
    }
  };

  await page.goto("/");
  await checkTypeOnly("select file");

  // Every tree in TREES, so the next patients' files are checked the moment their
  // trees land, with no line here to remember to change.
  for (const patientId of Object.keys(TREES)) {
    const runs = Object.entries(worstPageRuns(patientId)).filter(([, run]) => run);
    for (const [criterion, run] of runs) {
      const moves = movesFor(patientId, run.taken);
      const scene = `${patientId} (${criterion})`;
      const isFirstRunForThisPatient = runs[0][0] === criterion;

      await page.goto("/");
      await page.getByRole("button", { name: new RegExp(TREES[patientId].patient) }).click();
      if (isFirstRunForThisPatient) await checkTypeOnly(`${patientId}: dossier`);
      await page.getByRole("button", { name: /Mission brief/i }).click();
      if (isFirstRunForThisPatient) {
        for (const tab of ["Situation", "Objectives", "Why it matters"]) {
          await page.getByRole("tab", { name: tab }).click();
          await checkTypeOnly(`${patientId}: briefing: ${tab}`);
        }
      }
      await page.getByRole("button", { name: "Accept" }).click();

      for (const { family, label } of moves) await move(page, FAMILY_LABEL[family], label);
      await pageThrough(page.getByTestId("status-screen"), `${scene}: mission status`);
      await page.getByTestId("status-screen").getByRole("button", { name: "Continue" }).click();

      const debrief = page.getByTestId("debrief-screen");
      // Read the tabs from the tablist rather than a hard-coded list, so a renamed
      // or reordered tab is still walked correctly.
      const tabLabels = await debrief.getByRole("tablist", { name: "Debrief pages" }).getByRole("tab").allTextContents();
      for (const tabLabel of tabLabels) {
        await debrief.getByRole("tab", { name: tabLabel, exact: true }).click();
        await pageThrough(debrief, `${scene}: debrief: ${tabLabel}`);
      }
      await debrief.getByRole("button", { name: "Continue" }).click();
      await checkTypeOnly(`${scene}: huddle`);
    }
  }
});

// One idea per screen, and every screen fits: this walks all of them.
test("walks every screen with no page scroll, nothing wider than the screen, and every control at least 44px", async ({ page }, testInfo) => {
  const fits = async (where) => {
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => ({
      scroll: document.scrollingElement.scrollHeight - window.innerHeight,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      small: [...document.querySelectorAll("button")].filter((button) => {
        const box = button.getBoundingClientRect();
        return box.width < 44 || box.height < 44;
      }).map((button) => button.textContent.trim() || button.getAttribute("aria-label")),
    }));
    expect(m.overflow, `${where}: nothing wider than the screen`).toBe(false);
    expect(m.small, `${where}: 44px controls`).toEqual([]);
    expect(m.scroll, `${where}: no page scroll`).toBeLessThanOrEqual(0);
  };
  await page.goto("/");
  await fits("select file");
  await page.getByRole("button", { name: /Jordan/ }).click();
  await fits("dossier");
  await page.getByRole("button", { name: /Mission brief/i }).click();
  for (const tab of ["Situation", "Objectives", "Why it matters"]) {
    await page.getByRole("tab", { name: tab }).click();
    await fits(`briefing: ${tab}`);
  }
  await page.getByRole("button", { name: "Accept" }).click();
  await fits("encounter");
  // The longest transcript there is: every exchange Jordan allows, ending at the timeout.
  await playToTimeout(page);
  await fits("mission status");
  await page.getByRole("button", { name: "Continue" }).click();
  await fits("debrief");
  await page.getByRole("button", { name: "Continue" }).click();
  await fits("talk about it");
});

// Kevin, 2026-09-15: a run ends gently at the turn cap, with the patient's own last
// line, and lands wherever the flags after that line say (tiers.js, tree.timeout).
test(`ends the run on its own after exchange ${CAP} and lands on mission status naming The 14 wins`, async ({ page }) => {
  await begin(page);
  await playToTimeout(page);

  const status = page.getByTestId("status-screen");
  await expect(status.getByRole("heading", { name: "Mission status" })).toBeVisible();
  await expect(status.locator(".ci-ending-name")).toHaveText("The 14 wins");
  await status.getByRole("button", { name: "Continue" }).click();
  const debrief = page.getByTestId("debrief-screen");
  await expect(debrief.locator(".ci-transcript li").last().locator(".ci-transcript-line")).toHaveText("Oh no. That's the 14. I have to run!");
});

test("raises the Rx handheld into view held in the player's hand, and simply shows it under reduced motion", async ({ page }) => {
  await begin(page);
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  const handheld = page.locator(".enc-handheld");
  const motion = await handheld.evaluate((element) => {
    const style = getComputedStyle(element);
    return { name: style.animationName, seconds: parseFloat(style.animationDuration) };
  });
  expect(motion.name, "the handheld is raised").toBe("enc-raise");
  expect(motion.seconds).toBeGreaterThan(0);
  expect(motion.seconds, "one short step, never a loop").toBeLessThanOrEqual(0.6);
  await expect(page.locator(".enc-forearm")).toBeVisible();
  // The fill holds the last frame: no transform at all, or its identity matrix.
  await expect.poll(() => handheld.evaluate((element) => getComputedStyle(element).transform), { message: "settles flat, in place" }).toMatch(/^(?:none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await page.keyboard.press("Escape");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  await expect(page.getByRole("dialog", { name: "Rx handheld" })).toBeVisible();
  for (const selector of [".enc-handheld", ".enc-handheld-scrim"]) {
    expect(await page.locator(selector).evaluate((element) => getComputedStyle(element).animationName), selector).toBe("none");
  }
});

// Kevin, 2026-09-15: the decorative sleeve overlaps the dimmed scrim below the
// device, and it must stay pointer-events: none. That was a real bug with the old
// forearm: a tap where the arm graphic overlapped the scrim was swallowed by the
// dialog instead of closing it. No hand is drawn any more (Kevin chose the sleeve
// alone), so one tap on the wrist just below the case covers it.
test("taps the scrim where the raised sleeve overlaps it, and returns to the encounter", async ({ page }) => {
  await begin(page);
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  const handheld = page.getByRole("dialog", { name: "Rx handheld" });
  await expect(handheld).toBeVisible();
  // Wait for the raise to settle: mid-animation the case is rotated and scaled,
  // so its bounding box does not yet reflect where it finally sits.
  await expect.poll(() => handheld.evaluate((element) => getComputedStyle(element).transform), { message: "settles flat, in place" }).toMatch(/^(?:none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  const spot = await page.evaluate(() => {
    const kase = document.querySelector(".enc-handheld-case").getBoundingClientRect();
    const sleeve = document.querySelector(".enc-forearm").getBoundingClientRect();
    // The wrist, just below the case. The sleeve is clipped to a trapezoid (22% to
    // 78% of its box at the top edge), so the tap has to sit inside that clip, not
    // just inside the box.
    const wrist = { x: kase.left + kase.width / 2, y: kase.bottom + 6 };
    const inset = sleeve.width * 0.22;
    return {
      wrist,
      onScreen: wrist.x > 0 && wrist.x < innerWidth && wrist.y < innerHeight,
      insideTheClip: wrist.x > sleeve.left + inset && wrist.x < sleeve.right - inset && wrist.y > sleeve.top && wrist.y < sleeve.bottom,
      // Nothing painted above the scrim may take that tap. With pointer-events none
      // on the sleeve, the scrim itself is what a tap there reaches.
      reachesTheScrim: document.elementFromPoint(wrist.x, wrist.y)?.classList.contains("enc-handheld-scrim") === true,
      noHand: document.querySelector('.enc-hand, [class*="enc-hand-"]') === null,
    };
  });
  expect(spot, "the tap lands on the sleeve below the device, on screen, and reaches the scrim").toMatchObject({ onScreen: true, insideTheClip: true, reachesTheScrim: true, noHand: true });
  await page.mouse.click(spot.wrist.x, spot.wrist.y);
  await expect(handheld).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Rx handheld/i })).toBeFocused();
});

test("keeps one turn after rapid tapping and survives a background-like visibility event at enlarged text", async ({ page }) => {
  await begin(page);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  const timing = page.getByRole("button", { name: "How long have you got?", exact: true });
  await timing.dblclick();
  await expect(page.getByText(`Exchange 2 / ${CAP}`)).toBeVisible();

  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    document.documentElement.style.fontSize = "20px";
  });
  await expect(page.locator(".enc-line")).toHaveText(replyOf("counter.ask-time"));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("fits the encounter to the screen: the scene gets real space, no page scroll, no empty band", async ({ page }) => {
  await begin(page);
  await expect(page.locator(".enc-scene")).toHaveAttribute("data-scene", /^(webgl|fallback)$/);
  const measure = () => page.evaluate(() => {
    const deck = document.querySelector(".enc-deck").getBoundingClientRect();
    const scene = document.querySelector(".enc-viewport").getBoundingClientRect();
    return { scroll: document.scrollingElement.scrollHeight - window.innerHeight, gapBelowDeck: window.innerHeight - deck.bottom, sceneShare: scene.height / window.innerHeight };
  });
  const moves = await measure();
  // The tallest three-choice list there is: the Offer family once she hesitates.
  await page.getByRole("button", { name: "Offer", exact: true }).click();
  await page.getByRole("button", { name: "Not long. Want your flu shot while you're here?", exact: true }).click();
  await page.getByRole("button", { name: "Offer", exact: true }).click();
  await expect(page.locator(".enc-choice")).toHaveCount(3);
  const choices = await measure();
  for (const [state, m] of [["moves", moves], ["choices", choices]]) {
    expect(m.scroll, state).toBeLessThanOrEqual(0);
    expect(m.gapBelowDeck, state).toBeLessThanOrEqual(1);
    expect(m.sceneShare, state).toBeGreaterThan(0.4);
  }
});

test("opens the Rx handheld: status, what she's shared, and the counting tray on its screen, one control back to the encounter", async ({ page }) => {
  await begin(page);
  // The encounter itself carries only the scene, the line and the moves.
  await expect(page.locator(".enc-column")).not.toContainText(/SHARED OUT LOUD|OBJECTIVES/i);
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  const handheld = page.getByRole("dialog", { name: "Rx handheld" });
  await expect(handheld.locator(".enc-lcd-shared li")).toHaveText(["Nothing yet."]);
  await page.keyboard.press("Escape");
  await expect(handheld).toHaveCount(0);

  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByRole("button", { name: "How long have you got?", exact: true }).click();
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  await expect(handheld).toBeVisible();
  // Shipped class and id names stay neutral: no ge- prefix that decodes as the homage source.
  expect(await page.evaluate(() => document.querySelectorAll('[class^="ge-"], [class*=" ge-"], [id^="ge-"]').length)).toBe(0);
  // Rendered text, so a CSS uppercase would fail it: capital R, lowercase x.
  expect(await handheld.locator(".enc-lcd-title").innerText()).toBe("Rx HANDHELD v2.01 BETA");
  await expect(handheld.locator(".enc-lcd-status")).toHaveText("MISSION STATUS: IN PROGRESS");
  await expect(handheld.locator(".enc-lcd-shared li")).toHaveText(["“My bus is in ten minutes.”"]);
  // Kevin, 2026-09-15: the heading is just "SHARED OUT LOUD", nothing on the handheld says INTEL.
  await expect(handheld.getByRole("heading", { name: /SHARED OUT LOUD/ })).toHaveText("SHARED OUT LOUD");
  await expect(handheld).not.toContainText(/intel/i);
  expect(await handheld.locator(".enc-lcd-gadget").innerText()).not.toMatch(/\d/); // the counting tray carries no number
  await expect(handheld.getByRole("button")).toHaveText(["RESUME"]); // no dead ABORT or CONFIRM
  expect(await handheld.innerText()).not.toMatch(/\bscore|\bgrade|percent|%|\brank|\bpass(ed)?\b|\bfail(ed)?\b|\btarget|\bsuspect|laser/i);
  await page.keyboard.press("Escape");
  await expect(handheld).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Rx handheld/i })).toBeFocused();
});

test("plays the standalone file over file:// with zero network requests and its licence notices aboard", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone-portrait-430x932", "one phone is enough for the offline proof");
  const file = path.resolve("dist/counter-intelligence.html");
  const html = fs.readFileSync(file, "utf8");
  // The licences travel whole: the full MIT text for the dither port, three.js and React,
  // and the full SIL Open Font License with every bundled font's copyright.
  for (const notice of [
    "Copyright (c) 2020 MenacingMecha", "Lucas Rodrigues, Witty Cognomen",
    "Copyright © 2010-2026 three.js authors", "Copyright (c) Facebook, Inc. and its affiliates.",
    "SIL OPEN FONT LICENSE Version 1.1", "OTHER DEALINGS IN THE FONT SOFTWARE.",
    "The Michroma Project Authors", "Carrois Type Design", "The Oxanium Project Authors",
  ]) expect(html, notice).toContain(notice);
  expect(html.match(/Permission is hereby granted, free of charge/g)?.length ?? 0, "whole MIT texts").toBeGreaterThanOrEqual(3);
  expect(html, "no house type rides along (Kevin, 2026-09-15: unbranded)").not.toMatch(/IBM Plex|IBM Corp/);
  // The file photo travels inside the standalone file; the 1024px source it is cut from does not.
  const leadingBytes = (asset) => fs.readFileSync(path.resolve("src/counter/assets", asset)).subarray(0, 3000).toString("base64");
  expect(html.includes(leadingBytes("patient-portrait.jpg")), "the file photo is inlined").toBe(true);
  expect(html.includes(leadingBytes("patient-face-photo.png")), "the source photo is not").toBe(false);
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("websocket", (socket) => requests.push(socket.url()));
  await page.goto(pathToFileURL(file).href);
  await page.getByRole("button", { name: /Jordan/ }).click();
  await page.getByRole("button", { name: /To the counter/ }).click();
  await expect(page.locator(".enc-scene")).toHaveAttribute("data-scene", "webgl");
  const drawCalls = Number(await page.locator(".enc-scene").getAttribute("data-draw-calls"));
  expect(drawCalls).toBeGreaterThan(0);
  expect(drawCalls).toBeLessThanOrEqual(40); // keep the N64 scene cheap on phones
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  await expect(page.getByRole("dialog", { name: "Rx handheld" })).toBeVisible();
  expect(requests.length).toBeGreaterThan(0); // the listener saw the page itself load
  expect(requests.filter((url) => !/^(file|data|blob):/i.test(url))).toEqual([]);
});

test("brings the scene back when the WebGL context returns, as after an iPhone background and resume", async ({ page }) => {
  await begin(page);
  const scene = page.locator(".enc-scene");
  await expect(scene).toHaveAttribute("data-scene", "webgl");
  await page.evaluate(() => {
    const gl = document.querySelector(".enc-scene-canvas").getContext("webgl2");
    window.__loseContext = gl.getExtension("WEBGL_lose_context");
    window.__loseContext.loseContext();
  });
  await expect(scene).toHaveAttribute("data-scene", "fallback");
  await page.evaluate(() => window.__loseContext.restoreContext());
  await expect(scene).toHaveAttribute("data-scene", "webgl");
  // After the restore, a resize and then leaving the encounter both dispose GPU objects.
  // Neither may touch the lost context's handles: WebKit logs every such delete as an
  // error, and the after-each check fails on it.
  const size = page.viewportSize();
  await page.setViewportSize({ width: size.width, height: size.height - 48 });
  // The conversation carries on in the scene, not on the fallback.
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByRole("button", { name: "How long have you got?", exact: true }).click();
  await expect(page.getByText(`Exchange 2 / ${CAP}`)).toBeVisible();
  await expect(scene).toHaveAttribute("data-scene", "webgl");
  await move(page, "Close", "Here's your bag. Have a good one!");
  await expect(page.getByTestId("status-screen")).toBeVisible();
});

// The old three-choice inset test becomes this: the widest tray in the game, the four
// offers open to her once she is heard and answered, still whole above the home bar.
test("keeps the four-choice Offer panel whole above an iPhone home bar (a forced 34px inset)", async ({ page }) => {
  await begin(page);
  // Playwright cannot emulate env(safe-area-inset-bottom); the deck reads it through one custom property, so force that.
  await page.locator(".enc-encounter").evaluate((element) => element.style.setProperty("--enc-safe-bottom", "34px"));
  await move(page, "Offer", "Not long. Want your flu shot while you're here?");
  await move(page, "Ask", "Is it the bus, or is it something else?");
  await move(page, "Ask", "Can I tell you what usually causes that?");
  await move(page, "Offer", "The shot can't give you flu. Feeling achy after is common, and minor.");
  await page.getByRole("button", { name: "Offer", exact: true }).click();
  await expect(page.locator(".enc-choice")).toHaveCount(4);
  const m = await page.evaluate(() => {
    const deck = document.querySelector(".enc-deck");
    const panel = document.querySelector(".enc-choices");
    const deckBox = deck.getBoundingClientRect();
    const padBottom = parseFloat(getComputedStyle(deck).paddingBottom);
    const last = [...document.querySelectorAll(".enc-choice")].at(-1).getBoundingClientRect();
    return { padBottom, clipped: panel.scrollHeight - panel.clientHeight, aboveHomeBar: deckBox.bottom - padBottom - last.bottom, scroll: document.scrollingElement.scrollHeight - window.innerHeight };
  });
  expect(m.padBottom).toBe(46); // the deck's 12px, plus a 34px home bar
  expect(m.clipped).toBeLessThanOrEqual(0); // nothing hidden inside the panel
  expect(m.aboveHomeBar).toBeGreaterThanOrEqual(0); // the fourth choice ends above the home bar
  expect(m.scroll).toBeLessThanOrEqual(0);
});

test("marks the dialogue region as live and returns focus to the same move when its choices close without a pick", async ({ page }) => {
  await begin(page);
  await expect(page.locator(".enc-dialogue")).toHaveAttribute("aria-live", "polite");
  const ask = page.getByRole("button", { name: "Ask", exact: true });
  await ask.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("group", { name: "ask choices" })).toBeVisible();
  await page.getByRole("button", { name: "All moves" }).click();
  await expect(ask).toBeFocused();
});

test("moves keyboard focus to another live move once the one just used runs out of lines", async ({ page }) => {
  await begin(page);
  await move(page, "Offer", "Not long. Want your flu shot while you're here?");
  await expect(page.getByRole("button", { name: "Ask", exact: true })).toBeEnabled();
  await move(page, "Ask", "Want to skip it for today?");
  // Jordan says not today, and that was the only line Ask had left at this stop.
  await expect(page.getByRole("button", { name: "Ask", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Offer", exact: true })).toBeFocused();
});

test("keeps the Rx handheld to goals: an objective already met is never ticked off mid-mission", async ({ page }) => {
  await begin(page);
  // Make an offer before looking at the handheld: it still lists goals, never results.
  await move(page, "Offer", "Not long. Want your flu shot while you're here?");
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  const handheld = page.getByRole("dialog", { name: "Rx handheld" });
  await expect(handheld.locator(".enc-lcd-objectives li")).toHaveText(OBJECTIVES);
  await expect(handheld).not.toContainText("✓");
  await expect(handheld).not.toContainText(/You offered|You brought|You asked/);
  await expect(handheld.locator(".is-met")).toHaveCount(0);
});

test("holds keyboard focus inside the Rx handheld and makes the encounter behind it inert", async ({ page }) => {
  await begin(page);
  const column = page.locator(".enc-column");
  await expect(column).not.toHaveAttribute("inert");
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  const handheld = page.getByRole("dialog", { name: "Rx handheld" });
  await expect(handheld).toBeVisible();
  await expect(column).toHaveAttribute("inert");
  const resume = page.getByRole("button", { name: "RESUME" });
  for (const key of ["Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect(resume, `after ${key}`).toBeFocused();
  }
  await resume.press("Enter");
  await expect(handheld).toHaveCount(0);
  await expect(column).not.toHaveAttribute("inert");
});

test("fills the orange arc one segment per exchange and holds the blue arc steady, so nothing counts down", async ({ page }) => {
  await begin(page);
  const lit = (selector) => page.locator(`${selector} path.is-lit`).count();
  expect([await lit(".enc-hud-arc--left"), await lit(".enc-hud-arc--right")], "at the start").toEqual([0, CAP]);
  await move(page, "Ask", "How long have you got?");
  await expect(page.getByText(`Exchange 2 / ${CAP}`)).toBeVisible();
  expect([await lit(".enc-hud-arc--left"), await lit(".enc-hud-arc--right")], "after exchange 1").toEqual([1, CAP]);
  await move(page, "Ask", "Got it. Can I mention one thing while I ring you up?");
  await expect(page.getByText(`Exchange 3 / ${CAP}`)).toBeVisible();
  expect([await lit(".enc-hud-arc--left"), await lit(".enc-hud-arc--right")], "after exchange 2").toEqual([2, CAP]);
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  await expect(page.getByRole("dialog", { name: "Rx handheld" })).toBeVisible();
  const segments = page.locator(".enc-handheld .enc-hh-segments span");
  expect(await segments.count(), "one segment per exchange on the handheld").toBe(CAP);
  expect(await segments.evaluateAll((els) => els.filter((el) => el.classList.contains("is-lit")).length), "lit on the handheld").toBe(2);
  // The same ramp as the HUD's orange arc, sampled the same way, so the two always match.
  const colours = (locator) => locator.evaluateAll((els) => els.map((el) => el.style.getPropertyValue("--seg")));
  expect(await colours(segments), "the handheld's segments wear the orange arc's own colours").toEqual(await colours(page.locator(".enc-hud-arc--left path[style]")));
});

test("keeps the N64 render soft: a low internal resolution, upscaled smoothly, never crisp", async ({ page }) => {
  await begin(page);
  await expect(page.locator(".enc-scene")).toHaveAttribute("data-scene", "webgl");
  const canvas = await page.locator(".enc-scene-canvas").evaluate((element) => ({ width: element.width, cssWidth: element.getBoundingClientRect().width, rendering: getComputedStyle(element).imageRendering }));
  expect(canvas.width).toBeLessThanOrEqual(240);
  expect(canvas.cssWidth / canvas.width, "upscaled, not drawn at device size").toBeGreaterThan(1.5);
  expect(canvas.rendering, "a smooth upscale; crisp pixels read as SNES").toBe("auto");
});

test("opens on the pharmacist's own shelving and pans to the patient", async ({ page }) => {
  await begin(page);
  const scene = page.locator(".enc-scene");
  await expect(scene).toHaveAttribute("data-scene", "webgl");
  expect(await scene.getAttribute("data-camera"), "the pan is under way when the scene first shows").toBe("panning");
  await expect(scene).toHaveAttribute("data-camera", "settled", { timeout: 5000 });
});

test("skips the opening pan under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await begin(page);
  const scene = page.locator(".enc-scene");
  await expect(scene).toHaveAttribute("data-scene", "webgl");
  expect(await scene.getAttribute("data-camera"), "no pan at all").toBe("settled");
});

test("lists the four moves one per row in the Rx handheld's LCD language: big names, no hint lines", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await begin(page);
  // Sit with it wakes up once she hesitates. Check the LCD styling once all four are live,
  // so a deliberately dimmed disabled key is never mistaken for an inconsistent enabled one.
  await move(page, "Offer", "Not long. Want your flu shot while you're here?");
  const keys = await page.locator(".enc-key").evaluateAll((elements) => elements.map((element) => {
    const label = element.querySelector(".enc-key-label");
    const glyph = element.querySelector(".enc-key-glyph");
    const box = element.getBoundingClientRect();
    return {
      label: label.textContent, glyph: glyph.textContent.trim(), text: element.textContent.trim(),
      font: getComputedStyle(label).fontFamily, color: getComputedStyle(label).color, face: getComputedStyle(element).backgroundImage,
      labelPx: parseFloat(getComputedStyle(label).fontSize),
      top: box.top, bottom: box.bottom, width: box.width, height: box.height, clipped: label.scrollWidth > label.clientWidth,
    };
  }));
  const deckWidth = await page.locator(".enc-keys").evaluate((element) => element.getBoundingClientRect().width);
  expect(keys.map((key) => key.label)).toEqual(["Ask", "Offer", "Sit with it", "Close"]);
  keys.forEach((key, index) => {
    expect(key.font, key.label).toMatch(/Share Tech Mono/); // mono, as on the handheld screen
    expect(key.color, key.label).toBe("rgb(140, 255, 153)"); // the LCD's green
    expect(key.face, key.label).toContain("rgb(16, 58, 30)"); // on the LCD's dark face
    expect(key.labelPx, key.label).toBeGreaterThanOrEqual(20); // big (Kevin, 2026-09-15: "the text is so small")
    expect(key.height, key.label).toBeGreaterThanOrEqual(44); // 44pt
    expect(key.width / deckWidth, `${key.label} spans its row`).toBeGreaterThan(0.95);
    if (index) expect(key.top, `${key.label} sits below the move before it`).toBeGreaterThanOrEqual(keys[index - 1].bottom);
    expect(key.glyph.length, key.label).toBe(1); // each family keeps its mark
    expect(key.text, `${key.label} carries no hint line ("don't make this too easy")`).toBe(`${key.glyph}${key.label}`);
    expect(key.clipped, key.label).toBe(false);
  });
});

// Kevin, 2026-09-16: a phone turned sideways is told the game plays in portrait, and
// turning back finds everything where it was. One real phone in WebKit carries it.
test("asks a phone turned sideways to turn back upright, and keeps the file where it was", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "safari-iphone14-390x664", "one real phone in WebKit is enough for the rotation check");
  await page.goto("/");
  await page.getByRole("button", { name: /Jordan/ }).click();
  const name = page.locator(".ci-dossier-id h1");
  await expect(name).toBeVisible();
  const notice = page.getByRole("alert").filter({ hasText: "Turn your phone upright" });
  await expect(notice).toHaveCount(0);
  await page.setViewportSize({ width: 664, height: 390 });
  await expect(notice).toBeVisible();
  const sideways = await page.evaluate(() => {
    const cover = document.querySelector(".ci-portrait-only").getBoundingClientRect();
    return { covers: cover.left <= 0 && cover.top <= 0 && cover.right >= innerWidth && cover.bottom >= innerHeight, inert: document.querySelector(".ci-app").hasAttribute("inert") };
  });
  expect(sideways, "the notice covers the whole screen and the game underneath is inert").toEqual({ covers: true, inert: true });
  await page.setViewportSize({ width: 390, height: 664 });
  await expect(notice).toHaveCount(0);
  await expect(name, "turned back, the same file is still open").toBeVisible();
  expect(await page.locator(".ci-app").getAttribute("inert")).toBeNull();
});

// Kevin, 2026-09-16: leave room for the Dynamic Island and the home bar. In Safari's own
// window the browser frames the page, but from the home screen the page runs under both,
// so every screen pads by the safe-area insets. Playwright cannot emulate env(), so the
// real insets of each full-screen size are forced through the custom properties the CSS
// reads them by.
const HOME_SCREEN_INSETS = { "phone-portrait-430x932": { top: 59, bottom: 34 }, "phone-portrait-390x844": { top: 47, bottom: 34 } };
test("keeps every screen's text and controls clear of the Dynamic Island and the home bar", async ({ page }, testInfo) => {
  const inset = HOME_SCREEN_INSETS[testInfo.project.name];
  test.skip(!inset, "home-screen insets apply at the full-screen phone sizes");
  await page.goto("/");
  await page.addStyleTag({ content: `.ci-screen { --safe-top: ${inset.top}px !important; --safe-bottom: ${inset.bottom}px !important; } .enc-encounter { --enc-safe-top: ${inset.top}px !important; --enc-safe-bottom: ${inset.bottom}px !important; }` });
  const clear = async (where) => {
    const intruders = await page.evaluate(({ top, bottom }) => [...document.querySelectorAll("body *")].filter((el) => {
      const ownText = [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim());
      if (!ownText && !el.matches("button, [role=tab]")) return false;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") return false;
      let rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      // Text scrolled inside its own frame counts only where the frame shows it.
      const frame = el.parentElement?.closest(".ci-transcript-wrap, .enc-lcd");
      if (frame) {
        const f = frame.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, f.top);
        const visibleBottom = Math.min(rect.bottom, f.bottom);
        if (visibleBottom <= visibleTop) return false;
        rect = { top: visibleTop, bottom: visibleBottom };
      }
      return rect.top < top - 0.5 || rect.bottom > innerHeight - bottom + 0.5;
    }).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${el.textContent.trim().slice(0, 28)}"`), inset);
    expect(intruders, `${where}: nothing under the Dynamic Island or the home bar`).toEqual([]);
  };
  await clear("select file");
  await page.getByRole("button", { name: /Jordan/ }).click();
  await clear("dossier");
  await page.getByRole("button", { name: /Mission brief/i }).click();
  await clear("briefing");
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.locator(".enc-scene")).toHaveAttribute("data-camera", "settled", { timeout: 20000 });
  await clear("encounter");
  await page.getByRole("button", { name: /Rx handheld/i }).click();
  const handheld = page.getByRole("dialog", { name: "Rx handheld" });
  await expect.poll(() => handheld.evaluate((element) => getComputedStyle(element).transform), { message: "settles flat, in place" }).toMatch(/^(?:none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  await clear("handheld");
  await page.keyboard.press("Escape");
  await quickestClose(page);
  await expect(page.getByTestId("status-screen")).toBeVisible();
  await clear("mission status");
  await page.getByRole("button", { name: "Continue" }).click();
  await clear("debrief");
  await page.getByRole("button", { name: "Continue" }).click();
  await clear("talk about it");
});

// Five files on one screen (2026-09-16). At 375x667 and in Safari at 390x664 the
// folders shrank until each photo sat on its own patient's name, which the type-floor
// check above never saw. Every file's name, level and endings line must stay clear of
// every photo, the Rx cursor and the other folders, at every size.
test("keeps every file's name, level and endings readable on SELECT FILE", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const clashes = await page.evaluate(() => {
    const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
    const folders = [...document.querySelectorAll(".ci-folder")];
    const found = [];
    folders.forEach((folder, index) => {
      const name = folder.querySelector(".ci-folder-name").textContent.trim();
      const texts = [...folder.querySelectorAll(".ci-folder-name, .ci-folder-level, .ci-folder-endings")];
      const covers = [...document.querySelectorAll(".ci-folder-photo, .ci-folder-cursor")];
      folders.forEach((other, otherIndex) => { if (otherIndex !== index) covers.push(other.querySelector(".ci-folder-cover")); });
      for (const text of texts) for (const cover of covers) {
        if (overlap(text.getBoundingClientRect(), cover.getBoundingClientRect())) found.push(`${name} ${text.getAttribute("class")} under ${cover.getAttribute("class")}`);
      }
    });
    return { count: folders.length, found };
  });
  expect(clashes.count, "files checked").toBe(5);
  expect(clashes.found).toEqual([]);
});

test("uses readable paper surfaces when the browser requests a light theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" })
  await begin(page)
  const surfaces = await page.evaluate(() => {
    const color = (selector, property) => getComputedStyle(document.querySelector(selector))[property]
    return {
      deck: color(".enc-deck", "backgroundColor"),
      control: color(".enc-key", "color"),
      ink: getComputedStyle(document.documentElement).getPropertyValue("--ci-ink").trim(),
    }
  })
  const channels = surfaces.deck.match(/[\d.]+/g).slice(0, 3).map(Number)
  expect(Math.min(...channels), "light deck rather than a dark surround").toBeGreaterThan(180)
  expect(surfaces.control).toBe(await page.evaluate((ink) => {
    const probe = document.createElement("span")
    probe.style.color = ink
    document.body.append(probe)
    const value = getComputedStyle(probe).color
    probe.remove()
    return value
  }, surfaces.ink))
})
