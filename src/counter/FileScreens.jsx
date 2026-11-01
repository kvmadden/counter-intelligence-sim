import { useEffect, useRef, useState } from "react";
import { debriefFor } from "./engine.js";
import { HygieiaCrest, Paperclip, Photo, RxCursor, Stamp } from "./FileFurniture.jsx";
import { MISSION_LINE } from "./objectives.js";
import { conversationOf, fileObjectives, levelOf } from "./patients.js";

// Every screen but the encounter, one idea each (Kevin, 2026-09-15): SELECT FILE,
// the patient dossier, the briefing, mission status, the debrief and the huddle.
// the classic N64 shooter's menu idioms, mixed by screen as he ruled.

const LETTERS = "abcdefghij";

// Fixed page sizes for the lists that can outgrow one screen, measured against
// 390x664 (Kevin's ruling): 4 notes or 3 sources a page. Objectives measured the
// same way: see the note at FIRST_PAGE_OBJECTIVES below. Exported so the fit guard
// (tests/browser/counter-intelligence.spec.js) reasons about the same numbers
// instead of a second, driftable copy.
export const NOTES_PER_PAGE = 4;
export const SOURCES_PER_PAGE = 3;
// Measured 2026-09-15 (work/measure-objectives.mjs), against Jordan's own best-case
// screen at 390x664 (WebKit, iPhone 14): that ending carries both the Best case and
// New marks, the tallest outcome-lines block there is, so it sets the worst-case
// budget. Real production markup, only the row text is synthesized (no Secret Agent
// or 00 Agent file exists yet to render for real): the objectives list's template
// row was cloned once per the 00 Agent's actual seven objective strings, in their
// real cumulative order, and measured against the real gap to the stamp that always
// follows the list. Budget: 100.9px. Jordan's own two rows are single-line, about
// 43px each; two of the seven real strings ("Protect someone beyond the counter.",
// "Wrap it up in four exchanges or fewer.") wrap to two lines at about 67px. In
// order, only the first two objectives' rows (43 + 8 gap + 43 = 94.8px) fit inside
// the 100.9px budget; the third row of any length pushes past it.
// Measured 2026-09-16 once all five files rendered for real (work/diag-marcus.mjs), at
// 375x667 with the tallest outcome block (a best case with its New mark, 192px). The
// outcome block, not the rows, is what crowds the objectives: a page carrying it has
// about 110px for rows, and an objective that wraps is 67px, so only the first page
// carries it, with the two Agent objectives every file opens with (both one line at
// every size). Every later page shows objectives alone, up to four even if all four
// wrap (292px against about 300px), and the verdict stamp marks only the last page.
// Before this, the stamp on every page ran Marcus 18px over at 390x664 and a fixed two
// a page ran Walt 23px over at 375x667 (the fit guard, RED both times).
export const FIRST_PAGE_OBJECTIVES = 2;
export const MORE_PAGE_OBJECTIVES = 4;

// Objectives split into pages, in order.
export function objectivePages(objectives) {
  const pages = [objectives.slice(0, FIRST_PAGE_OBJECTIVES)];
  for (let index = FIRST_PAGE_OBJECTIVES; index < objectives.length; index += MORE_PAGE_OBJECTIVES) pages.push(objectives.slice(index, index + MORE_PAGE_OBJECTIVES));
  return pages;
}

// Keeps a hyphenated name on one line, so a big headline never breaks "COVID-19".
const keepTogether = (text) => text.split(/(COVID-19)/).map((part, index) => part === "COVID-19" ? <span key={index} className="ci-nowrap">{part}</span> : part);

