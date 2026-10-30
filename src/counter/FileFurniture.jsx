import { useId } from "react";

// The patient files' furniture, drawn in code rather than lifted from anywhere:
// an engraved Bowl of Hygieia where the classic N64 shooter's dossier carried a royal crest, a
// steel paperclip, the red Rx cursor that stands in for the crosshair (the
// approved swap: a prescription mark in a ring, never a gun sight), a rubber
// stamp, and a clipped photo print. Every colour comes from a theme token, through
// the classes in files.css.

// The wreath: two laurel branches on one circle, leaves alternating either side.
const WREATH = { cx: 60, cy: 70, r: 48, from: 106, to: 244, leaves: 11 };
const polar = (angle, radius = WREATH.r) => {
  const rad = (angle * Math.PI) / 180;
  return [WREATH.cx + radius * Math.cos(rad), WREATH.cy + radius * Math.sin(rad)];
};
const fixed = (n) => Number(n.toFixed(2));
const LEFT_LEAVES = Array.from({ length: WREATH.leaves }, (_, index) => {
  const angle = WREATH.from + ((WREATH.to - WREATH.from) * index) / (WREATH.leaves - 1);
  const [x, y] = polar(angle, WREATH.r + (index % 2 ? -4.2 : 4.2));
  return { x: fixed(x), y: fixed(y), r: fixed(angle + 90 + (index % 2 ? 28 : -28)) };
});
const mirror = ({ x, y, r }) => ({ x: fixed(120 - x), y, r: fixed(180 - r) });
const LEAVES = [...LEFT_LEAVES, ...LEFT_LEAVES.map(mirror)];
const [bx, by] = polar(WREATH.from).map(fixed);
const [tx, ty] = polar(WREATH.to).map(fixed);
const BRANCHES = `M${bx} ${by} A${WREATH.r} ${WREATH.r} 0 0 1 ${tx} ${ty} M${fixed(120 - bx)} ${by} A${WREATH.r} ${WREATH.r} 0 0 0 ${fixed(120 - tx)} ${ty}`;
// Engraver's shading across the inside of the bowl.
const HATCH = [[56, 25], [61, 23], [66, 20], [71, 16], [76, 10]];
// The serpent coils the stem twice, climbs the bowl's left side and leans over the rim.
const SERPENT = "M73 114 C63 117 51 112 51 106 C51 100 69 101 69 95 C69 89 52 91 51 85 C49 77 33 70 32 57 C31 44 43 35 54 38 C59 40 61.5 43 61 46";

function CrestArt() {
  return <>
    <path className="ci-crest-branch" d={BRANCHES} />
    {LEAVES.map((leaf, index) => <ellipse key={index} className="ci-crest-leaf" cx={leaf.x} cy={leaf.y} rx="5.8" ry="2.3" transform={`rotate(${leaf.r} ${leaf.x} ${leaf.y})`} />)}
    <path className="ci-crest-knot" d="M52 118 C56 113 64 113 68 118 M60 116 L55 125 M60 116 L65 125" />
    <path className="ci-crest-line" d="M33 50 C35 72 48 81 60 81 C72 81 85 72 87 50" />
    <ellipse className="ci-crest-line" cx="60" cy="50" rx="27" ry="5.2" />
    {HATCH.map(([y, w]) => <line key={y} className="ci-crest-hatch" x1={60 - w} y1={y} x2={60 + w} y2={y} />)}
    <path className="ci-crest-line" d="M56.5 81 L57.5 108 M63.5 81 L62.5 108" />
    <ellipse className="ci-crest-line" cx="60" cy="92" rx="5.6" ry="2" />
    <path className="ci-crest-line" d="M44 117 C48 110 72 110 76 117" />
    <ellipse className="ci-crest-line" cx="60" cy="117.5" rx="16" ry="3.4" />
    <path className="ci-crest-serpent" d={SERPENT} />
    <path className="ci-crest-serpent-core" d={SERPENT} />
    <ellipse className="ci-crest-head" cx="61" cy="45.5" rx="5" ry="3" transform="rotate(64 61 45.5)" />
  </>;
}

