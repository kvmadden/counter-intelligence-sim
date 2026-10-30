// Counter Intelligence: the one place this game's palette and type live.
//
// Kevin ruled 2026-09-15 that the game is unbranded: no madden-tokens and no
// IBM Plex, a bespoke late-1990s N64 shooter homage instead. Components consume the CSS
// custom properties in `counterTheme`; the 3D encounter scene consumes the same
// values as plain JS. No colour literal belongs anywhere else in src/
// (tests/unit/counter-tokens.test.js holds that line).

// The level: a big-chain retail pharmacy, seen from the pharmacist's side of the
// counter (Kevin, 2026-09-15; replaces the Facility-built pharmacy). Generic
// retail red and white with no chain's marks, muted to an N64 cartridge palette.
export const store = {
  wall: "#d6d2c8",
  wallLow: "#a9a59b",
  wallTrim: "#6d6a64",
  floorTile: "#cfcabd",
  floorTileAlt: "#b3b0a8",
  floorGrout: "#8e8b83",
  ceiling: "#d9d8d1",
  ceilingGrid: "#9c9d99",
  lamp: "#f3f6f0",
  // The storefront at the far end: daylight through the glass, unfogged, so it
  // shines through the haze the way the classic N64 shooter's skies did.
  daylight: "#fbfcf2",
  glassFrame: "#7d8286",
  checkout: "#bdb6a9",
  basket: "#b82a30",
  register: "#3a3d42",
  registerDark: "#25272b",
  signRed: "#b3262c",
  signRedDeep: "#7e1a1f",
  signWhite: "#f2efe8",
  shelfMetal: "#c3c6c7",
  shelfEdge: "#8c9093",
  shelfBack: "#6b6f72",
  priceStrip: "#e4e2dc",
  stock: ["#c7403a", "#3f6fa8", "#e0c34a", "#5e9a5c", "#e8e4da", "#8a5aa0", "#d9793a", "#4aa3a8"],
  // A mid warm-grey laminate, so the counter doesn't wash out the lower third of the screen.
  counterTop: "#aeaaa1",
  counterFleck: "#c6c2b9",
  counterEdge: "#5d5f62",
  bag: "#e8e3d6",
  bagFold: "#c2bba9",
  bin: "#4c6f96",
  binDeep: "#34506f",
  printer: "#cfcac0",
  printerDark: "#55585c",
  monitor: "#2b2e32",
  monitorScreen: "#123a2a",
  monitorText: "#7ee08f",
  vial: "#c9832e",
  vialCap: "#f0ede6",
  chairSeat: "#3e5876",
  chairFrame: "#7b8085",
  kiosk: "#e3e1dc",
  kioskScreen: "#3a6ea5",
  kioskDark: "#50545a",
  // Grime: scuffs in the floor, dust on the ceiling tiles, wear on the counter.
  grime: "#4a4640",
  stain: "#8c867a",
  fog: "#9aa3a8",
};

// The patient, all sampled from the committed face photo (patient-face-photo.png).
// Her top is her own teal crew-neck from the photo, deepened: dark and fitted, as
// the references' bodies are, but friendly and never black.
export const patientPalette = {
  skin: "#d8b396", // the photo's own cheeks, a shade deeper, so neck and hands match the face
  hair: "#3a2a20",
  top: "#223834",
  topDeep: "#192926",
  topRib: "#2d4944",
  strap: "#5c4130", // a worn leather crossbody strap
};

// The four new patients (2026-09-16), each sampled from its own committed photo in
// assets/patients/. Skin is calibrated the way Jordan's is: her token sits a shade
// under her photo's cheeks, and each patient's skin keeps that same relation to the
// middle of their own face texture, so the neck and hands match the face in the
// scene. Clothes are the photo's own colours, lifted or deepened a step only where
// the store's light and fog would otherwise flatten them to black.
export const patientPalettes = {
  jordan: patientPalette,
  // Mid-40s, glasses, a navy cardigan open over a grey tee.
  sam: {
    skin: "#ba9678",
    hair: "#141816",
    top: "#1b2b45", // the cardigan's navy, lifted a step so it reads navy, not black
    topDeep: "#16243b",
    topRib: "#26395c", // the button bands and cuffs
    tee: "#6b7377", // the grey tee in the cardigan's shade, a heather rather than a light panel
    teeRib: "#555c60", // its crew neck, a step darker so the neckline reads
    frame: "#3b3330", // his wire frames, lifted from their darkest pixels so thin rims stay soft
  },
  // Late 20s, twists, a trimmed beard, a green polo.
  marcus: {
    skin: "#926a4c",
    hair: "#181c1a",
    beard: "#3b2a20", // under the jaw, where the photo's beard runs out
    top: "#2a553e",
    topDeep: "#214632",
    topRib: "#3d7358", // the collar and placket, catching more light than the body
  },
  // Early 30s, a side braid, a denim jacket open over a white tee.
  priya: {
    skin: "#bd916f",
    hair: "#12171a",
    top: "#225b7c", // mid denim
    topDeep: "#174662",
    topRib: "#3a7394", // the faded collar, front edges and cuffs
    tee: "#c2c3be", // her white tee under the jacket, toned to sit in the scene's light
  },
  // Early 70s, short grey hair, a white mustache, a blue-and-green plaid flannel.
  walt: {
    skin: "#bf9f8d",
    hair: "#bdb2aa",
    mustache: "#b3a197", // the mustache as his graded face texture has it, so the relief matches the photo under it
    top: "#1d4470", // the plaid's blue
    topDeep: "#0c2433", // its dark navy bands
    topCheck: "#3c6659", // its green blocks
    topRib: "#183e3f", // collar and cuffs, where blue and green cross
    tee: "#dcddd6",
  },
};

