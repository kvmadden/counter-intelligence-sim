import { useEffect, useRef, useState } from "react";
import { conversationFor, createRun, optionsFor, sharedFor, takeTurn } from "./engine.js";
import { objectivePrompts } from "./objectives.js";
import { ExchangeArcs, HandheldGlyph } from "./ExchangeArcs.jsx";
import { exchangeSegments } from "./hud.js";
import N64Scene from "./N64Scene.jsx";
import RxHandheld from "./RxHandheld.jsx";
import { Briefing, Debrief, Dossier, Huddle, MissionStatus, SelectFile } from "./FileScreens.jsx";
import { outcomeFor } from "./outcomes.js";
import { PATIENTS, levelById, patientById } from "./patients.js";
import { PortraitOnly, usePhoneSideways } from "./PortraitOnly.jsx";

// The four moves carry their names and marks only (Kevin, 2026-09-15: "don't
// make this too easy"): no line under each one telling the player what it does.
const families = [
  { id: "ask", label: "Ask", mark: "?" },
  { id: "offer", label: "Offer", mark: "+" },
  { id: "sit", label: "Sit with it", mark: "·" },
  { id: "close", label: "Close", mark: "×" },
];

function Encounter({ run, levelId, onTurn }) {
  const [family, setFamily] = useState(null);
  const [handheldOpen, setHandheldOpen] = useState(false);
  const panelRef = useRef(null);
  const familyButtonRefs = useRef({});
  const restoreFocusToRef = useRef(null);
  const handheldButtonRef = useRef(null);
  const handheldRef = useRef(null);
  const restoreFocusToHandheldRef = useRef(false);
  const conversation = conversationFor(run.patientId);
  const choices = family ? optionsFor(run, family) : [];
  const activeBeat = run.transcript.at(-1);
  const objectives = objectivePrompts(levelId, conversation);
  const level = levelById(levelId);
  const segments = exchangeSegments(run);
  const familyLabel = families.find((item) => item.id === family)?.label;

  useEffect(() => {
    if (family && choices.length) {
      panelRef.current?.focus({ preventScroll: true });
    } else if (restoreFocusToRef.current) {
      // Back to the move just used. If that move has nothing left to say here, land
      // on the first move still live (Close is always live), never on <body>.
      const preferred = familyButtonRefs.current[restoreFocusToRef.current];
      const live = families.map((item) => familyButtonRefs.current[item.id]).find((key) => key && !key.disabled);
      (preferred && !preferred.disabled ? preferred : live)?.focus({ preventScroll: true });
      restoreFocusToRef.current = null;
    }
  }, [family, choices.length]);

  useEffect(() => {
    if (handheldOpen) {
      handheldRef.current?.focus({ preventScroll: true });
    } else if (restoreFocusToHandheldRef.current) {
      handheldButtonRef.current?.focus({ preventScroll: true });
      restoreFocusToHandheldRef.current = false;
    }
  }, [handheldOpen]);

  const selectFamily = (next) => setFamily((current) => current === next ? null : next);
  const closePanel = () => { restoreFocusToRef.current = family; setFamily(null); };
  const commit = (optionId) => {
    const next = takeTurn(run, optionId, run.revision);
    if (next !== run) onTurn(next);
    closePanel();
  };
  const closeHandheld = () => { restoreFocusToHandheldRef.current = true; setHandheldOpen(false); };

  // The encounter carries only the scene, the speaker and their line, and the four
  // moves. Objectives and what has been shared out loud live on the Rx handheld.
  return <main className="enc-encounter" data-testid="encounter-screen">
    <div className="enc-column" inert={handheldOpen ? "" : undefined}>
      <section className="enc-viewport" aria-label="The counter">
        <N64Scene key={run.patientId} patientId={run.patientId} beat={run.turns} label={`First-person view across a pharmacy counter. ${conversation.patient} waits on the other side, and your hand holds a pen.`} />
        <ExchangeArcs {...segments} />
        <div className="enc-hud-top">
          <p className="enc-readout">Exchange {Math.min(run.turns + 1, run.maxTurns)} / {run.maxTurns}</p>
          <button
            type="button"
            ref={handheldButtonRef}
            className="enc-handheld-button"
            aria-haspopup="dialog"
            aria-expanded={handheldOpen}
            aria-label={`Rx handheld: mission status and ${level.label} objectives`}
            onClick={() => setHandheldOpen(true)}
          >
            <HandheldGlyph label={level.glyph} />
          </button>
        </div>
      </section>
      <article className="enc-dialogue" aria-live="polite">
        <p className="enc-speaker">{activeBeat.speaker}</p>
        <p className="enc-line">{activeBeat.text}</p>
      </article>
      <section className="enc-deck" aria-label="Choose a move">
        {!family && <div className="enc-keys">
          {families.map((item) => {
            const available = optionsFor(run, item.id).length > 0;
            return <button key={item.id} type="button" ref={(el) => { familyButtonRefs.current[item.id] = el; }} className="enc-key" disabled={!available} onClick={() => selectFamily(item.id)}>
              <span className="enc-key-glyph" aria-hidden="true">{item.mark}</span>
              <strong className="enc-key-label">{item.label}</strong>
            </button>;
          })}
        </div>}
        {family && <div className="enc-choices" data-count={choices.length} ref={panelRef} tabIndex="-1" role="group" aria-label={`${family} choices`}>
          <div className="enc-choices-head"><p className="enc-choices-title">{familyLabel} · choose a line</p><button type="button" className="enc-back" onClick={closePanel}>All moves</button></div>
          {choices.map((choice) => <button type="button" className="enc-choice" key={choice.id} onClick={() => commit(choice.id)}>{choice.label}</button>)}
        </div>}
      </section>
    </div>
    {handheldOpen && <RxHandheld
      levelLabel={level.label}
      objectives={objectives}
      sharedDetails={sharedFor(run)}
      segments={segments}
      onClose={closeHandheld}
      dialogRef={handheldRef}
    />}
  </main>;
}