// tone "engraved": pressed into the dossier's paper. tone "gilt": gold-blocked
// onto a closed folder's cover.
export function HygieiaCrest({ tone = "engraved", className = "" }) {
  return <svg className={`ci-crest ci-crest--${tone} ${className}`} viewBox="0 0 120 132" aria-hidden="true" focusable="false">
    <g className="ci-crest-under" transform="translate(0.9 0.9)"><CrestArt /></g>
    <g className="ci-crest-over"><CrestArt /></g>
  </svg>;
}

// A two-loop wire paperclip, drawn as one stroked path.
const CLIP = "M9 16 V46 a4 4 0 0 0 8 0 V10 a7 7 0 0 0 -14 0 V50 a10 10 0 0 0 20 0 V20";
export function Paperclip({ className = "" }) {
  return <svg className={`ci-clip ${className}`} viewBox="0 0 26 64" aria-hidden="true" focusable="false">
    <path className="ci-clip-shadow" d={CLIP} transform="translate(1.4 1.8)" />
    <path className="ci-clip-wire" d={CLIP} />
    <path className="ci-clip-shine" d={CLIP} />
  </svg>;
}

// The red Rx cursor: the prescription mark itself, an R whose leg runs on past
// the line and is crossed. No ring around it: a ringed R reads as a trademark
// sign, and a ring with ticks is a gun sight.
const RX = "M11 29 V7 H19 C24.5 7 27 10 27 13.5 C27 17 24.5 20 19 20 H11 M17 20 L31 36 M22 35 L32 25";
export function RxCursor({ className = "" }) {
  return <svg className={`ci-rx-cursor ${className}`} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <path className="ci-rx-halo" d={RX} />
    <path className="ci-rx-mark" d={RX} />
  </svg>;
}

// A rubber stamp: decoration, so screen readers skip it. Kevin picked this look on
// 2026-09-15 from three open-source options, and it is the one that ships nothing:
// the worn ink is an SVG filter, fractal turbulence displacing the glyphs (after
// MDN's public-domain feDisplacementMap sample), on the game's own menu face.
//
// Each line is set wider toward the widest one, a short line spreading by up to
// STRETCH and no further, so a short word never gaps out across the plate. Widths
// come from the character count in the viewBox's own units, so nothing has to be
// measured in the DOM: WebKit reports a zero text length on a freshly inserted
// <text> until layout has run, and this way it never asks. Lines sit close, as on a
// real plate, which also keeps the letters at 13px or more in the space the page
// has for the stamp (the fit guard measures them).
const STAMP_FONT = 100; // viewBox units, so the whole stamp scales with its CSS box
const STAMP_LINE = STAMP_FONT * 1.04;
const STAMP_ADVANCE = 0.92; // the menu face is wide and geometric, near this per character
const STAMP_STRETCH = 1.45;
export function Stamp({ lines, className = "" }) {
  const ink = `ci-ink-${useId().replace(/:/g, "")}`;
  if (!lines.length) return null;
  const widest = Math.max(...lines.map((line) => line.length)) * STAMP_ADVANCE * STAMP_FONT;
  const width = widest + STAMP_FONT * 0.4;
  const height = lines.length * STAMP_LINE + STAMP_FONT * 0.2;
  return <p className={`ci-stamp ${className}`} aria-hidden="true">
    <svg className="ci-stamp-ink" viewBox={`0 0 ${width} ${height}`} focusable="false">
      <defs>
        <filter id={ink} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015 0.09" numOctaves="2" seed="7" stitchTiles="stitch" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={STAMP_FONT * 0.1} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {lines.map((line, index) => (
        <text
          key={index}
          x={width / 2}
          y={STAMP_FONT * 0.9 + index * STAMP_LINE}
          textAnchor="middle"
          fontSize={STAMP_FONT}
          textLength={Math.min(widest, line.length * STAMP_ADVANCE * STAMP_FONT * STAMP_STRETCH)}
          lengthAdjust="spacing"
          filter={`url(#${ink})`}
        >{line.toUpperCase()}</text>
      ))}
    </svg>
  </p>;
}

// A photo print in a white border, paperclipped to whatever it sits on.
export function Photo({ src, alt, className = "" }) {
  return <figure className={`ci-photo ${className}`}>
    <img src={src} alt={alt} width="320" height="400" decoding="async" draggable="false" />
    <Paperclip className="ci-photo-clip" />
  </figure>;
}
