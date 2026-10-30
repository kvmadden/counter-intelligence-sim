import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, IcosahedronGeometry, Mesh, OctahedronGeometry, Quaternion, Vector3 } from "three";
import { patientPalettes } from "../theme.js";
import { merge, painted, place, triangles, tube } from "./geometry.js";
import { litColor, litFlat, litTextured } from "./materials.js";

// The patients, built the way the console's characters were: low-poly but shaped.
// Tapered limbs, a faceted torso with bevelled shoulders, mitten hands, and a
// head of a handful of rings (an elongated faceted form, never a cube) with the
// photo projected across its front. Jordan came first. Every other patient is a
// look (LOOKS, below) over the same rig: a build, a head, clothes and hair of
// their own, each inside the console's 300 to 800 triangles.

// The head's rings, chin to crown, in metres from the top of the neck: height,
// half-width, front and back reach, and how far the front vertex (the nose
// line) stands proud of the ring. Eight sides, with a vertex dead ahead.
const HEAD_SIDES = 8;
export const HEAD_RINGS = [
  { y: -0.015, rx: 0.044, zf: 0.05, zb: 0.04, nose: 0 },
  { y: 0.02, rx: 0.064, zf: 0.096, zb: 0.062, nose: 0 },
  { y: 0.068, rx: 0.084, zf: 0.102, zb: 0.086, nose: 0.004 },
  { y: 0.112, rx: 0.092, zf: 0.104, zb: 0.096, nose: 0.022 },
  { y: 0.152, rx: 0.094, zf: 0.1, zb: 0.1, nose: 0.01 },
  { y: 0.192, rx: 0.092, zf: 0.098, zb: 0.102, nose: 0 },
  { y: 0.232, rx: 0.083, zf: 0.086, zb: 0.098, nose: 0 },
  { y: 0.264, rx: 0.056, zf: 0.056, zb: 0.074, nose: 0 },
];
const HEAD_TOP = 0.279;
// Where the face photo lands: cheek to cheek and chin to hairline. The crop
// carries a little hair at each edge, so the sides blend into the hair. Every
// patient's crop (scripts/make-face-texture.mjs) puts the eyes, nose and mouth on
// the same rings, so this one mapping serves every head.
const FACE = { halfWidth: 0.1, chin: 0.004, top: 0.262 };
// Bands 1..6 (chin to crown), on the four sides facing forward, carry the photo.
const faceSide = (k) => k === 0 || k === 1 || k === HEAD_SIDES - 1 || k === HEAD_SIDES - 2;

function ringPoint(ring, k) {
  const a = (k / HEAD_SIDES) * Math.PI * 2;
  const c = Math.cos(a);
  return [ring.rx * Math.sin(a), ring.y, (c >= 0 ? ring.zf : ring.zb) * c + (k % HEAD_SIDES === 0 ? ring.nose : 0)];
}

