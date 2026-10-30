import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, PlaneGeometry, Vector3 } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// BoxGeometry lays its faces out px, nx, py, ny, pz, nz, four vertices each;
// these are each face's (u, v) extents in metres.
const faceExtents = (w, h, d) => [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];

// A box whose UVs repeat its texture every `tile` metres, so one material can
// cover surfaces of any size at the same texel density, and merge into one draw.
export function tiledBox(w, h, d, tile = 1) {
  const geometry = new BoxGeometry(w, h, d);
  const uv = geometry.getAttribute("uv");
  faceExtents(w, h, d).forEach(([u, v], face) => {
    for (let corner = 0; corner < 4; corner += 1) {
      const i = face * 4 + corner;
      uv.setXY(i, (uv.getX(i) * u) / tile, (uv.getY(i) * v) / tile);
    }
  });
  return geometry;
}

export function tiledPlane(w, h, tileU = 1, tileV = tileU) {
  const geometry = new PlaneGeometry(w, h);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, (uv.getX(i) * w) / tileU, (uv.getY(i) * h) / tileV);
  return geometry;
}

// An untextured box carrying its colour per vertex, so every flat-coloured part
// of a group merges into a single draw call (the N64 leaned on vertex colour
// the same way).
export function paintedBox(w, h, d, hex) {
  const geometry = new BoxGeometry(w, h, d);
  const { r, g, b } = new Color(hex);
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) colors.set([r, g, b], i * 3);
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

export function place(geometry, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  geometry.rotateX(rx);
  geometry.rotateY(ry);
  geometry.rotateZ(rz);
  geometry.translate(x, y, z);
  return geometry;
}

// Boxes come indexed and lofts do not; flatten both so any mix can merge.
export const merge = (geometries) => mergeGeometries(geometries.map((geometry) => (geometry.index ? geometry.toNonIndexed() : geometry)), false);

// Colours any geometry per vertex, so shaped parts merge into one draw with the boxes.
export function painted(geometry, hex) {
  const { r, g, b } = new Color(hex);
  const count = geometry.getAttribute("position").count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) colors.set([r, g, b], i * 3);
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

// N64-proper shapes: a tube lofted through rings of a few sides each. `points`
// are the ring centres in metres; `radii` give each ring's [across, along]
// half-widths, or one number for a round ring. Rings face the path, so the
// same helper makes a tapered limb, a faceted torso or a bent arm. Smooth
// (Gouraud) normals, as the console lit its characters; the silhouette keeps
// the facets. UVs wrap once around and run down the length per `tile` metres.
export function tube(points, radii, { sides = 6, tile = 0.4, capStart = false, capEnd = false, twist = 0, across = [1, 0, 0] } = {}) {
  const P = points.map((p) => new Vector3(...p));
  const R = radii.map((r) => (Array.isArray(r) ? r : [r, r]));
  const ref = new Vector3(...across).normalize();
  const positions = [];
  const uvs = [];
  // One whole number of texture repeats around every ring, so the texture runs
  // straight down a taper, never in a spiral, and meets itself at the seam.
  const around = Math.max(1, Math.round(Math.max(...R.map(([a, b]) => (a + b) * Math.PI)) / tile));
  let run = 0;
  P.forEach((point, i) => {
    const ahead = P[Math.min(i + 1, P.length - 1)].clone().sub(P[Math.max(i - 1, 0)]).normalize();
    // One fixed reference axis keeps every ring's frame aligned, so no ring twists;
    // a path running along that axis falls back to another, rather than to NaN.
    const axis = Math.abs(ref.dot(ahead)) > 0.999 ? new Vector3(0, 0, 1) : ref;
    const side = axis.clone().sub(ahead.clone().multiplyScalar(axis.dot(ahead))).normalize();
    const up = new Vector3().crossVectors(ahead, side).normalize();
    if (i > 0) run += point.distanceTo(P[i - 1]);
    for (let k = 0; k <= sides; k += 1) {
      const a = (k / sides) * Math.PI * 2 + twist;
      const v = point.clone().addScaledVector(side, Math.cos(a) * R[i][0]).addScaledVector(up, Math.sin(a) * R[i][1]);
      positions.push(v.x, v.y, v.z);
      uvs.push((k / sides) * around, run / tile);
    }
  });
  const index = [];
  const ring = sides + 1;
  for (let i = 0; i < P.length - 1; i += 1) {
    for (let k = 0; k < sides; k += 1) {
      const a = i * ring + k;
      const b = a + ring;
      // (side, up, ahead) is right-handed, so this winding faces outward.
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const cap = (i, end) => {
    const c = P[i];
    const at = positions.length / 3;
    positions.push(c.x, c.y, c.z);
    uvs.push(0.5, 0.5);
    for (let k = 0; k < sides; k += 1) {
      const a = i * ring + k;
      if (end) index.push(at, a, a + 1);
      else index.push(at, a + 1, a);
    }
  };
  if (capStart) cap(0, false);
  if (capEnd) cap(P.length - 1, true);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  // Each ring's first and last vertex share a place but not an index: average
  // their normals, or the seam shows as a hard crease down one side.
  const normal = geometry.getAttribute("normal");
  for (let i = 0; i < P.length; i += 1) {
    const a = i * ring;
    const b = a + sides;
    const n = new Vector3(normal.getX(a) + normal.getX(b), normal.getY(a) + normal.getY(b), normal.getZ(a) + normal.getZ(b)).normalize();
    normal.setXYZ(a, n.x, n.y, n.z);
    normal.setXYZ(b, n.x, n.y, n.z);
  }
  return geometry.toNonIndexed();
}

export const triangles = (geometry) => (geometry.index ? geometry.index.count : geometry.getAttribute("position").count) / 3;
