import { useRef } from "react";
import { rampIndex } from "./ExchangeArcs.jsx";
import { hud } from "./theme.js";

// The Rx handheld: the classic N64 shooter's pause menu, replacing the Rx watch (Kevin's ruling
// of 2026-09-15 is quoted in the design notes). A rugged near-black body
// with rubber corner bumpers, side scan-trigger buttons, a camera and earpiece
// slot, the game's own small embossed Rx where a maker's wordmark would sit, a
// green terminal screen with mission status, the chosen tier's objectives (goals
// only, never a live scoreboard) and what the patient has shared out loud. Its
// one control returns to the encounter: no existing game action maps to ABORT or
// CONFIRM, so they are left out rather than drawn dead. The gadget gag is a
// counting tray, never a laser, and carries no number.

const VIEW = { x: -14, y: 0, w: 388, h: 600 };
const BODY_OUTER = { x: 8, y: 6, w: 344, h: 588, r: 42 };
const BODY_INNER = { x: 20, y: 18, w: 320, h: 564, r: 22 };
// The screen fills nearly the whole face, as on the device Kevin shared (2026-09-15):
// thin side bezels, the camera and earpiece above it, and Android's softkeys along
// its own foot. NAV is that softkey strip, so the text stops above it.
const LCD = { x: 30, y: 70, w: 300, h: 482, r: 10 };
const NAV = 34;
const SOFTKEY_Y = LCD.y + LCD.h - NAV / 2;
const CX = (BODY_INNER.x + BODY_INNER.x + BODY_INNER.w) / 2; // 180, the body's own centre line

const roundedRect = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const BODY_OUTER_PATH = roundedRect(BODY_OUTER.x, BODY_OUTER.y, BODY_OUTER.w, BODY_OUTER.h, BODY_OUTER.r);
const BODY_INNER_PATH = roundedRect(BODY_INNER.x, BODY_INNER.y, BODY_INNER.w, BODY_INNER.h, BODY_INNER.r);
// The two rounded rects together, evenodd-filled, read as a ring: the rubber
// bumper frame, thinnest along the flat edges and thickest at the corners,
// where the gap between the two different corner radii is widest.
const BUMPER_RING_PATH = `${BODY_OUTER_PATH}${BODY_INNER_PATH}`;
const LCD_PATH = roundedRect(LCD.x, LCD.y, LCD.w, LCD.h, LCD.r);
const LCD_BOX = {
  left: `${((LCD.x - VIEW.x) / VIEW.w) * 100}%`,
  top: `${((LCD.y - VIEW.y) / VIEW.h) * 100}%`,
  width: `${(LCD.w / VIEW.w) * 100}%`,
  height: `${((LCD.h - NAV) / VIEW.h) * 100}%`,
};
// Six speaker slots, evenly spaced in the bezel under the screen.
const SPEAKER_SLOTS = Array.from({ length: 6 }, (_, index) => CX - 57 + index * 20);

// One segment per exchange, coloured like the HUD's orange arc: the same ramp,
// sampled the same way, so a longer conversation still runs light to dark.
function SegmentRow({ used, total }) {
  return <div className="enc-hh-segments" role="presentation">
    {Array.from({ length: total }, (_, index) => (
      <span key={index} className={index < used ? "is-lit" : undefined} style={{ "--seg": `var(--enc-arc-orange-${rampIndex(index, total, hud.orange.length)})` }} />
    ))}
  </div>;
}