// Builds the head as one smooth-shaded loft, then splits its triangles into the
// photo face (planar UVs, projected from the front, as the console did it), the
// skin under the jaw, and the hair everywhere else. `photo` says how a crop that runs
// on up over the crown lies on the head: `top`, the height its top edge reaches, and
// `hairline`, how far down the crop its own hairline sits. That hairline is pinned to
// the ring above the forehead (ring 6), so the brow shortens a little and the hair
// above it spreads over the crown, the way a painted N64 texture was fitted to a head.
function headParts(rings = HEAD_RINGS, headTop = HEAD_TOP, photo = null) {
  const positions = [];
  rings.forEach((ring) => {
    for (let k = 0; k < HEAD_SIDES; k += 1) positions.push(...ringPoint(ring, k));
  });
  positions.push(0, headTop, -0.006);
  const top = rings.length * HEAD_SIDES;
  const quads = [];
  const index = [];
  for (let band = 0; band < rings.length - 1; band += 1) {
    for (let k = 0; k < HEAD_SIDES; k += 1) {
      const a = band * HEAD_SIDES + k;
      const b = band * HEAD_SIDES + ((k + 1) % HEAD_SIDES);
      const region = band === 0 ? "skin" : faceSide(k) ? "face" : "hair";
      // Wound so every face points outward.
      quads.push([region, [a, b, a + HEAD_SIDES], [b, b + HEAD_SIDES, a + HEAD_SIDES]]);
      index.push(a, b, a + HEAD_SIDES, b, b + HEAD_SIDES, a + HEAD_SIDES);
    }
  }
  for (let k = 0; k < HEAD_SIDES; k += 1) {
    const a = (rings.length - 1) * HEAD_SIDES + k;
    const b = (rings.length - 1) * HEAD_SIDES + ((k + 1) % HEAD_SIDES);
    quads.push(["hair", [a, b, top]]);
    index.push(a, b, top);
  }
  // Smooth normals from the whole closed form, so the face and hair shade as one head.
  const whole = new BufferGeometry();
  whole.setAttribute("position", new Float32BufferAttribute(positions, 3));
  whole.setIndex(index);
  whole.computeVertexNormals();
  const normal = whole.getAttribute("normal");

  const parts = { face: [], hair: [], skin: [] };
  for (const [region, ...tris] of quads) for (const tri of tris) parts[region].push(...tri);
  const build = (vertices, uvOf) => {
    const pos = [];
    const nor = [];
    const uv = [];
    for (const v of vertices) {
      const [x, y, z] = positions.slice(v * 3, v * 3 + 3);
      pos.push(x, y, z);
      nor.push(normal.getX(v), normal.getY(v), normal.getZ(v));
      uv.push(...uvOf(x, y, z, v));
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(nor, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    return geometry;
  };
  const edge = photo?.top ?? FACE.top;
  const linear = (y) => (y - FACE.chin) / (edge - FACE.chin);
  const [brow, hairline] = [rings[4].y, rings[6].y];
  const fitted = (y) => {
    if (y <= brow) return linear(y);
    if (y <= hairline) return lerp(linear(brow), 1 - photo.hairline, (y - brow) / (hairline - brow));
    return lerp(1 - photo.hairline, 1, (y - hairline) / (edge - hairline));
  };
  const planar = (x, y) => [0.5 + x / (2 * FACE.halfWidth), photo?.hairline == null ? linear(y) : fitted(y)];
  const wrap = (x, y, z) => [(Math.atan2(x, z) / Math.PI + 1) * 2, y / 0.08];
  return { face: build(parts.face, planar), hair: build(parts.hair, wrap), skin: build(parts.skin, wrap) };
}

// Her curls: separate rounded clumps over the crown, a short fringe at the
// hairline, curls framing the face down past the jaw, and more falling to the
// shoulders at the back. Clumps with gaps between them, never one smooth shell
// (Kevin, 2026-09-15: the shell read as a helmet). The ones you see are
// twenty-sided, so the outline is bumpy rather than spiky; the ones hidden
// behind her head are eight-sided, to keep her inside the triangle budget.
// [x, y, z, width, height, depth, turn], head space; side curls mirror.
const CROWN_CURLS = [
  [0, 0.278, -0.006, 0.066, 0.034, 0.064, 0.3],
  [-0.06, 0.264, -0.028, 0.052, 0.038, 0.056, -0.5],
  [0.062, 0.268, -0.02, 0.052, 0.036, 0.054, 0.6],
  [-0.042, 0.252, 0.054, 0.038, 0.026, 0.032, 0.4],
  [0.03, 0.258, 0.06, 0.042, 0.024, 0.032, -0.3],
];
const SIDE_CURLS = [
  [0.098, 0.2, 0.004, 0.034, 0.046, 0.042, 0.4],
  [0.11, 0.12, -0.008, 0.036, 0.052, 0.046, -0.3],
  [0.104, 0.038, -0.022, 0.034, 0.052, 0.044, 0.5],
  [0.09, -0.046, -0.044, 0.032, 0.046, 0.042, -0.4],
];
const BACK_CURLS = [
  [0, 0.266, -0.07, 0.06, 0.044, 0.05, 0.2],
  [0, 0.18, -0.1, 0.07, 0.07, 0.04, 0.1],
  [-0.058, 0.082, -0.094, 0.05, 0.07, 0.04, -0.4],
  [0.06, 0.08, -0.094, 0.05, 0.068, 0.04, 0.5],
  [0, -0.022, -0.09, 0.068, 0.07, 0.04, -0.2],
  [-0.05, -0.08, -0.07, 0.044, 0.05, 0.035, 0.3],
  [0.05, -0.08, -0.07, 0.044, 0.05, 0.035, -0.3],
];
const clump = (Shape) => ([x, y, z, w, h, d, turn]) => place(new Shape(1, 0).scale(w, h, d), { x, y, z, ry: turn, rz: turn * 0.4 });
function curls() {
  const round = clump(IcosahedronGeometry);
  return merge([
    ...CROWN_CURLS.map(round),
    ...SIDE_CURLS.flatMap(([x, y, z, w, h, d, turn]) => [round([x, y, z, w, h, d, turn]), round([-x, y, z, w, h, d, -turn])]),
    ...BACK_CURLS.map(clump(OctahedronGeometry)),
    // A panel of hair behind her neck, where the curls fall to her shoulders: without
    // it the storefront's daylight shows through beside her jaw.
    place(new BoxGeometry(0.2, 0.13, 0.02), { y: -0.045, z: -0.052 }),
  ]);
}

// Her arm, shoulder to wrist (x mirrors for the other side), each ring thinner
// than the last. The forearms angle in, so her hands rest near each other on the
// counter, as someone leaning on it waiting would, not laid out like a mannequin's.
export const ARM = {
  joints: [[0.198, 1.462, -0.006], [0.228, 1.27, 0], [0.24, 1.08, 0.018], [0.204, 1.008, 0.16], [0.13, 0.988, 0.29]],
  radii: [0.048, 0.043, 0.039, 0.034, 0.028],
};

// Jordan's body, the rig every look is measured from. A slim, tall, fitted build:
// a faceted torso that narrows to the waist, bevelled shoulders and a sloped
// trapezius to the neck, the neck, a ribbed collar, and mitten hands with a thumb each.
const JORDAN_BODY = {
  torso: {
    points: [[0, 0.84, 0], [0, 1.04, 0], [0, 1.22, 0.004], [0, 1.36, 0.006], [0, 1.46, 0], [0, 1.51, -0.004], [0, 1.53, -0.004]],
    radii: [[0.135, 0.085], [0.14, 0.09], [0.16, 0.1], [0.184, 0.106], [0.194, 0.09], [0.134, 0.068], [0.06, 0.05]],
  },
  arm: ARM,
  neck: { points: [[0, 1.49, -0.004], [0, 1.6, 0.006]], radii: [0.043, 0.041] },
  rib: { points: [[0, 1.5, -0.004], [0, 1.546, -0.002]], radii: [[0.07, 0.058], [0.061, 0.052]] },
  palm: { points: [[0.124, 0.984, 0.284], [0.088, 0.976, 0.34], [0.064, 0.969, 0.37]], radii: [[0.034, 0.016], [0.036, 0.014], [0.025, 0.01]] },
  thumb: { points: [[0.1, 0.99, 0.296], [0.078, 0.986, 0.3]], radii: [0.013, 0.01] },
  headAt: [0, 1.565, 0.01],
};

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((value, i) => lerp(value, b[i], t));
const scaleRadius = (r, s) => (Array.isArray(r) ? r.map((value) => value * s) : r * s);

// Another build from Jordan's rig. `lift` raises the shoulders, neck and head (a
// taller or shorter patient), fading to nothing at the hips, which the counter
// hides. `shoulders` and `waist` widen the torso at the top and the bottom, `depth`
// deepens it front to back, and `belly` adds depth low down. `stoop` brings the
// shoulders and head forward. `limbs` thickens the arms and hands, `neck` the
// neck. The forearms and hands stay on the counter whatever the height.
function derive({ lift = 0, shoulders = 1, waist = 1, depth = 1, belly = 1, stoop = 0, limbs = 1, neck = 1 }) {
  const { torso, arm, palm, thumb } = JORDAN_BODY;
  const rise = (y) => clamp01((y - 0.84) / (1.53 - 0.84));
  const move = ([x, y, z]) => [x, y + lift * rise(y), z + stoop * rise(y) ** 2];
  const last = torso.points.length - 1;
  const spread = [shoulders, shoulders, lerp(1, shoulders, 0.8), lerp(1, shoulders, 0.5), lerp(1, shoulders, 0.3)];
  const reach = [rise(arm.joints[0][1]), 0.6, 0.25, 0, 0];
  const lean = [0.8, 0.4, 0, 0, 0];
  const joints = arm.joints.map(([x, y, z], j) => [x * spread[j], y + lift * reach[j], z + stoop * lean[j]]);
  const shift = joints[4][0] - arm.joints[4][0];
  const hand = ({ points, radii }) => ({ points: points.map(([x, y, z]) => [x + shift, y, z]), radii: radii.map((r) => scaleRadius(r, limbs)) });
  const collar = ({ points, radii }) => ({
    points: points.map(([x, y, z]) => [x, y + lift, z + stoop]),
    radii: radii.map((r) => scaleRadius(r, neck)),
  });
  return {
    torso: {
      points: torso.points.map(move),
      radii: torso.radii.map(([across, along], i) => {
        const k = rise(torso.points[i][1]);
        if (i === last) return [across * neck, along * neck];
        return [across * lerp(waist, shoulders, k * k), along * depth * lerp(belly, 1, k)];
      }),
    },
    arm: { joints, radii: arm.radii.map((r) => r * limbs) },
    neck: collar(JORDAN_BODY.neck),
    rib: collar(JORDAN_BODY.rib),
    palm: hand(palm),
    thumb: hand(thumb),
    headAt: [0, JORDAN_BODY.headAt[1] + lift, JORDAN_BODY.headAt[2] + stoop],
  };
}

// The head's own outline at height y, between the two rings around it.
function ringAt(rings, y) {
  const above = rings.findIndex((ring) => ring.y > y);
  const i = above === -1 ? rings.length - 2 : Math.max(0, above - 1);
  const [a, b] = [rings[i], rings[i + 1]];
  const t = clamp01((y - a.y) / (b.y - a.y));
  return { y, rx: lerp(a.rx, b.rx, t), zf: lerp(a.zf, b.zf, t), zb: lerp(a.zb, b.zb, t), nose: lerp(a.nose, b.nose, t) };
}

// How far forward the front of the head stands at (x, y), following its facets, so
// glasses and a mustache sit on the face the photo shows rather than float off it.
function frontOfHead(rings, x, y) {
  const r = ringAt(rings, y);
  const corner = r.rx * Math.SQRT1_2;
  const ax = Math.abs(x);
  if (ax <= corner) return lerp(r.zf + r.nose, r.zf * Math.SQRT1_2, ax / corner);
  return lerp(r.zf * Math.SQRT1_2, 0, clamp01((ax - corner) / (r.rx - corner)));
}

// A point around the head at height y, `turn` radians from straight ahead (a quarter
// turn is the patient's left), `out` times the head's own reach there.
function aroundHead(rings, y, turn, out = 1) {
  const r = ringAt(rings, y);
  const c = Math.cos(turn);
  return [r.rx * Math.sin(turn) * out, y, (c >= 0 ? r.zf : r.zb) * c * out];
}

// The torso's eight-sided rings are turned an eighth so a flat facet faces forward.
// How far forward its surface stands at (x, y), following those facets.
const COS_EIGHTH = Math.cos(Math.PI / 8);
const SIN_EIGHTH = Math.sin(Math.PI / 8);
function frontOfTorso(torso, x, y) {
  const { points, radii } = torso;
  const above = points.findIndex((point) => point[1] > y);
  const i = above === -1 ? points.length - 2 : Math.max(0, above - 1);
  const at = (j) => {
    const [across, along] = radii[j];
    const ax = Math.abs(x);
    const flat = SIN_EIGHTH * across;
    const bend = clamp01((ax - flat) / ((COS_EIGHTH - SIN_EIGHTH) * across));
    const reach = ax <= flat ? COS_EIGHTH * along : lerp(COS_EIGHTH * along, SIN_EIGHTH * along, bend);
    return points[j][2] + reach;
  };
  return lerp(at(i), at(i + 1), clamp01((y - points[i][1]) / (points[i + 1][1] - points[i][1])));
}

// Plain triangles with flat normals and no texture, to be painted and merged. Any
// with no area (a strip column squeezed to nothing) are left out.
function sheet(given) {
  const area = ([a, b, c]) => {
    const [u, v] = [b.map((value, i) => value - a[i]), c.map((value, i) => value - a[i])];
    return Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
  };
  const tris = given.filter((tri) => area(tri) > 1e-9);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(tris.flat(2), 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(new Array((tris.length * 3) * 2).fill(0), 2));
  geometry.computeVertexNormals();
  return geometry;
}

// Paints a part that falls into shade towards its foot, as a tee does between the
// open fronts of a jacket: the top keeps the full colour, the foot `fall` less. `edge`
// darkens it towards its sides too, where the fronts shade it, so it rounds rather
// than lying flat as a board.
function shaded(geometry, hex, fall = 0.22, edge = 0) {
  painted(geometry, hex);
  const position = geometry.getAttribute("position");
  const color = geometry.getAttribute("color");
  const ys = Array.from({ length: position.count }, (_, i) => position.getY(i));
  const reach = Math.max(...Array.from({ length: position.count }, (_, i) => Math.abs(position.getX(i)))) || 1;
  const [top, foot] = [Math.max(...ys), Math.min(...ys)];
  ys.forEach((y, i) => {
    const gain = (1 - fall * ((top - y) / (top - foot || 1))) * (1 - edge * (position.getX(i) / reach) ** 2);
    color.setXYZ(i, color.getX(i) * gain, color.getY(i) * gain, color.getZ(i) * gain);
  });
  return geometry;
}

// A flat strip laid down the front of the torso, a hair proud of it: a tee showing
// between open fronts, a button band, a placket. `rows` run top to bottom as
// [centre x, y, half-width], and every corner follows the torso's own facets.
function frontStrip(torso, given, proud = 0.004, { centre = false } = {}) {
  const corner = (x, y) => [x, y, frontOfTorso(torso, x, y) + proud];
  // A row at every ring the strip crosses, so it bends over the chest with the torso
  // instead of cutting a chord through it.
  const rows = given.flatMap((row, i) => {
    const next = given[i + 1];
    if (!next) return [row];
    const between = torso.points.map(([, y]) => y).filter((y) => y < row[1] && y > next[1]).sort((a, b) => b - a);
    return [row, ...between.map((y) => {
      const t = (row[1] - y) / (row[1] - next[1]);
      return [lerp(row[0], next[0], t), y, lerp(row[2], next[2], t)];
    })];
  });
  // Columns at both edges and wherever the flat front facet bends back, so a wide
  // strip folds with the torso. A `centre` column lets it be shaded across its width.
  const columns = ([x, y, w]) => {
    const above = torso.points.findIndex((point) => point[1] > y);
    const i = above === -1 ? torso.points.length - 2 : Math.max(0, above - 1);
    const t = clamp01((y - torso.points[i][1]) / (torso.points[i + 1][1] - torso.points[i][1]));
    const bend = SIN_EIGHTH * lerp(torso.radii[i][0], torso.radii[i + 1][0], t);
    const inside = (value) => Math.min(x + w, Math.max(x - w, value));
    return [x - w, inside(-bend), centre ? x : inside(-bend), inside(bend), x + w].sort((a, b) => a - b);
  };
  const tris = [];
  for (let i = 0; i < rows.length - 1; i += 1) {
    const [top, foot] = [columns(rows[i]), columns(rows[i + 1])];
    for (let c = 0; c < 4; c += 1) {
      const tl = corner(top[c], rows[i][1]);
      const tr = corner(top[c + 1], rows[i][1]);
      const bl = corner(foot[c], rows[i + 1][1]);
      const br = corner(foot[c + 1], rows[i + 1][1]);
      tris.push([tl, bl, tr], [tr, bl, br]);
    }
  }
  return sheet(tris);
}

// A collar's two leaves, the part you see from across the counter: each runs from
// the side of the neck out towards the shoulder and down to a point on the chest,
// laid on the torso's facets a little proud. [x, drop below `top`] for the neck
// corner, the shoulder corner, the point and the inner corner. Each leaf is a two by
// two grid, every point set on the torso, so it follows the shoulder's curve.
function collarLeaves(torso, top, { neck, shoulder, tip, inner, proud = 0.008 }) {
  const on = (side, [x, drop]) => [side * x, top - drop, frontOfTorso(torso, side * x, top - drop) + proud];
  // Across the leaf from the neck edge (u 0) to the shoulder edge, and down it from the top (v 0) to the point.
  const at = (u, v) => lerp3(lerp3(neck, shoulder, u), lerp3(inner, tip, u), v);
  return sheet([-1, 1].flatMap((side) => {
    const tris = [];
    for (let i = 0; i < 2; i += 1) {
      for (let j = 0; j < 2; j += 1) {
        const [a, b, c, d] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([u, v]) => on(side, at(u / 2, v / 2)));
        tris.push(...(side > 0 ? [[a, d, c], [a, c, b]] : [[a, c, d], [a, b, c]]));
      }
    }
    return tris;
  }));
}

// A ring of cloth at the wrist, a little fuller than the sleeve: a cuff.
function cuffs(arm, width = 1.14) {
  const [, , , forearm, wrist] = arm.joints;
  const [, , , rf, rw] = arm.radii;
  const cuff = (side) => {
    const flip = ([x, y, z]) => [side * x, y, z];
    const [from, to] = [0.7, 0.9];
    return tube([flip(lerp3(forearm, wrist, from)), flip(lerp3(forearm, wrist, to))], [lerp(rf, rw, from) * width, lerp(rf, rw, to) * width], { sides: 6 });
  };
  return [cuff(-1), cuff(1)];
}

// Ears: small rounded flattened forms on the sides of the head, angled back, so a
// short-haired head is not an egg. The photo shows their inner edges.
function ears(rings, { y = 0.128, size = [0.008, 0.028, 0.018] } = {}) {
  const r = ringAt(rings, y);
  return [-1, 1].map((side) => place(new IcosahedronGeometry(1, 0).scale(...size), { x: side * (r.rx + 0.001), y, z: -0.008, ry: -side * 0.3 }));
}

// Sam's hair: short and black, full on top with a fringe falling to his right.
// Clumps with gaps between them, never a shell. [x, y, z, width, height, depth, turn].
const SAM_TUFTS = [
  [0, 0.274, -0.008, 0.078, 0.034, 0.084, 0.2],
  [-0.018, 0.264, 0.05, 0.068, 0.028, 0.048, -0.4],
  [-0.062, 0.244, 0.046, 0.044, 0.028, 0.044, 0.6],
  [0.056, 0.252, 0.036, 0.044, 0.028, 0.05, -0.5],
  [-0.08, 0.222, -0.02, 0.022, 0.044, 0.068, 0.2],
  [0.08, 0.224, -0.02, 0.022, 0.044, 0.068, -0.2],
  [0, 0.236, -0.078, 0.074, 0.05, 0.04, 0.1],
];

// Sam's wire frames, over the pair in his photo: two rims, a bridge, and the arms
// back to his ears. Rims are [x, y] loops in head space, on the face, a little proud.
const SAM_RIMS = [
  [[-0.014, 0.172], [-0.078, 0.174], [-0.082, 0.155], [-0.05, 0.144], [-0.016, 0.15], [-0.014, 0.172]],
  [[0.013, 0.172], [0.084, 0.174], [0.088, 0.155], [0.052, 0.144], [0.015, 0.15], [0.013, 0.172]],
];
function glasses(rings) {
  const on = ([x, y], proud = 0.012) => [x, y, frontOfHead(rings, x, y) + proud];
  // Wire-thin: a little over a pixel at the counter's distance on the brow bar, less
  // below, so the photo's own rims carry the rest.
  const rim = (loop) => tube(loop.map((point) => on(point, 0.01)), loop.map(([, y]) => (y > 0.165 ? 0.0026 : 0.0016)), { sides: 3 });
  const temple = (side) => {
    const x = side * 0.083;
    return tube([on([x, 0.173], 0.01), [side * 0.1, 0.168, -0.025]], [0.002, 0.0018], { sides: 3 });
  };
  const bridge = tube([on([-0.014, 0.165], 0.012), on([0.013, 0.165], 0.012)], [0.0018, 0.0018], { sides: 3 });
  return [...SAM_RIMS.map(rim), bridge, temple(-1), temple(1)];
}

// Marcus's twists: rope-like and near black, falling around his head from the
// crown, to his temples in front and lower behind, standing a little off the head,
// each tapering to a point and curling back in towards the head at the tip.
// [turn from straight ahead, root height, tip height, how far it stands off].
const MARCUS_TWISTS = [
  [0.7, 0.25, 0.196, 0.16],
  [1.0, 0.246, 0.16, 0.22],
  [1.4, 0.244, 0.122, 0.26],
  [1.8, 0.24, 0.092, 0.26],
  [2.25, 0.24, 0.066, 0.24],
  [2.7, 0.244, 0.046, 0.2],
];
function twists(rings) {
  // They hang from the widest part of the head, never tucking in under the skull.
  const hang = (y, turn, out) => {
    const [x, , z] = aroundHead(rings, Math.max(y, 0.152), turn, out);
    return [x, y, z];
  };
  const twist = ([turn, root, tipY, out]) => tube(
    [aroundHead(rings, root, turn, 0.97), hang(lerp(root, tipY, 0.55), turn + 0.06, 1 + out * 1.12), hang(tipY, turn - 0.05, 1 + out * 0.7)],
    [0.0125, 0.0095, 0.003],
    { sides: 4, twist: Math.PI / 4, tile: 0.2 },
  );
  return [...MARCUS_TWISTS.flatMap(([turn, ...rest]) => [twist([turn, ...rest]), twist([-turn, ...rest])]), twist([Math.PI, 0.25, 0.034, 0.18])];
}

// Walt's white mustache, over the one in his photo: thick under the nose, tapering
// as it droops to the corners of his mouth. It is seated in the face rather than laid
// on it: a flat-fronted bar half sunk into the lip, so only a few millimetres of it
// stand proud and it shades like the face around it. Its ends sink in completely.
function mustache(rings) {
  const path = [[-0.05, 0.051], [-0.04, 0.06], [-0.022, 0.067], [0, 0.07], [0.022, 0.067], [0.04, 0.06], [0.049, 0.051]];
  const radii = [[0.002, 0.003], [0.003, 0.0055], [0.0036, 0.0068], [0.004, 0.0072], [0.0036, 0.0068], [0.003, 0.0055], [0.002, 0.003]];
  const sink = [-0.0024, -0.0006, 0.0002, 0.0004, 0.0002, -0.0006, -0.0024];
  return tube(path.map(([x, y], i) => [x, y, frontOfHead(rings, x, y) + sink[i]]), radii, { sides: 4, twist: Math.PI / 4, capStart: true, capEnd: true });
}

// Priya's braid, over her left shoulder: from behind her ear it runs down the side
// of her neck, over the shoulder and onto her chest, and ends there in a tuft. A
// tapered core carries five faceted plaits, set alternately left and right of it and
// turned against each other, thick at the top and thinning, so the outline is lumpy
// hair and never a strap. It hangs from the body, not the head, so it stays on her
// shoulder when she turns.
const BRAID_PLAITS = 5;
function braid(body) {
  const { torso, headAt } = body;
  const onChest = (x, y, r) => [x, y, frontOfTorso(torso, x, y) + r];
  const route = [
    [0.07, headAt[1] + 0.045, headAt[2] - 0.05],
    [0.092, headAt[1] - 0.025, headAt[2] - 0.016],
    [0.108, headAt[1] - 0.075, headAt[2] + 0.03],
    onChest(0.104, headAt[1] - 0.125, 0.021),
    onChest(0.098, headAt[1] - 0.17, 0.018),
    onChest(0.095, headAt[1] - 0.2, 0.015),
  ];
  const along = (t) => {
    const at = t * (route.length - 1);
    const i = Math.min(route.length - 2, Math.floor(at));
    return lerp3(route[i], route[i + 1], at - i);
  };
  const core = tube(route, route.map((_, i) => lerp(0.019, 0.009, i / (route.length - 1))), { sides: 5, tile: 0.1 });
  const up = new Vector3(0, 1, 0);
  const plaits = Array.from({ length: BRAID_PLAITS }, (_, i) => {
    const t = lerp(0.24, 0.94, i / (BRAID_PLAITS - 1));
    const direction = new Vector3(...along(Math.max(0, t - 0.06))).sub(new Vector3(...along(Math.min(1, t + 0.06)))).normalize();
    const width = lerp(0.027, 0.016, i / (BRAID_PLAITS - 1));
    const plait = new IcosahedronGeometry(1, 0).scale(width, 0.027, width * 0.72);
    plait.rotateY(i % 2 ? 0.45 : -0.45);
    plait.rotateZ(i % 2 ? 0.35 : -0.35);
    plait.applyQuaternion(new Quaternion().setFromUnitVectors(up, direction));
    const [x, y, z] = along(t);
    plait.translate(x + (i % 2 ? 0.006 : -0.006), y, z + 0.004);
    return plait;
  });
  const end = along(1);
  return [core, ...plaits, place(new OctahedronGeometry(1, 0).scale(0.012, 0.022, 0.009), { x: end[0], y: end[1] - 0.022, z: end[2] })];
}

// Where Priya's braid is gathered, behind her left ear, in with the hair on her head.
const PRIYA_GATHER = [0.058, 0.05, -0.078, 0.04, 0.05, 0.036, 0.4];

// Every patient's look over the rig. `cloth` names the painter in textures.js and
// its tile in metres. `body` is a build, and `rib` the colour of the ring at the
// neck. `dress` adds the garment's own cues, `hair` adds to the head's hair,
// `headTrim` adds painted parts to the head, and `bodyHair` adds hair that hangs
// from the body. Palettes live in theme.js.
const sam = derive({ lift: 0.025, shoulders: 1.06, waist: 1.04, depth: 1.08, limbs: 1.08, neck: 1.1 });
const marcus = derive({ lift: 0.04, shoulders: 1.14, waist: 1.0, depth: 1.1, limbs: 1.15, neck: 1.2 });
const priya = derive({ lift: -0.07, shoulders: 0.95, waist: 0.96, depth: 0.98, limbs: 0.94, neck: 0.95 });
const walt = derive({ lift: -0.02, shoulders: 1.12, waist: 1.2, depth: 1.18, belly: 1.12, stoop: 0.025, limbs: 1.12, neck: 1.25 });
// A taller crown for the heads without Jordan's curls or Sam's tufts to fill it: the
// eyes sit halfway between chin and crown, as they do on a real head.
const TALL_CROWN = HEAD_RINGS.map((ring, i) => {
  if (i === 6) return { ...ring, y: 0.24, rx: 0.087, zf: 0.09, zb: 0.1 };
  if (i === 7) return { ...ring, y: 0.284, rx: 0.066, zf: 0.066, zb: 0.082 };
  return ring;
});
const TALL_CROWN_TOP = 0.304;
// A squarer jaw for the three men: a wider ring at the chin.
const squareJaw = (rings) => rings.map((ring, i) => (i === 1 ? { ...ring, rx: 0.07 } : ring));
// The four new crops run on up over the crown to here, above the tallest crown, so
// each head carries its own photo's hairline and hair (make-face-texture.mjs).
// `hairline` is where that hairline sits down each crop, as a share of its height.
const photoOver = (hairline) => ({ top: 0.31, hairline });

// A tee showing down the middle between open fronts, with a band along each front
// edge. `widths` give the opening's half-width from the neck down through 1.4, 1.2
// and 0.96 metres (below that the counter and the hands hide it): wide under the
// collar, drawn in over the chest, easing out as the fronts hang. The bands overlap
// the tee's edges, so no hard stripe shows.
const openFront = (body, widths, band) => {
  const top = body.rib.points[0][1] + 0.005;
  const rows = [top, 1.4, 1.2, 0.96].map((y, i) => [y, widths[i]]);
  const tee = frontStrip(body.torso, rows.map(([y, w]) => [0, y, w + band * 0.5]), 0.004, { centre: true });
  const edges = [-1, 1].map((side) => frontStrip(body.torso, rows.map(([y, w]) => [side * (w + band * 0.5), y, band]), 0.007));
  return { tee, edges };
};

export const LOOKS = {
  jordan: {
    id: "jordan",
    palette: patientPalettes.jordan,
    cloth: { paint: "knit", tile: 0.4 },
    body: JORDAN_BODY,
    rib: "topRib",
    // A crossbody bag strap from her left shoulder to her right hip: it breaks up
    // the torso's outline and says she's on her way somewhere.
    dress: (body, palette) => [
      painted(tube(
        [[0.13, 1.515, 0.02], [0.07, 1.38, 0.12], [-0.05, 1.2, 0.126], [-0.15, 1.02, 0.108]],
        [[0.018, 0.004], [0.018, 0.004], [0.018, 0.004], [0.018, 0.004]],
        { sides: 4 },
      ), palette.strap),
    ],
    hair: () => [curls()],
  },
  // A navy cardigan hanging open over a grey tee, the tee's crew neck at his throat.
  sam: {
    id: "sam",
    palette: patientPalettes.sam,
    cloth: { paint: "knit", tile: 0.3 },
    body: sam,
    head: { scale: [1.03, 1.08, 1.05], rings: squareJaw(HEAD_RINGS), photo: photoOver(0.228) },
    shoulderCaps: true,
    rib: "teeRib",
    dress: (body, palette) => {
      const { tee, edges } = openFront(body, [0.042, 0.032, 0.034, 0.038], 0.012);
      return [
        shaded(tee, palette.tee, 0.25, 0.12),
        ...edges.map((edge) => painted(edge, palette.topRib)),
        ...cuffs(body.arm).map((cuff) => painted(cuff, palette.topRib)),
      ];
    },
    hair: () => [merge(SAM_TUFTS.map(clump(IcosahedronGeometry)))],
    headTrim: (rings, palette) => [
      ...ears(rings).map((ear) => painted(ear, palette.skin)),
      ...glasses(rings).map((part) => painted(part, palette.frame)),
    ],
  },
  // A green polo: short sleeves, a collar standing round the neck and falling in two
  // leaves, and a short placket.
  marcus: {
    id: "marcus",
    palette: patientPalettes.marcus,
    cloth: { paint: "pique", tile: 0.3 },
    body: marcus,
    head: { scale: [1.05, 1.05, 1.05], rings: squareJaw(TALL_CROWN), top: TALL_CROWN_TOP, photo: photoOver(0.16) },
    sleeve: 0.7,
    rib: "topRib",
    jaw: "beard",
    dress: (body, palette) => {
      const top = body.rib.points[0][1];
      return [
        painted(collarLeaves(body.torso, top, {
          neck: [0.045, -0.02], shoulder: [0.092, 0.012], tip: [0.046, 0.075], inner: [0.016, 0.028],
        }), palette.topRib),
        painted(frontStrip(body.torso, [[0, top - 0.03, 0.015], [0, top - 0.13, 0.015]], 0.006), palette.topRib),
      ];
    },
    hair: (rings) => [merge(twists(rings))],
    headTrim: (rings, palette) => ears(rings).map((ear) => painted(ear, palette.skin)),
  },
  // A denim jacket open over a white tee: a spread collar, pale front edges and cuffs.
  priya: {
    id: "priya",
    palette: patientPalettes.priya,
    cloth: { paint: "denim", tile: 0.3 },
    body: priya,
    head: { scale: [1, 0.93, 0.98], rings: TALL_CROWN, top: TALL_CROWN_TOP, photo: photoOver(0.164) },
    shoulderCaps: true,
    rib: "tee",
    dress: (body, palette) => {
      const { tee, edges } = openFront(body, [0.054, 0.046, 0.052, 0.056], 0.01);
      const top = body.rib.points[0][1];
      return [
        shaded(tee, palette.tee, 0.22, 0.25),
        ...edges.map((edge) => painted(edge, palette.topRib)),
        painted(collarLeaves(body.torso, top, {
          neck: [0.05, -0.015], shoulder: [0.13, 0.02], tip: [0.075, 0.115], inner: [0.047, 0.05],
        }), palette.topRib),
        ...cuffs(body.arm).map((cuff) => painted(cuff, palette.topRib)),
      ];
    },
    hair: () => [clump(IcosahedronGeometry)(PRIYA_GATHER)],
    headTrim: (rings, palette) => ears(rings, { y: 0.13, size: [0.007, 0.025, 0.016] })
      .map((ear) => painted(ear, palette.skin)),
    bodyHair: (body) => braid(body),
  },
  // A plaid flannel shirt open at the collar over a white undershirt, a placket down the front.
  walt: {
    id: "walt",
    palette: patientPalettes.walt,
    cloth: { paint: "plaid", tile: 0.14 },
    body: walt,
    head: { scale: [1.1, 1.06, 1.08], rings: squareJaw(TALL_CROWN), top: 0.296, photo: photoOver(0.163) },
    shoulderCaps: true,
    rib: "tee",
    dress: (body, palette) => {
      const top = body.rib.points[0][1];
      return [
        shaded(frontStrip(body.torso, [[0, top, 0.036], [0, top - 0.075, 0.004]], 0.004), palette.tee, 0.15),
        painted(collarLeaves(body.torso, top, {
          neck: [0.046, -0.02], shoulder: [0.112, 0.015], tip: [0.046, 0.1], inner: [0.012, 0.05],
        }), palette.topRib),
        painted(frontStrip(body.torso, [[0, top - 0.065, 0.011], [0, 1.3, 0.011], [0, 1.1, 0.011], [0, 0.9, 0.011]], 0.005), palette.topDeep),
        ...cuffs(body.arm).map((cuff) => painted(cuff, palette.topRib)),
      ];
    },
    headTrim: (rings, palette) => [
      ...ears(rings, { y: 0.126, size: [0.009, 0.032, 0.02] }).map((ear) => painted(ear, palette.skin)),
      painted(mustache(rings), palette.mustache),
    ],
  },
};

// The look for a patient id, or Jordan's for any patient without one of their own.
export const lookFor = (patientId) => (Object.hasOwn(LOOKS, patientId ?? "") ? LOOKS[patientId] : LOOKS.jordan);

export function buildPatient(tex, look = LOOKS.jordan) {
  const { palette, body } = look;
  const cloth = tex.cloth;
  const group = new Group();
  const add = (parent, geometry, material, name) => {
    const mesh = new Mesh(geometry, material);
    if (name) mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const tile = look.cloth.tile;

  // The torso in the patient's own top.
  add(group, tube(body.torso.points, body.torso.radii, { sides: 8, tile, capEnd: true, twist: Math.PI / 8 }), litTextured(cloth), "torso");

  // Sleeves, tapered shoulder to wrist and bent at the elbow, forearms resting on the
  // counter. `shoulderCaps` closes the top of each sleeve, which from behind the
  // counter otherwise shows the store through the open tube (Jordan's rig is left as
  // it was). A short sleeve (`sleeve`, the share of the upper arm it covers) leaves
  // the rest of the arm bare, painted in with the skin, and is always capped.
  const flip = (side) => ([x, y, z]) => [side * x, y, z];
  const { joints, radii } = body.arm;
  let bare = [];
  if (look.sleeve) {
    const end = lerp3(joints[0], joints[1], look.sleeve);
    const sleeve = (side) => tube(
      [joints[0], lerp3(joints[0], joints[1], look.sleeve * 0.5), end].map(flip(side)),
      [radii[0] * 1.1, radii[0] * 1.14, lerp(radii[0], radii[1], look.sleeve) * 1.2],
      { sides: 6, tile, capStart: true },
    );
    add(group, merge([sleeve(-1), sleeve(1)]), litTextured(cloth), "arms");
    const arm = (side) => tube(
      [lerp3(joints[0], joints[1], look.sleeve * 0.7), ...joints.slice(1)].map(flip(side)),
      [lerp(radii[0], radii[1], 0.5), ...radii.slice(1)],
      { sides: 6, capEnd: true },
    );
    bare = [-1, 1].map((side) => painted(arm(side), palette.skin));
  } else {
    const arm = (side) => tube(joints.map(flip(side)), radii, { sides: 6, tile, capStart: look.shoulderCaps });
    add(group, merge([arm(-1), arm(1)]), litTextured(cloth), "arms");
  }

  // Skin and trim in one draw: the neck, the collar ring, mitten hands with a thumb
  // each, any bare arms, and the garment's own cues.
  const hand = (side) => [
    tube(body.palm.points.map(flip(side)), body.palm.radii, { sides: 6, capEnd: true }),
    tube(body.thumb.points.map(flip(side)), body.thumb.radii, { sides: 4, capEnd: true }),
  ];
  add(group, merge([
    painted(tube(body.neck.points, body.neck.radii, { sides: 6 }), palette.skin),
    painted(tube(body.rib.points, body.rib.radii, { sides: 8, twist: Math.PI / 8 }), palette[look.rib]),
    ...[-1, 1].flatMap(hand).map((geometry) => painted(geometry, palette.skin)),
    ...bare,
    ...look.dress(body, palette),
  ]), litFlat(), "skin");

  const head = new Group();
  head.name = "head";
  head.position.set(...body.headAt);
  if (look.head?.scale) head.scale.set(...look.head.scale);
  group.add(head);
  const rings = look.head?.rings ?? HEAD_RINGS;
  const parts = headParts(rings, look.head?.top ?? HEAD_TOP, look.head?.photo);
  const hair = litTextured(tex.hair);
  add(head, parts.face, litTextured(tex.face), "face");
  add(head, merge([parts.hair, ...(look.hair?.(rings) ?? [])]), hair, "hair");
  if (look.headTrim) {
    add(head, merge([painted(parts.skin, palette[look.jaw ?? "skin"]), ...look.headTrim(rings, palette)]), litFlat(), "jaw");
  } else {
    add(head, parts.skin, litColor(palette.skin), "jaw");
  }
  if (look.bodyHair) add(group, merge(look.bodyHair(body)), hair, "braid");

  return { group, head };
}

// For tests and the budget line in the brief.
export function patientTriangles(group) {
  let count = 0;
  group.traverse((object) => {
    if (object.isMesh) count += triangles(object.geometry);
  });
  return count;
}
