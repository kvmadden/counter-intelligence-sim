import { Group, Mesh } from "three";
import { staffPalette } from "../theme.js";
import { merge, painted, paintedBox, place, tube } from "./geometry.js";
import { litFlat } from "./materials.js";

// the classic N64 shooter's first-person gun-in-hand idiom with the weapon swapped out: a
// lab-coat sleeve coming in from the lower-right corner, a shaped mitten hand
// with a thumb, and a pen held upright at rest, leaning away from the patient,
// never pointed at them. Built like the patient — tapered, faceted lofts, not
// boxes — and still one draw.
export function buildPenHand() {
  const pen = merge([
    painted(tube([[0, -0.045, 0], [0, 0.145, 0]], [0.0085, 0.0085], { sides: 6 }), staffPalette.penBarrel),
    painted(tube([[0, 0.145, 0], [0, 0.178, 0]], [0.0098, 0.009], { sides: 6, capEnd: true }), staffPalette.penMetal),
    place(paintedBox(0.004, 0.065, 0.006, staffPalette.penMetal), { y: 0.12, z: 0.011 }),
    painted(tube([[0, -0.045, 0], [0, -0.072, 0]], [0.0085, 0.0015], { sides: 6, capEnd: true }), staffPalette.penTip),
  ]);
  place(pen, { rx: -0.35, rz: -0.34, x: -0.018, y: 0.03, z: -0.055 });
  const hand = merge([
    painted(tube([[0, 0, 0.3], [0, 0, 0.12], [0, 0, 0.045]], [0.062, 0.058, 0.052], { sides: 6, twist: Math.PI / 6 }), staffPalette.coat),
    painted(tube([[0, 0, 0.06], [0, 0, 0.012]], [0.058, 0.056], { sides: 6, twist: Math.PI / 6, capEnd: true }), staffPalette.coatCuff),
    painted(tube([[0, 0, 0.02], [0, 0.002, -0.05], [0, -0.022, -0.1]], [[0.038, 0.042], [0.04, 0.04], [0.03, 0.03]], { sides: 6, capEnd: true }), staffPalette.skin),
    painted(tube([[-0.034, 0.014, -0.015], [-0.052, 0.022, -0.07]], [0.015, 0.011], { sides: 4, capEnd: true }), staffPalette.skin),
    pen,
  ]);
  const group = new Group();
  group.add(new Mesh(hand, litFlat()));
  group.rotation.set(0.32, 0.3, -0.06);
  return group;
}
