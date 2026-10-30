// The orange HUD arc shows exchange progress and nothing else: one segment per
// exchange used, from the turn count alone, so it can never turn into a meter on
// the patient (what they shared) or on the player (offers made, objectives met).
// Kevin, 2026-09-15: the blue arc carries no data at all. It stays fully lit, so
// nothing on screen counts down.
export function exchangeSegments(run) {
  const total = run.maxTurns;
  return { total, used: Math.min(Math.max(run.turns, 0), total) };
}

// One segmented arc, as SVG path data, bottom segment first. the classic N64 shooter's arcs
// are chunky trapezoids that grow toward the top; `thickness` runs from the
// bottom segment's to the top segment's. Angles are in degrees.
export function arcSegmentPaths({ side, total, cx, cy, radius, span, gap, thickness }) {
  const [thin, thick] = thickness;
  const step = (2 * span - gap * (total - 1)) / total;
  const rad = (deg) => (deg * Math.PI) / 180;
  const point = (r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))].map((n) => n.toFixed(2)).join(" ");
  const paths = [];
  for (let index = 0; index < total; index += 1) {
    // Left arcs sweep around 180 degrees, right arcs around 0; SVG y grows downward,
    // so "bottom first" means starting at +span on the right and 180-span on the left.
    const start = side === "left" ? 180 - span + index * (step + gap) : span - index * (step + gap) - step;
    const end = start + step;
    const t = total > 1 ? index / (total - 1) : 1;
    const inner = radius - (thin + (thick - thin) * t);
    paths.push(`M ${point(radius, start)} A ${radius} ${radius} 0 0 1 ${point(radius, end)} L ${point(inner, end)} A ${inner} ${inner} 0 0 0 ${point(inner, start)} Z`);
  }
  return paths;
}