function HandheldFace() {
  return <svg className="enc-handheld-face" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="enc-hh-sheen" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" className="enc-hh-stop-sheen" />
        <stop offset="0.45" className="enc-hh-stop-mid" />
        <stop offset="1" className="enc-hh-stop-dark" />
      </linearGradient>
      <linearGradient id="enc-hh-lcd" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" className="enc-stop-lcd" />
        <stop offset="1" className="enc-stop-lcd-deep" />
      </linearGradient>
      <pattern id="enc-hh-scan" width="4" height="4" patternUnits="userSpaceOnUse">
        <rect className="enc-lcd-scanline" width="4" height="1.2" />
      </pattern>
    </defs>
    {/* the two side scan-trigger buttons, one pair per long edge */}
    <rect className="enc-hh-button" x={BODY_OUTER.x - 14} y="180" width="16" height="48" rx="6" />
    <rect className="enc-hh-button" x={BODY_OUTER.x - 14} y="260" width="16" height="48" rx="6" />
    <rect className="enc-hh-button" x={BODY_OUTER.x + BODY_OUTER.w - 2} y="180" width="16" height="48" rx="6" />
    <rect className="enc-hh-button" x={BODY_OUTER.x + BODY_OUTER.w - 2} y="260" width="16" height="48" rx="6" />
    {/* the rubber bumper frame, thicker at the corners than along the edges */}
    <path className="enc-hh-bumper" d={BUMPER_RING_PATH} fillRule="evenodd" clipRule="evenodd" />
    {/* the body face, near-black with a faint vertical sheen */}
    <path className="enc-hh-body" d={BODY_INNER_PATH} fill="url(#enc-hh-sheen)" />
    <circle className="enc-hh-lens" cx={CX - 128} cy="44" r="8" />
    <rect className="enc-hh-earpiece" x={CX - 44} y="38" width="88" height="10" rx="5" />
    {/* the game's own small mark, opposite the camera, where a maker's wordmark sat on the reference device */}
    <text className="enc-hh-mark" x={CX + 128} y="49" textAnchor="middle">Rx</text>
    <path className="enc-hh-lcd-edge" d={LCD_PATH} fill="url(#enc-hh-lcd)" />
    <path d={LCD_PATH} fill="url(#enc-hh-scan)" />
    {/* Android's three softkeys along the screen's own foot: decoration only, never buttons */}
    <polygon className="enc-hh-nav" points={`${CX - 52},${SOFTKEY_Y - 10} ${CX - 52},${SOFTKEY_Y + 10} ${CX - 68},${SOFTKEY_Y}`} />
    <circle className="enc-hh-nav-home" cx={CX} cy={SOFTKEY_Y} r="9" />
    <rect className="enc-hh-nav" x={CX + 43} y={SOFTKEY_Y - 9} width="18" height="18" rx="2" />
    <g className="enc-hh-speaker">
      {SPEAKER_SLOTS.map((x) => <rect key={x} x={x} y={LCD.y + LCD.h + 12} width="14" height="6" rx="2" />)}
    </g>
  </svg>;
}

// The pause comes in the way the classic N64 shooter's did: the wrist is raised into view. Here
// the whole handheld rises from below on the player's own lab-coat sleeve and
// cuff, and settles with no overshoot. No fingers are drawn: Kevin chose the
// sleeve alone over any drawn hand (2026-09-15). Under reduced motion it is
// simply there.
// The level is the patient file's own, fixed (patients.js).
export default function RxHandheld({ levelLabel, objectives, sharedDetails, segments, onClose, dialogRef }) {
  const resumeRef = useRef(null);
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      event.preventDefault();
      resumeRef.current?.focus();
    }
  };
  return <div className="enc-handheld-scrim" onClick={onClose}>
    <section className="enc-handheld" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Rx handheld" onClick={(event) => event.stopPropagation()} onKeyDown={onKeyDown}>
      <div className="enc-forearm" aria-hidden="true" />
      <div className="enc-handheld-case">
        <HandheldFace />
        <div className="enc-lcd" style={LCD_BOX}>
          <div className="enc-lcd-statusbar">
            <SegmentRow {...segments} />
            <span className="enc-hh-status-icons" aria-hidden="true"><i className="enc-hh-wifi" /><i className="enc-hh-battery" /></span>
          </div>
          <p className="enc-lcd-title">Rx HANDHELD v2.01 BETA</p>
          <p className="enc-lcd-status">MISSION STATUS: IN PROGRESS</p>
          <button type="button" ref={resumeRef} className="enc-lcd-key" onClick={onClose}>RESUME</button>
          <h2 className="enc-lcd-head">OBJECTIVES · {levelLabel.toUpperCase()}</h2>
          <ul className="enc-lcd-list enc-lcd-objectives">
            {objectives.map((objective) => <li key={objective.id}>{objective.text}</li>)}
          </ul>
          <h2 className="enc-lcd-head">SHARED OUT LOUD</h2>
          <ul className="enc-lcd-list enc-lcd-shared">
            {sharedDetails.length
              ? sharedDetails.map((detail) => <li key={detail.id}>“{detail.label}”</li>)
              : <li className="is-quiet">Nothing yet.</li>}
          </ul>
          <p className="enc-lcd-gadget">
            <span>COUNTING TRAY</span>
            <span className="enc-tray" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            <span>BY FIVES</span>
          </p>
        </div>
      </div>
    </section>
  </div>;
}
