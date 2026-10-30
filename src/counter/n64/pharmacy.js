import { Group, Mesh, PlaneGeometry } from "three";
import { store } from "../theme.js";
import { merge, paintedBox, place, tiledBox, tiledPlane } from "./geometry.js";
import { daylight, glowFlat, litFlat, litTextured } from "./materials.js";
import { SCREEN, SIGNS, atlasRect } from "./textures.js";

// A big-chain retail pharmacy, seen from the pharmacist's side of the pickup
// counter. Everything that tells you which side you are on is placed for it:
// the pharmacy's own signs face the store, so you see their backs; the register
// display and the card reader face the patient; your workstation, printer and
// bins of filled bags face you, with your own stock shelving beside you (seen in
// the opening pan). Beyond the patient is the sales floor — aisles of gondola
// shelving under troffers, endcaps facing the pharmacy, waiting chairs, a
// blood-pressure kiosk, checkouts, and daylight through the storefront at the
// far end. No chain's name, logo or trade dress. Everything sharing a material
// is merged, so the whole store is a handful of draws.
const COUNTER = { top: 0.95, near: 1.18, far: 0.22, halfWidth: 1.3 };
const ROOM = { halfWidth: 4.2, height: 3.2, back: -12, front: 2.0 };
const GONDOLA = { width: 0.9, front: -3.6, back: -10.2, height: 1.62, kick: 0.1 };
const AISLES = [-3.3, -1.35, 1.35, 3.3];
// The endcap headers face the pharmacy, as real endcaps do: generic departments only.
const HEADERS = { "-1.35": "VITAMINS", "1.35": "BEAUTY", "-3.3": "SNACKS", "3.3": "HOUSEHOLD" };
// The pharmacist's own shelving, beside the counter on the left, facing the aisle behind it.
export const OWN_SHELF = { x: -1.32, near: 2.0, far: -0.1, height: 2.2, depth: 0.45, binsFrom: 1.1 };

// A plane showing one region of the sign atlas.
function atlasPlane(w, h, region) {
  const geometry = new PlaneGeometry(w, h);
  const { u0, u1, v0, v1 } = atlasRect(region);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
  return geometry;
}

// Builds a part at a local offset, then turns and places the whole prop.
const prop = (parts, { x = 0, y = 0, z = 0, ry = 0 }) => parts.map(([geometry, local]) => {
  geometry.translate(local[0], local[1], local[2]);
  return place(geometry, { ry, x, y, z });
});

// A pharmacy sign, lettered on the side facing the store. From behind the
// counter you see its plain back in a metal frame, as the pharmacist does.
const storeFacing = (w, h, word, at) => ({
  words: place(atlasPlane(w, h, SIGNS[word]), { ...at, ry: Math.PI, z: at.z - 0.016 }),
  back: merge([
    place(paintedBox(w + 0.05, h + 0.05, 0.02, store.shelfEdge), at),
    place(paintedBox(w + 0.01, h + 0.01, 0.028, store.signRedDeep), at),
  ]),
});