// The player: a lab-coat sleeve, a hand, and the pen (the classic N64 shooter's gun-in-hand, disarmed).
export const staffPalette = {
  coat: "#c6ccd2",
  coatCuff: "#959da6",
  skin: "#a8704c",
  penBarrel: "#26448a",
  penMetal: "#d3d8dd",
  penTip: "#1a1c20",
};

// The segmented HUD arcs, bottom segment first. Exchange progress only.
export const hud = {
  orange: ["#ffd84a", "#ffbd2e", "#ff9a1f", "#ff7418", "#f94c17", "#e62a1a"],
  blue: ["#c6dcff", "#9fbfff", "#7a9cff", "#5a79f5", "#3c55e2", "#2436c4"],
  text: "#f2efcf",
  shadow: "#07090b",
};

// The Rx handheld: a rugged near-black body with rubber corner bumpers, and the
// same green terminal screen the old Rx watch carried (Kevin's ruling of
// 2026-09-15 is quoted in the design notes). Generic: no maker's mark
// ships, only the game's own small embossed Rx where the wordmark sat on the
// reference device.
export const lcd = { face: "#103a1e", faceDeep: "#082212", text: "#8cff99", dim: "#5cc272", line: "#2e7a44" };
// The dossier's paperclip wire (files.css), unrelated to the handheld above.
export const steel = { steel: "#a9b0b8", steelLight: "#e4e8ec" };
export const device = {
  bodyDark: "#141517",
  bodyMid: "#1d1f22",
  bodySheen: "#3c4045",
  bodyEdge: "#08090a",
  bumper: "#4d5055",
  bumperEdge: "#28292c",
  button: "#55585d",
  buttonEdge: "#2a2c2f",
  lens: "#2b3239",
  lensRing: "#484e56",
  earpiece: "#0c0d0e",
  speaker: "#0a0b0c",
  rxMark: "#43474b",
};

// The control deck under the game screen.
export const deck = {
  page: "#14171b",
  panel: "#252a32",
  panelHigh: "#39414b",
  panelLow: "#0e1115",
  border: "#48515c",
  text: "#eef1f4",
  muted: "#b4bdc7",
  disabled: "#626a74",
  focus: "#ffd84a",
};

// The patient files (Kevin, 2026-09-15: the classic N64 shooter's menu idioms, mixed by screen).
// SELECT FILE lays closed olive folders on a near-black backdrop. Every other menu
// screen is printed on the opened khaki file, laid on a plain dark desk (Kevin,
// 2026-09-15: the olive mottle read as camouflage, so the desk went darker and
// plainer, like the classic N64 shooter's own menus). Dark
// type, an engraved crest, a red rubber stamp, and the red Rx cursor (the approved
// crosshair swap). Every text pair holds 4.5:1, checked by counter-contrast.test.js:
// ink and inkSoft on paperLight, paper, paperDeep and card; menu and menuDim on night.
export const dossier = {
  night: "#0b0c0e",
  nightLift: "#262a2f",
  backdrop: "#1b1c1e",
  backdropLight: "#2b2d30",
  backdropDeep: "#0e0f10",
  folder: "#6e6a4e",
  folderLight: "#8a855f",
  folderDeep: "#4c4935",
  folderEdge: "#33311f",
  paper: "#d6cda2",
  paperLight: "#e6dfbb",
  paperDeep: "#bdb385",
  paperEdge: "#978d67",
  ink: "#2e2c25",
  inkSoft: "#48443a",
  engrave: "#a0977a",
  engraveLight: "#f1ebcf",
  gold: "#b39a55",
  goldLight: "#e2cd8e",
  goldDeep: "#65552a",
  stamp: "#b8332b",
  cursor: "#cc2419",
  mount: "#f1eee3",
  card: "#f3f0e5",
  cardRule: "#b8c9d6",
  cardMargin: "#d7908a",
  menu: "#ebe8dc",
  menuDim: "#aba89b",
  shadow: "#050506",
};