// Each screen opens with focus on its heading, so keyboard and screen-reader
// users start at the top of the one idea it carries.
function useHeadingFocus() {
  const ref = useRef(null);
  useEffect(() => {
    // Start each screen at its top, even if enlarged text let the last one scroll.
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}

// the classic N64 shooter's mission-menu list: numbered items, the highlighted one on a darker
// bar with the red Rx cursor beside it. The cursor follows the pointer and focus.
export function FileMenu({ items, label, numbered = true, className = "" }) {
  const [active, setActive] = useState(0);
  // A page that loses an item (Next page dropping off the last page) can leave the
  // lit index pointing past the end, so nothing reads as active. Clamp it back.
  useEffect(() => { setActive((current) => Math.min(current, items.length - 1)); }, [items.length]);
  return <ol className={`ci-menu ${className}`} aria-label={label}>
    {items.map((item, index) => (
      <li key={item.id}>
        <button
          type="button"
          className={`ci-menu-item${index === active ? " is-active" : ""}`}
          onPointerEnter={() => setActive(index)}
          onFocus={() => setActive(index)}
          onClick={item.onSelect}
        >
          <span className="ci-menu-cursor" aria-hidden="true">{index === active && <RxCursor />}</span>
          <span className="ci-menu-text">
            {numbered && <span className="ci-menu-number" aria-hidden="true">{index + 1}.</span>}
            <span className="ci-menu-label">{item.label}</span>
          </span>
        </button>
      </li>
    ))}
  </ol>;
}

// Index tabs down the file's right edge, as a tablist: one idea to a page (the
// briefing, the debrief). Arrow keys, Home and End move between pages.
function useTabs(pages) {
  const [page, setPage] = useState(pages[0].id);
  const tabRefs = useRef({});
  const onTabKey = (event, index) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    const to = event.key === "Home" ? 0 : event.key === "End" ? pages.length - 1 : step ? (index + step + pages.length) % pages.length : null;
    if (to === null) return;
    event.preventDefault();
    setPage(pages[to].id);
    tabRefs.current[pages[to].id]?.focus();
  };
  return { page, setPage, tabRefs, onTabKey };
}

function SideTabs({ pages, label, panelId, tabs }) {
  const { page, setPage, tabRefs, onTabKey } = tabs;
  return <div className="ci-side-tabs" role="tablist" aria-label={label} aria-orientation="vertical">
    {pages.map((item, index) => <button
      key={item.id}
      type="button"
      role="tab"
      id={`ci-tab-${item.id}`}
      aria-controls={panelId}
      aria-selected={page === item.id}
      tabIndex={page === item.id ? 0 : -1}
      ref={(element) => { tabRefs.current[item.id] = element; }}
      className={`ci-side-tab${page === item.id ? " is-current" : ""}`}
      // Each tab's share of the rail matches its own label length, so a longer
      // page name gets the room its stacked letters need.
      style={{ flexGrow: item.label.length }}
      onClick={() => setPage(item.id)}
      onKeyDown={(event) => onTabKey(event, index)}
    ><span className="ci-side-tab-text">{item.label}</span></button>)}
  </div>;
}

// A tab's content that outgrows one page splits into fixed pages (Kevin's ruling
// over scrolling the page or trimming what shows), sized for 390x664. `reset()` is
// the caller's own job to invoke (Debrief calls it when the active tab changes, so
// reopening a paged tab always starts on its first page); MissionStatus never needs
// it, since the whole screen remounts fresh each time it is shown.
function usePages(total, perPage) {
  const [index, setIndex] = useState(0);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(index, pages - 1);
  return { page, pages, start: page * perPage, hasNext: page < pages - 1, next: () => setIndex((current) => current + 1), reset: () => setIndex(0) };
}
const kickerFor = (label, page, pages) => (pages > 1 ? `${label} · ${page + 1} of ${pages}` : label);

// A closed patient file: board cover, gold-blocked crest, a typed label with the
// patient's name, the file's fixed level and the endings found so far, and the photo
// clipped to the top.
const TILTS = [-1.4, 1.2, -0.8, 1.6, -1.1];

function Folder({ patient, found, index, active, onActivate, onOpen }) {
  const level = levelOf(patient);
  const total = conversationOf(patient).endings.length;
  return <button
    type="button"
    className={`ci-folder${active ? " is-active" : ""}`}
    style={{ "--tilt": `${TILTS[index % TILTS.length]}deg` }}
    aria-label={`${patient.name}. ${level.label} level. ${found.length} of ${total} endings found.`}
    onPointerEnter={onActivate}
    onFocus={onActivate}
    onClick={onOpen}
  >
    <span className="ci-folder-back" aria-hidden="true" />
    <span className="ci-folder-cover" aria-hidden="true">
      <HygieiaCrest tone="gilt" className="ci-folder-crest" />
      <span className="ci-folder-label">
        <span className="ci-folder-name">{patient.name}</span>
        <span className="ci-folder-level">{level.label}</span>
        <span className="ci-folder-endings">Endings {found.length}/{total}</span>
      </span>
    </span>
    <Photo src={patient.portrait} alt="" className="ci-folder-photo" />
    {active && <RxCursor className="ci-folder-cursor" />}
  </button>;
}

// SELECT FILE: exactly the files on record, never padded with placeholders. One
// file sits large and alone; more fall into two columns.
export function SelectFile({ patients, found = {}, onOpen }) {
  const [active, setActive] = useState(0);
  const headingRef = useHeadingFocus();
  const cols = patients.length > 1 ? 2 : 1;
  return <main className="ci-screen ci-select" data-testid="select-screen" data-count={patients.length} style={{ "--cols": cols, "--rows": Math.ceil(patients.length / cols) }}>
    <div className="ci-select-frame">
      <h1 ref={headingRef} tabIndex={-1} className="ci-select-heading">Select file</h1>
      <p className="ci-select-title">Counter Intelligence</p>
      <ul className="ci-files" aria-label="Patient files">
        {patients.map((patient, index) => <li key={patient.id}>
          <Folder patient={patient} found={found[patient.id] ?? []} index={index} active={index === active} onActivate={() => setActive(index)} onOpen={() => onOpen(patient.id)} />
        </li>)}
      </ul>
      <p className="ci-select-note">Every patient on file is fictional.</p>
    </div>
  </main>;
}

// The opened file: photo, engraved crest, the Authorisation line, the level, the
// endings found, a numbered menu, side tabs, and a rubber stamp with a pharmacy phrase.
export function Dossier({ patient, found = [], onBriefing, onCounter, onPrevious }) {
  const level = levelOf(patient);
  const total = conversationOf(patient).endings.length;
  const headingRef = useHeadingFocus();
  return <main className="ci-screen ci-desk" data-testid="dossier-screen">
    <article className="ci-sheet ci-dossier" aria-labelledby="ci-dossier-name">
      <Photo src={patient.portrait} alt={patient.portraitAlt} className="ci-dossier-photo" />
      <HygieiaCrest className="ci-dossier-crest" />
      <p className="ci-authorisation">Authorisation:<span>counter 04</span></p>
      <div className="ci-dossier-id">
        <p className="ci-kicker">Patient file</p>
        <h1 id="ci-dossier-name" ref={headingRef} tabIndex={-1}>{patient.name}</h1>
        <p className="ci-level-print"><span>Level</span><strong>{level.label}</strong></p>
        <p className="ci-endings-print">Endings found · {found.length} of {total}</p>
      </div>
      <FileMenu className="ci-dossier-menu" label="File menu" items={[
        { id: "briefing", label: "Mission brief", onSelect: onBriefing },
        { id: "counter", label: "To the counter", onSelect: onCounter },
      ]} />
      <div className="ci-sheet-clip"><Stamp lines={["Behind the", "counter"]} className="ci-dossier-stamp" /></div>
      <div className="ci-side-tabs">
        <span className="ci-side-tab" aria-hidden="true" />
        <span className="ci-side-tab" aria-hidden="true" />
        <button type="button" className="ci-side-tab ci-side-tab--action" onClick={onPrevious}><span className="ci-side-tab-text">Previous</span></button>
      </div>
    </article>
  </main>;
}

// The briefing: tabbed pages in the file, one idea to a page.
const BRIEFING_PAGES = [
  { id: "situation", label: "Situation" },
  { id: "objectives", label: "Objectives" },
  { id: "why", label: "Why it matters" },
];

export function Briefing({ patient, onAccept, onCancel }) {
  const tabs = useTabs(BRIEFING_PAGES);
  const headingRef = useHeadingFocus();
  const level = levelOf(patient);
  const conversation = conversationOf(patient);
  const objectives = fileObjectives(patient);
  return <main className="ci-screen ci-desk" data-testid="briefing-screen">
    <article className="ci-sheet ci-briefing" aria-labelledby="ci-briefing-title">
      <header className="ci-sheet-head">
        <h1 id="ci-briefing-title" ref={headingRef} tabIndex={-1}>Mission briefing</h1>
        <p className="ci-file-line">File · {patient.name} · {level.label}</p>
      </header>
      <SideTabs pages={BRIEFING_PAGES} label="Briefing pages" panelId="ci-brief-page" tabs={tabs} />
      <section className="ci-brief-page" id="ci-brief-page" role="tabpanel" tabIndex={0} aria-labelledby={`ci-tab-${tabs.page}`}>
        {tabs.page === "situation" && <>
          <h2 className="ci-kicker">Situation</h2>
          <p className="ci-brief-lead">{conversation.briefing}</p>
          {/* Each sentence of the equipment line on its own line, so none breaks mid-phrase. */}
          <p className="ci-brief-text">{conversation.equipment.split(/(?<=\.)\s+/).map((sentence) => <span key={sentence} className="ci-brief-line">{sentence}</span>)}</p>
          <p className="ci-brief-note">Fictional scenario. You only get what someone chooses to tell you.</p>
        </>}
        {tabs.page === "objectives" && <>
          <h2 className="ci-kicker">{level.label} objectives</h2>
          <p className="ci-brief-lead">{MISSION_LINE}</p>
          <ol className="ci-objective-list">
            {objectives.map((objective, index) => <li key={objective.id}>
              <span className="ci-objective-letter" aria-hidden="true">{LETTERS[index]}.</span>
              <span>{objective.text}</span>
            </li>)}
          </ol>
        </>}
        {tabs.page === "why" && <>
          <h2 className="ci-kicker">Why it matters</h2>
          <p className="ci-brief-lead">How you open a conversation shapes what someone tells you.</p>
          <p className="ci-brief-text">The moves here work the same at the real counter.</p>
          <p className="ci-brief-note">Any health fact in this file is conversation-level and sourced. None of it is medical advice.</p>
        </>}
      </section>
      <FileMenu numbered={false} label="Briefing" className="ci-sheet-foot" items={[
        { id: "accept", label: "Accept", onSelect: onAccept },
        { id: "cancel", label: "Cancel", onSelect: onCancel },
      ]} />
    </article>
  </main>;
}

// A rubber stamp holds the verdict in short lines, words kept whole, no end period.
const stampLines = (label, max = 18) => label.replace(/\.$/, "").split(" ").reduce((lines, word) => {
  const last = lines.at(-1);
  if (last && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
  else lines.push(word);
  return lines;
}, []);

// The run's rank: its tier by name, and a row of pips for where it sits.
function TierPips({ tier }) {
  return <span className="ci-tier-pips" role="img" aria-label={`Rank ${tier.rank} of ${tier.of}`}>
    {Array.from({ length: tier.of }, (_, index) => <i key={index} className={index < tier.rank ? "is-lit" : undefined} />)}
  </span>;
}

// The named ending (with its best-case and new marks) and the ranked tier, label over
// value. On mission status the tier also says what it means.
function OutcomeLines({ outcome, fresh = false, compact = false }) {
  const { tier, ending } = outcome;
  return <dl className={`ci-outcome-lines${compact ? " is-compact" : ""}`}>
    <div>
      <dt>Ending{ending.best && <span className="ci-best">Best case</span>}{fresh && <span className="ci-new">New</span>}</dt>
      <dd className="ci-ending-name">{ending.name}</dd>
    </div>
    <div>
      <dt>Verdict</dt>
      <dd><span className="ci-tier-name">{tier.label}</span><TierPips tier={tier} />{!compact && tier.means && <span className="ci-tier-means">{tier.means}</span>}</dd>
    </div>
  </dl>;
}

// the classic N64 shooter's end-of-level objectives page, with the run's named ending and ranked
// tier (Kevin, 2026-09-15: outcomes are "all of this"), and the endings found so far.
// It renders the `outcome` it is handed (outcomes.js).
export function MissionStatus({ patient, outcome, fresh = false, found = [], onContinue }) {
  const headingRef = useHeadingFocus();
  const kickerRef = useRef(null);
  const level = levelOf(patient);
  const total = conversationOf(patient).endings.length;
  const { tier, objectives } = outcome;
  const objectivePaging = objectivePages(objectives);
  const paging = usePages(objectivePaging.length, 1);
  const shown = objectivePaging[paging.page] ?? [];
  const firstLetter = objectivePaging.slice(0, paging.page).reduce((count, page) => count + page.length, 0);
  const goNext = () => { paging.next(); kickerRef.current?.focus(); };
  return <main className="ci-screen ci-desk" data-testid="status-screen">
    <article className="ci-sheet ci-status" aria-labelledby="ci-status-title">
      <header className="ci-sheet-head">
        <h1 id="ci-status-title" ref={headingRef} tabIndex={-1}>Mission status</h1>
        <p className="ci-file-line">File closed</p>
      </header>
      <dl className="ci-ledger">
        <div><dt>Patient</dt><dd>{patient.name}</dd></div>
        <div><dt>Level</dt><dd>{level.label}</dd></div>
        <div><dt>Endings found</dt><dd>{found.length} / {total}</dd></div>
      </dl>
      {paging.page === 0 && <OutcomeLines outcome={outcome} fresh={fresh} />}
      {/* aria-live announces the page change; the ref takes focus there after Next
          page, so a screen reader lands on "Objectives · 2 of 2" and reads it. */}
      <h2 ref={kickerRef} tabIndex={-1} className="ci-kicker" aria-live="polite">{kickerFor("Objectives", paging.page, paging.pages)}</h2>
      <ol className="ci-status-list">
        {shown.map((objective, index) => <li key={objective.id} className={objective.met ? "is-met" : "is-unmet"}>
          <span className="ci-objective-letter" aria-hidden="true">{LETTERS[firstLetter + index]}.</span>
          <span className="ci-status-text">{objective.text}</span>
          <span className="ci-status-mark"><span className="ci-leader" aria-hidden="true" /><strong className="ci-status-word">{objective.status}</strong></span>
        </li>)}
      </ol>
      {/* In the foot's own flow, not an overlay: Next page can never land under it,
          and it can never hang past the sheet's own text column. The inked look is
          Kevin's pick, drawn in FileFurniture.jsx. The verdict stamps the last page of
          objectives only, once they have all been read, so a paged file's earlier pages
          keep the room its Next page item needs (Marcus, 2026-09-16: 18px over at
          390x664 with the stamp on every page). */}
      {!paging.hasNext && <Stamp lines={stampLines(tier.label)} className="ci-tier-stamp" />}
      <FileMenu numbered={false} label="Mission status" className="ci-sheet-foot" items={[
        ...(paging.hasNext ? [{ id: "next-page", label: "Next page", onSelect: goNext }] : []),
        { id: "continue", label: "Continue", onSelect: onContinue },
      ]} />
    </article>
  </main>;
}

// The debrief, one idea to a page: what was said, what happened, what moved things,
// and the sources behind any fact the player used. Nothing the patient didn't say.
// Kevin's ruling named "What moved it" and "Sources" as their own tabs. The
// transcript's inner scroll predates that ruling and stays as it is.
const DEBRIEF_PAGES = [
  { id: "transcript", label: "Transcript" },
  { id: "happened", label: "What happened" },
  { id: "moved", label: "What moved it" },
  { id: "sources", label: "Sources" },
];

export function Debrief({ patient, run, outcome, onContinue }) {
  const headingRef = useHeadingFocus();
  const kickerRef = useRef(null);
  const tabs = useTabs(DEBRIEF_PAGES);
  const debrief = debriefFor(run);
  const reviewed = debrief.sources.every((source) => source.reviewed);
  const notesPaging = usePages(debrief.moved.length, NOTES_PER_PAGE);
  const sourcesPaging = usePages(debrief.sources.length, SOURCES_PER_PAGE);
  // A tab always opens on its first page (Kevin's ruling): leaving a paged tab
  // resets it, so a return visit never lands mid-list.
  useEffect(() => { notesPaging.reset(); sourcesPaging.reset(); }, [tabs.page]);
  const shownNotes = debrief.moved.slice(notesPaging.start, notesPaging.start + NOTES_PER_PAGE);
  const shownSources = debrief.sources.slice(sourcesPaging.start, sourcesPaging.start + SOURCES_PER_PAGE);
  const onLastSourcesPage = !sourcesPaging.hasNext;
  const paging = tabs.page === "moved" ? notesPaging : tabs.page === "sources" ? sourcesPaging : null;
  // Focus the kicker after Next page, so its aria-live announces the new position
  // ("Sources · 2 of 3") the way a tab change announces the panel it opens.
  const goNext = () => { paging?.next(); kickerRef.current?.focus(); };
  return <main className="ci-screen ci-desk" data-testid="debrief-screen">
    <article className="ci-sheet ci-debrief" aria-labelledby="ci-debrief-title">
      <header className="ci-sheet-head">
        <h1 id="ci-debrief-title" ref={headingRef} tabIndex={-1}>Debrief</h1>
        <p className="ci-file-line">File · {patient.name} · counter 04</p>
      </header>
      <SideTabs pages={DEBRIEF_PAGES} label="Debrief pages" panelId="ci-debrief-page" tabs={tabs} />
      <section id="ci-debrief-page" role="tabpanel" tabIndex={0} aria-labelledby={`ci-tab-${tabs.page}`} className={tabs.page === "transcript" ? "ci-debrief-page" : "ci-brief-page"}>
        {tabs.page === "transcript" && <>
          <OutcomeLines outcome={outcome} compact />
          <section className="ci-transcript-wrap" aria-label="Transcript" tabIndex={0}>
            <ol className="ci-transcript">
              {run.transcript.map((beat, index) => <li key={index} className={beat.speaker === "You" ? "is-you" : "is-them"}>
                <span className="ci-transcript-who">{beat.speaker}</span>
                <span className="ci-transcript-line">{beat.text}</span>
              </li>)}
            </ol>
          </section>
          <p className="ci-transcript-end">End of transcript</p>
        </>}
        {tabs.page === "happened" && <>
          <h2 className="ci-kicker">What happened</h2>
          <p className="ci-brief-lead">{keepTogether(debrief.happened)}</p>
          {debrief.method && <p className="ci-brief-note">{debrief.method}</p>}
        </>}
        {tabs.page === "moved" && <>
          <h2 ref={kickerRef} tabIndex={-1} className="ci-kicker" aria-live="polite">{kickerFor("What moved it", notesPaging.page, notesPaging.pages)}</h2>
          {debrief.moved.length
            ? <ul className="ci-moved-list">{shownNotes.map((note, index) => <li key={notesPaging.start + index}>{note}</li>)}</ul>
            : <p className="ci-brief-text">Nothing moved this one either way.</p>}
        </>}
        {tabs.page === "sources" && <>
          <h2 ref={kickerRef} tabIndex={-1} className="ci-kicker" aria-live="polite">{kickerFor("Sources", sourcesPaging.page, sourcesPaging.pages)}</h2>
          {debrief.sources.length
            ? <>
              <p className="ci-source-license">Source: <strong className="ci-source-org">CDC</strong> · US public domain</p>
              <ol className="ci-sources" start={sourcesPaging.start + 1}>
                {shownSources.map((source) => <li key={source.id}>
                  <a className="ci-source-title" aria-label={`${source.title} (CDC source, opens in a new tab)`} data-claim-id={source.id} href={source.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{source.title} (opens CDC)</a>
                  <span className="ci-source-date">Author check {source.historicalReview}</span>
                </li>)}
              </ol>
              {onLastSourcesPage && <p className="ci-brief-note">{reviewed
                ? "Facts here stay at conversation level. Each one was checked against its public-health source and reviewed by a pharmacist. None of it is medical advice."
                : "Draft, pending pharmacist passage review. Historical checks only. Rights review pending. Free on CDC's website. No CDC endorsement. Not medical advice."}</p>}
            </>
            : <p className="ci-brief-text">No health facts came up in this conversation, so there is nothing to cite.</p>}
        </>}
      </section>
      <FileMenu numbered={false} label="Debrief" className="ci-sheet-foot" items={[
        ...(paging?.hasNext ? [{ id: "next-page", label: "Next page", onSelect: goNext }] : []),
        { id: "continue", label: "Continue", onSelect: onContinue },
      ]} />
    </article>
  </main>;
}

// Talk about it: one question, big enough to read across a room.
export function Huddle({ run, onAnotherTake, onSelectFile }) {
  const headingRef = useHeadingFocus();
  const { discussion } = debriefFor(run);
  return <main className="ci-screen ci-desk ci-huddle" data-testid="huddle-screen">
    <article className="ci-card" aria-labelledby="ci-huddle-title">
      <Paperclip className="ci-card-clip" />
      <h1 id="ci-huddle-title" ref={headingRef} tabIndex={-1} className="ci-card-kicker">Talk about it</h1>
      <p className="ci-card-prompt">{discussion}</p>
      <p className="ci-card-note">One question for the group. There’s no right answer.</p>
      <FileMenu label="What next" className="ci-sheet-foot" items={[
        { id: "take", label: "Another take", onSelect: onAnotherTake },
        { id: "select", label: "Select file", onSelect: onSelectFile },
      ]} />
    </article>
  </main>;
}