// The flow, one idea per screen (Kevin, 2026-09-15): SELECT FILE -> patient dossier
// -> briefing -> encounter -> mission status -> debrief -> talk about it. Each file's
// level is fixed (patients.js), so there is no difficulty select. Replay value comes
// from each patient's branching tree and the endings still to find.
export default function CounterIntelligence() {
  const [screen, setScreen] = useState("select");
  const [patientId, setPatientId] = useState(PATIENTS[0].id);
  const [run, setRun] = useState(null);
  // The endings found this session, per patient, and whether the last run found a new
  // one. React memory only: no storage and no export, so a ranking can never become
  // employee data (the partners' guardrail). A reload starts fresh.
  const [found, setFound] = useState({});
  const [freshEnding, setFreshEnding] = useState(false);
  const patient = patientById(patientId) ?? PATIENTS[0];
  const sideways = usePhoneSideways();

  const openFile = (id) => { setPatientId(id); setScreen("dossier"); };
  const startRun = () => { setRun(createRun(patient.id)); setScreen("encounter"); };
  const onTurn = (next) => {
    setRun(next);
    if (next.phase !== "ended") return;
    const had = found[next.patientId] ?? [];
    const fresh = !had.includes(next.ending);
    setFreshEnding(fresh);
    if (fresh) setFound({ ...found, [next.patientId]: [...had, next.ending] });
    setScreen("status");
  };

  // Mission status and the debrief render the outcome as data (outcomes.js).
  const outcome = run?.phase === "ended" ? outcomeFor(run, patient) : null;
  let view = <SelectFile patients={PATIENTS} found={found} onOpen={openFile} />;
  if (screen === "dossier") view = <Dossier patient={patient} found={found[patient.id] ?? []} onBriefing={() => setScreen("briefing")} onCounter={startRun} onPrevious={() => setScreen("select")} />;
  else if (screen === "briefing") view = <Briefing patient={patient} onAccept={startRun} onCancel={() => setScreen("dossier")} />;
  else if (run && screen === "encounter") view = <Encounter run={run} levelId={patient.level} onTurn={onTurn} />;
  else if (outcome && screen === "status") view = <MissionStatus patient={patient} outcome={outcome} fresh={freshEnding} found={found[patient.id] ?? []} onContinue={() => setScreen("debrief")} />;
  else if (outcome && screen === "debrief") view = <Debrief patient={patient} run={run} outcome={outcome} onContinue={() => setScreen("huddle")} />;
  else if (run && screen === "huddle") view = <Huddle run={run} onAnotherTake={() => setScreen("dossier")} onSelectFile={() => setScreen("select")} />;
  // A phone on its side sees one notice. The game underneath stays mounted but inert,
  // so turning back finds the same screen, run and endings.
  return <>
    <div className="ci-app" inert={sideways ? "" : undefined}>{view}</div>
    {sideways && <PortraitOnly />}
  </>;
}