// Open-licensed (OFL) faces, bundled through @fontsource in main.jsx.
export const type = {
  display: '"Michroma", "Arial Black", sans-serif',
  hud: '"Share Tech Mono", ui-monospace, monospace',
  body: '"Oxanium", ui-sans-serif, system-ui, sans-serif',
};

// Paper, board and desk texture: SVG noise the browser draws itself (no image
// asset), laid over the token colours above as dark mottling. Its alpha is
// gain * noise + offset, so a lower offset leaves more of the surface clean.
const noise = ({ frequency, octaves, seed, gain, offset }) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${gain} 0 0 0 ${offset}'/></filter><rect width='256' height='256' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

export const texture = {
  // The file's paper: soft, faint blotches, like the console's filtered paper
  // texture, kept light enough that small type stays readable on any of it.
  paper: noise({ frequency: 0.018, octaves: 4, seed: 7, gain: 0.55, offset: -0.24 }),
  // A closed folder's board: the same blotches, stronger.
  board: noise({ frequency: 0.02, octaves: 4, seed: 11, gain: 1.05, offset: -0.42 }),
  // The olive cover the file lies open on: heavily mottled, as in the reference.
  desk: noise({ frequency: 0.022, octaves: 3, seed: 5, gain: 1.6, offset: -0.62 }),
  // Fine tooth for every surface.
  grain: noise({ frequency: 0.75, octaves: 2, seed: 3, gain: 0.5, offset: -0.2 }),
};

const arcVars = Object.fromEntries([
  ...hud.orange.map((value, index) => [`--enc-arc-orange-${index}`, value]),
  ...hud.blue.map((value, index) => [`--enc-arc-blue-${index}`, value]),
]);

const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
// dossier.paperDeep -> --ci-paper-deep, and so on for every file colour.
const fileVars = Object.fromEntries(Object.entries(dossier).map(([name, value]) => [`--ci-${kebab(name)}`, value]));

export const counterTheme = {
  ...fileVars,
  "--ci-paper-mottle": texture.paper,
  "--ci-board-mottle": texture.board,
  "--ci-desk-mottle": texture.desk,
  "--ci-grain": texture.grain,
  "--ci-font-menu": type.display,
  "--ci-font-typed": type.hud,
  "--ci-font-body": type.body,
  "--enc-page": deck.page,
  "--enc-panel": deck.panel,
  "--enc-panel-high": deck.panelHigh,
  "--enc-panel-low": deck.panelLow,
  "--enc-border": deck.border,
  "--enc-text": deck.text,
  "--enc-muted": deck.muted,
  "--enc-disabled": deck.disabled,
  "--enc-focus": deck.focus,
  "--enc-fog": store.fog,
  "--enc-hud-text": hud.text,
  "--enc-hud-shadow": hud.shadow,
  "--enc-lcd-face": lcd.face,
  "--enc-lcd-face-deep": lcd.faceDeep,
  "--enc-lcd-text": lcd.text,
  "--enc-lcd-dim": lcd.dim,
  "--enc-lcd-line": lcd.line,
  "--enc-steel": steel.steel,
  "--enc-steel-light": steel.steelLight,
  "--enc-device-dark": device.bodyDark,
  "--enc-device-mid": device.bodyMid,
  "--enc-device-sheen": device.bodySheen,
  "--enc-device-edge": device.bodyEdge,
  "--enc-device-bumper": device.bumper,
  "--enc-device-bumper-edge": device.bumperEdge,
  "--enc-device-button": device.button,
  "--enc-device-button-edge": device.buttonEdge,
  "--enc-device-lens": device.lens,
  "--enc-device-lens-ring": device.lensRing,
  "--enc-device-earpiece": device.earpiece,
  "--enc-device-speaker": device.speaker,
  "--enc-device-rx-mark": device.rxMark,
  "--enc-coat": staffPalette.coat,
  "--enc-coat-cuff": staffPalette.coatCuff,
  "--enc-staff-skin": staffPalette.skin,
  "--enc-font-display": type.display,
  "--enc-font-hud": type.hud,
  "--enc-font-body": type.body,
  ...arcVars,
};