export function buildPharmacy(tex) {
  const group = new Group();
  const add = (geometry, material) => group.add(new Mesh(geometry, material));
  const depth = ROOM.front - ROOM.back;
  const midZ = (ROOM.front + ROOM.back) / 2;
  const width = ROOM.halfWidth * 2;
  const { height } = ROOM;
  const box = (w, h, d, hex, at) => place(paintedBox(w, h, d, hex), at);

  add(place(tiledPlane(width, depth, 0.6), { rx: -Math.PI / 2, z: midZ }), litTextured(tex.floorTiles));
  add(place(tiledPlane(width, depth, 1.2), { rx: Math.PI / 2, y: height, z: midZ }), litTextured(tex.ceilingTiles));
  add(merge([
    place(tiledPlane(depth, height, 2.0, height), { ry: Math.PI / 2, x: -ROOM.halfWidth, y: height / 2, z: midZ }),
    place(tiledPlane(depth, height, 2.0, height), { ry: -Math.PI / 2, x: ROOM.halfWidth, y: height / 2, z: midZ }),
    place(tiledPlane(width, 0.6, 2.0, height), { y: height - 0.3, z: ROOM.back }),
  ]), litTextured(tex.storeWall));

  // Gondola runs: long faces down every aisle and an endcap facing the counter.
  const runLength = GONDOLA.front - GONDOLA.back;
  const runZ = (GONDOLA.front + GONDOLA.back) / 2;
  const shelfH = GONDOLA.height - GONDOLA.kick;
  const shelfY = GONDOLA.kick + shelfH / 2;
  add(merge(AISLES.flatMap((x) => [
    place(tiledPlane(runLength, shelfH, 1.0, shelfH), { ry: Math.PI / 2, x: x + GONDOLA.width / 2, y: shelfY, z: runZ }),
    place(tiledPlane(runLength, shelfH, 1.0, shelfH), { ry: -Math.PI / 2, x: x - GONDOLA.width / 2, y: shelfY, z: runZ }),
    place(tiledPlane(GONDOLA.width, shelfH - 0.2, GONDOLA.width, shelfH), { x, y: GONDOLA.kick + (shelfH - 0.2) / 2, z: GONDOLA.front }),
  ])), litTextured(tex.gondolaStock));

  // The pharmacist's own shelving: stock bays, then the will-call bins nearest you.
  const ownLength = OWN_SHELF.near - OWN_SHELF.far;
  const binsLength = OWN_SHELF.near - OWN_SHELF.binsFrom;
  const stockLength = OWN_SHELF.binsFrom - OWN_SHELF.far;
  add(place(tiledPlane(stockLength, OWN_SHELF.height - 0.1, 1.0, 1.1), { ry: Math.PI / 2, x: OWN_SHELF.x, y: 0.05 + (OWN_SHELF.height - 0.1) / 2, z: OWN_SHELF.far + stockLength / 2 }), litTextured(tex.pharmacyStock));
  add(place(tiledPlane(binsLength, OWN_SHELF.height - 0.1, 0.9, 1.05), { ry: Math.PI / 2, x: OWN_SHELF.x, y: 0.05 + (OWN_SHELF.height - 0.1) / 2, z: OWN_SHELF.binsFrom + binsLength / 2 }), litTextured(tex.bagBins));

  const signs = { words: [], backs: [] };
  const hang = (sign) => {
    signs.words.push(sign.words);
    signs.backs.push(sign.back);
  };
  hang(storeFacing(1.4, 0.2625, "PHARMACY", { x: 0, y: 2.55, z: -2.8 }));
  hang(storeFacing(1.1, 0.1375, "CONSULTATION", { x: 1.3, y: 2.28, z: -2.2 }));
  hang(storeFacing(0.48, 0.12, "PICK UP", { x: -0.72, y: 1.3, z: -1.2 }));
  hang(storeFacing(0.48, 0.12, "DROP OFF", { x: 0.8, y: 1.3, z: -1.5 }));
  add(merge([
    ...signs.words,
    ...AISLES.map((x) => place(atlasPlane(GONDOLA.width, GONDOLA.width / 5.33, SIGNS[HEADERS[x]]), { x, y: GONDOLA.height - 0.11, z: GONDOLA.front + 0.03 })),
    // An aisle marker hangs over the centre aisle; stores print both sides of those.
    place(atlasPlane(0.8, 0.15, SIGNS["FIRST AID"]), { y: 2.45, z: -6.2 }),
    place(atlasPlane(0.8, 0.15, SIGNS.PHOTO), { ry: -Math.PI / 2, x: ROOM.halfWidth - 0.02, y: 2.3, z: -7.5 }),
    // The privacy line is lettered for the customers waiting behind it, so from here it reads upside down.
    place(atlasPlane(1.6, 0.15, SIGNS["PLEASE WAIT HERE"]), { rx: -Math.PI / 2, ry: Math.PI, y: 0.005, z: -2.1 }),
    // The workstation's green screen, on the monitor below.
    ...prop([[atlasPlane(0.3, 0.15, SCREEN), [0, 0.02, 0.027]]], { x: 0.46, y: 1.2, z: 0.52, ry: -0.43 }),
  ]), litTextured(tex.signs));

  const counterDepth = COUNTER.near - COUNTER.far;
  const counterZ = (COUNTER.near + COUNTER.far) / 2;
  add(place(tiledBox(COUNTER.halfWidth * 2, 0.05, counterDepth, 0.6), { y: COUNTER.top - 0.025, z: counterZ }), litTextured(tex.counterTop));

  const chair = (x, z) => [
    box(0.44, 0.07, 0.42, store.chairSeat, { x, y: 0.46, z }),
    box(0.44, 0.42, 0.06, store.chairSeat, { x, y: 0.76, z: z - 0.19 }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => box(0.03, 0.43, 0.03, store.chairFrame, { x: x + sx * 0.19, y: 0.215, z: z + sz * 0.17 })),
    ...[-1, 1].map((sx) => box(0.04, 0.03, 0.4, store.chairFrame, { x: x + sx * 0.24, y: 0.66, z })),
  ];
  const lanePost = (x, z) => [
    box(0.3, 0.03, 0.3, store.kioskDark, { x, y: 0.015, z }),
    box(0.035, 1.24, 0.035, store.shelfEdge, { x, y: 0.64, z }),
  ];
  const basket = (x, y, z) => [
    box(0.42, 0.18, 0.3, store.basket, { x, y: y + 0.09, z }),
    box(0.44, 0.025, 0.32, store.signRedDeep, { x, y: y + 0.19, z }),
  ];
  const checkout = (x) => [
    box(0.7, 0.9, 1.6, store.checkout, { x, y: 0.45, z: -10.9 }),
    box(0.34, 0.26, 0.24, store.register, { x, y: 1.03, z: -10.6, ry: 0.4 }),
  ];
  add(merge([
    box(COUNTER.halfWidth * 2, COUNTER.top - 0.05, counterDepth - 0.06, store.counterEdge, { y: (COUNTER.top - 0.05) / 2, z: counterZ }),
    box(COUNTER.halfWidth * 2, 0.03, 0.03, store.counterEdge, { y: COUNTER.top - 0.01, z: COUNTER.near }),
    // Your shelving's frame, and its end panel beside the counter.
    box(OWN_SHELF.depth, 0.05, ownLength, store.shelfMetal, { x: OWN_SHELF.x - OWN_SHELF.depth / 2, y: OWN_SHELF.height, z: OWN_SHELF.far + ownLength / 2 }),
    box(OWN_SHELF.depth, OWN_SHELF.height, 0.05, store.shelfMetal, { x: OWN_SHELF.x - OWN_SHELF.depth / 2, y: OWN_SHELF.height / 2, z: OWN_SHELF.far }),
    // Gondola kick bases, top caps and endcap header frames.
    ...AISLES.flatMap((x) => [
      box(GONDOLA.width + 0.02, GONDOLA.kick, runLength, store.shelfBack, { x, y: GONDOLA.kick / 2, z: runZ }),
      box(GONDOLA.width + 0.04, 0.04, runLength + 0.04, store.shelfMetal, { x, y: GONDOLA.height + 0.02, z: runZ }),
      box(GONDOLA.width + 0.02, 0.2, 0.02, store.signRedDeep, { x, y: GONDOLA.height - 0.11, z: GONDOLA.front + 0.01 }),
    ]),
    ...signs.backs,
    // Hanger wires for the ceiling signs and the aisle marker.
    ...[-0.6, 0.6].map((dx) => box(0.012, 0.52, 0.012, store.shelfEdge, { x: dx, y: 2.94, z: -2.8 })),
    ...[-0.45, 0.45].map((dx) => box(0.012, 0.84, 0.012, store.shelfEdge, { x: 1.3 + dx, y: 2.78, z: -2.2 })),
    ...[-0.35, 0.35].map((dx) => box(0.012, 0.68, 0.012, store.shelfEdge, { x: dx, y: 2.86, z: -6.2 })),
    ...lanePost(-0.72, -1.2),
    ...lanePost(0.8, -1.5),
    // A stack of baskets by the queue, and the waiting chairs, facing the counter.
    ...basket(-1.02, 0, -1.55),
    ...basket(-1.02, 0.16, -1.55),
    ...basket(-1.02, 0.32, -1.55),
    ...chair(-1.5, -2.6),
    ...chair(-1.98, -2.6),
    ...chair(-2.46, -2.6),
    // A blood-pressure kiosk: a seat, the console behind it, its screen and the cuff port.
    box(0.46, 0.42, 0.42, store.kiosk, { x: 1.4, y: 0.21, z: -2.5 }),
    box(0.5, 0.08, 0.46, store.kioskDark, { x: 1.4, y: 0.46, z: -2.5 }),
    box(0.54, 1.3, 0.28, store.kiosk, { x: 1.4, y: 0.65, z: -2.84 }),
    box(0.34, 0.24, 0.02, store.kioskScreen, { x: 1.4, y: 1.08, z: -2.69 }),
    box(0.16, 0.14, 0.14, store.kioskDark, { x: 1.62, y: 0.72, z: -2.62 }),
    // Checkouts at the front of the store, and the storefront's mullions.
    ...checkout(-2.5),
    ...checkout(2.5),
    ...[-4.1, -2.9, -1.7, -1.0, 1.0, 1.7, 2.9, 4.1].map((x) => box(0.12, 2.6, 0.1, store.glassFrame, { x, y: 1.3, z: ROOM.back + 0.08 })),
    box(ROOM.halfWidth * 2, 0.2, 0.12, store.glassFrame, { y: 2.6, z: ROOM.back + 0.08 }),
    // On the counter, your side: the counting tray and spatula...
    box(0.22, 0.026, 0.13, store.priceStrip, { x: -0.16, y: COUNTER.top + 0.013, z: 0.66, ry: 0.18 }),
    box(0.17, 0.01, 0.03, store.stock[1], { x: -0.15, y: COUNTER.top + 0.031, z: 0.66, ry: 0.36 }),
    // ...a label printer, its label curling out towards you...
    ...prop([
      [paintedBox(0.18, 0.12, 0.22, store.printer), [0, 0.06, 0]],
      [paintedBox(0.14, 0.02, 0.05, store.printerDark), [0, 0.11, 0.07]],
      [paintedBox(0.1, 0.004, 0.06, store.bag), [0, 0.07, 0.13]],
    ], { x: -0.33, y: COUNTER.top, z: 0.78, ry: 0.2 }),
    // ...two bins of filled bags...
    ...[[-0.47, 0.32], [-0.74, 0.36]].flatMap(([x, z]) => prop([
      [paintedBox(0.24, 0.13, 0.18, store.bin), [0, 0.065, 0]],
      [paintedBox(0.08, 0.13, 0.12, store.bag), [-0.06, 0.15, 0]],
      [paintedBox(0.08, 0.1, 0.12, store.bagFold), [0.02, 0.14, 0.01]],
      [paintedBox(0.07, 0.12, 0.11, store.bag), [0.08, 0.15, -0.01]],
    ], { x, y: COUNTER.top, z, ry: -0.1 })),
    // ...the register's display and the card reader, both turned to face her, so you see their backs...
    ...prop([
      [paintedBox(0.03, 0.2, 0.03, store.registerDark), [0, 0.1, 0]],
      [paintedBox(0.26, 0.17, 0.06, store.register), [0, 0.27, 0]],
      [paintedBox(0.14, 0.02, 0.1, store.registerDark), [0, 0.01, 0]],
    ], { x: 0.3, y: COUNTER.top, z: 0.36, ry: 0.25 }),
    ...prop([
      [paintedBox(0.1, 0.14, 0.05, store.register), [0, 0.07, 0]],
      [paintedBox(0.08, 0.02, 0.08, store.registerDark), [0, 0.01, 0.01]],
    ], { x: -0.3, y: COUNTER.top, z: 0.3, ry: -0.3 }),
    // ...and your workstation monitor, turned towards you.
    ...prop([
      [paintedBox(0.16, 0.015, 0.12, store.printerDark), [0, 0.008, 0]],
      [paintedBox(0.04, 0.13, 0.04, store.printerDark), [0, 0.08, -0.01]],
      [paintedBox(0.36, 0.25, 0.05, store.monitor), [0, 0.25, 0]],
    ], { x: 0.46, y: COUNTER.top, z: 0.52, ry: -0.43 }),
  ]), litFlat());

  // Fluorescent troffers over the aisles and the waiting area.
  add(merge([-2.3, 0, 2.3].flatMap((x) => [-1.2, -3.2, -5.4, -7.6, -9.8].map((z) => box(0.56, 0.02, 1.16, store.lamp, { x, y: height - 0.012, z })))), glowFlat());
  // Daylight through the storefront glass and the entrance doors, unfogged.
  add(merge([box(ROOM.halfWidth * 2, 2.5, 0.04, store.daylight, { y: 1.25, z: ROOM.back + 0.02 })]), daylight());

  return group;
}
