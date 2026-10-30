import { arcSegmentPaths } from "./hud.js";
import { hud } from "./theme.js";

// The segmented HUD arcs. The orange arc (left) lights one segment per exchange
// used. The blue arc (right) is decoration: always fully lit, carrying no data,
// so nothing on screen counts down. Never a meter on the patient or the player.
const HUD_ARC = { radius: 300, span: 21, gap: 1.4, thickness: [10, 17] };

// Each arc samples its colour ramp across however many segments it draws, so a longer
// exchange cap never points a segment at a colour that does not exist. Six segments
// on a six-colour ramp map one to one, exactly as before.
export const rampIndex = (index, count, length) => (count <= 1 ? 0 : Math.round((index * (length - 1)) / (count - 1)));

export function ArcSegments({ paths, lit, tone }) {
  const length = hud[tone].length;
  return <g className={`enc-arc-segs enc-arc-segs--${tone}`}>
    {paths.map((d, index) => <path key={index} d={d} className={index < lit ? "is-lit" : undefined} style={{ "--seg": `var(--enc-arc-${tone}-${rampIndex(index, paths.length, length)})` }} />)}
  </g>;
}

export function ExchangeArcs({ used, total }) {
  const left6 = arcSegmentPaths({ side: "left", total, cx: 6 + HUD_ARC.radius, cy: 120, ...HUD_ARC });
  const right6 = arcSegmentPaths({ side: "right", total, cx: 54 - HUD_ARC.radius, cy: 120, ...HUD_ARC });
  return <>
    <svg className="enc-hud-arc enc-hud-arc--left" viewBox="0 0 60 240" aria-hidden="true" focusable="false">
      <ArcSegments paths={left6} lit={used} tone="orange" />
    </svg>
    <svg className="enc-hud-arc enc-hud-arc--right" viewBox="0 0 60 240" aria-hidden="true" focusable="false">
      <ArcSegments paths={right6} lit={total} tone="blue" />
    </svg>
  </>;
}

// The HUD's handheld control: a small dark rounded body with a green screen
// still showing the chosen tier's glyph, and a camera dot and earpiece slot
// echoing the full Rx handheld it opens.
export function HandheldGlyph({ label }) {
  return <svg viewBox="0 0 56 56" aria-hidden="true" focusable="false">
    <rect className="enc-glyph-body" x="14" y="3" width="28" height="50" rx="7" />
    <rect className="enc-glyph-bumper" x="14" y="3" width="28" height="7" rx="3.5" />
    <rect className="enc-glyph-bumper" x="14" y="46" width="28" height="7" rx="3.5" />
    <circle className="enc-glyph-lens" cx="21" cy="9" r="1.6" />
    <rect className="enc-glyph-ear" x="24.5" y="7.5" width="7" height="2" rx="1" />
    <rect className="enc-glyph-lcd" x="16" y="14" width="24" height="28" rx="3" />
    <text className="enc-glyph-text" x="28" y="31.5" textAnchor="middle">{label}</text>
  </svg>;
}
