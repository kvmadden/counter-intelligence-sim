import { CanvasTexture, ClampToEdgeWrapping, NearestFilter, RepeatWrapping, Texture } from "three";
import { patientPalette, store } from "../theme.js";
import { eachDot, textWidth } from "./font.js";

// Every environment texture is painted procedurally into a tiny canvas (the N64
// had 4 KB of texture memory, so 32x32 and 64x64 were the norm): no external
// art, so no licence questions. Seeded, so the store is the same store on every
// render and in every screenshot.

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const channels = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function forThreePoint(texture, repeat) {
  texture.magFilter = NearestFilter; // n64ThreePoint does the filtering
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  texture.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  return texture;
}

function paint(width, height, seed, draw, { repeat = true } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const image = context.createImageData(width, height);
  const random = seeded(seed);
  const set = (x, y, hex, noise = 0, gain = 1) => {
    const px = ((Math.round(x) % width) + width) % width;
    const py = ((Math.round(y) % height) + height) % height;
    const jitter = noise ? (random() * 2 - 1) * noise : 0;
    const i = (py * width + px) * 4;
    channels(hex).forEach((value, c) => {
      image.data[i + c] = Math.max(0, Math.min(255, value * gain + jitter));
    });
    image.data[i + 3] = 255;
  };
  const fill = (x0, y0, w, h, hex, noise = 0, gain = 1) => {
    for (let y = y0; y < y0 + h; y += 1) for (let x = x0; x < x0 + w; x += 1) set(x, y, hex, noise, gain);
  };
  // Grime tools: blend towards a colour rather than overwrite, so the texture shows through.
  const mix = (x, y, hex, t) => {
    const px = ((Math.round(x) % width) + width) % width;
    const py = ((Math.round(y) % height) + height) % height;
    const i = (py * width + px) * 4;
    channels(hex).forEach((value, c) => {
      image.data[i + c] = Math.round(image.data[i + c] * (1 - t) + value * t);
    });
  };
  const blot = (cx, cy, radius, hex, strength) => {
    for (let dy = -Math.ceil(radius); dy <= radius; dy += 1) {
      for (let dx = -Math.ceil(radius); dx <= radius; dx += 1) {
        const falloff = 1 - Math.hypot(dx, dy) / radius;
        if (falloff > 0) mix(cx + dx, cy + dy, hex, strength * falloff * (0.6 + random() * 0.4));
      }
    }
  };
  draw({ set, fill, random, mix, blot });
  context.putImageData(image, 0, 0);
  return forThreePoint(new CanvasTexture(canvas), repeat);
}

// Vinyl composition tile, the retail floor: two tones in a loose checker, dark
// grout, speckle, and scuffs where the queue stands.
export function floorTiles() {
  return paint(32, 32, 23, ({ set, random, blot }) => {
    for (let ty = 0; ty < 2; ty += 1) {
      for (let tx = 0; tx < 2; tx += 1) {
        const base = (tx + ty) % 2 ? store.floorTileAlt : store.floorTile;
        for (let y = 0; y < 16; y += 1) {
          for (let x = 0; x < 16; x += 1) {
            const grout = x === 0 || y === 0;
            set(tx * 16 + x, ty * 16 + y, grout ? store.floorGrout : base, grout ? 3 : 9);
          }
        }
      }
    }
    for (let i = 0; i < 26; i += 1) set(random() * 32, random() * 32, store.stain, 6);
    for (let i = 0; i < 8; i += 1) blot(random() * 32, random() * 32, 1 + random() * 1.5, store.grime, 0.32);
  });
}

// A lay-in acoustic ceiling: pale fissured tiles in a grey grid, a water stain or two.
export function ceilingTiles() {
  return paint(32, 32, 47, ({ set, random, blot }) => {
    for (let y = 0; y < 32; y += 1) for (let x = 0; x < 32; x += 1) set(x, y, x % 16 === 0 || y % 16 === 0 ? store.ceilingGrid : store.ceiling, 6);
    for (let i = 0; i < 40; i += 1) set(random() * 32, random() * 32, store.stain, 4);
    blot(random() * 32, random() * 32, 4, store.stain, 0.3);
  });
}

// Painted drywall with a darker kick band and a scuffed base trim.
export function storeWall() {
  return paint(32, 32, 31, ({ fill, random, blot }) => {
    fill(0, 0, 32, 32, store.wall, 5);
    fill(0, 26, 32, 5, store.wallLow, 4);
    fill(0, 31, 32, 1, store.wallTrim, 2);
    for (let i = 0; i < 3; i += 1) blot(random() * 32, 24 + random() * 6, 3, store.grime, 0.2);
  });
}

// Front-store gondola shelving: four shelves of anonymous packaged goods, each
// with a pale label band and a price strip along the shelf edge. No words, no brands.
export function gondolaStock() {
  return paint(64, 64, 67, ({ set, fill, random }) => {
    for (let bay = 0; bay < 4; bay += 1) {
      const top = bay * 16;
      fill(0, top, 64, 16, store.shelfBack, 3);
      let x = 0;
      while (x < 64) {
        const w = Math.min(4 + Math.floor(random() * 6), 64 - x);
        const h = 7 + Math.floor(random() * 5);
        const color = store.stock[Math.floor(random() * store.stock.length)];
        fill(x, top + 13 - h, w, h, color, 6);
        if (w > 2) fill(x + 1, top + 15 - h, w - 2, 2, store.stock[4], 3);
        x += w + (random() < 0.3 ? 1 : 0);
      }
      fill(0, top + 13, 64, 3, store.priceStrip, 3);
      for (let t = 2; t < 64; t += 9) set(t, top + 14, store.signRed, 4);
    }
  });
}

// The pharmacist's own side, seen in the opening pan: stock bays of white stock
// bottles with coloured labels and amber vials, a pale shelf edge under each row.
export function pharmacyStock() {
  return paint(64, 64, 83, ({ set, fill, random }) => {
    for (let bay = 0; bay < 4; bay += 1) {
      const top = bay * 16;
      fill(0, top, 64, 16, store.shelfBack, 3);
      let x = 1;
      while (x < 62) {
        const vial = random() < 0.35;
        const w = Math.min(vial ? 3 : 4 + Math.floor(random() * 2), 63 - x);
        const h = vial ? 6 : 8 + Math.floor(random() * 3);
        fill(x, top + 14 - h, w, h, vial ? store.vial : store.vialCap, 5);
        fill(x, top + 14 - h, w, 2, vial ? store.vialCap : store.printerDark, 3);
        if (!vial) fill(x, top + 11 - Math.floor(h / 2), w, 3, store.stock[Math.floor(random() * store.stock.length)], 5);
        x += w + 1;
      }
      fill(0, top + 14, 64, 2, store.shelfMetal, 3);
      set(0, top + 15, store.shelfEdge);
    }
  });
}

// The will-call rack: blue bins of filled, folded-over paper bags.
export function bagBins() {
  return paint(32, 32, 91, ({ fill, random }) => {
    for (let row = 0; row < 2; row += 1) {
      const top = row * 16;
      fill(0, top, 32, 16, store.shelfBack, 3);
      for (let col = 0; col < 4; col += 1) {
        const left = col * 8;
        for (let bag = 0; bag < 3; bag += 1) {
          const h = 5 + Math.floor(random() * 4);
          fill(left + 1 + bag * 2, top + 10 - h, 2, h, random() < 0.5 ? store.bag : store.bagFold, 6);
        }
        fill(left, top + 9, 8, 7, store.bin, 5);
        fill(left, top + 9, 8, 1, store.binDeep, 3);
        fill(left + 3, top + 11, 2, 2, store.signWhite, 3);
      }
    }
  });
}

export function counterTop() {
  return paint(32, 32, 59, ({ set, fill, random, mix }) => {
    fill(0, 0, 32, 32, store.counterTop, 5);
    for (let i = 0; i < 44; i += 1) set(random() * 32, random() * 32, store.counterFleck, 3);
    for (let i = 0; i < 10; i += 1) {
      const x = random() * 32;
      const y = random() * 32;
      for (let k = 0; k < 3 + random() * 4; k += 1) mix(x + k, y, store.grime, 0.16);
    }
  });
}

// Every sign in the store shares one small atlas, so the signage is one draw.
// Generic retail words only: no chain's name, logo, wordmark or number. The
// bundle scanner and tests/unit/counter-look.test.js hold that line.
export const ATLAS = { width: 128, height: 128 };
export const SIGNS = {
  PHARMACY: { x: 0, y: 0, w: 128, h: 24, scale: 2 },
  "PICK UP": { x: 0, y: 24, w: 64, h: 16 },
  "DROP OFF": { x: 64, y: 24, w: 64, h: 16 },
  CONSULTATION: { x: 0, y: 40, w: 128, h: 16, ink: "signRed", ground: "signWhite" },
  VITAMINS: { x: 0, y: 56, w: 64, h: 12 },
  BEAUTY: { x: 64, y: 56, w: 64, h: 12 },
  SNACKS: { x: 0, y: 68, w: 64, h: 12 },
  "FIRST AID": { x: 64, y: 68, w: 64, h: 12 },
  "PLEASE WAIT HERE": { x: 0, y: 80, w: 128, h: 12 },
  HOUSEHOLD: { x: 0, y: 92, w: 64, h: 12 },
  PHOTO: { x: 64, y: 92, w: 64, h: 12 },
};
// The workstation's green-screen, below the signs in the same atlas.
export const SCREEN = { x: 0, y: 104, w: 48, h: 24 };

// A region of the atlas as UV bounds (the canvas is flipped on upload, so v runs up).
export function atlasRect({ x, y, w, h }) {
  return { u0: x / ATLAS.width, u1: (x + w) / ATLAS.width, v0: 1 - (y + h) / ATLAS.height, v1: 1 - y / ATLAS.height };
}

export function signAtlas() {
  return paint(ATLAS.width, ATLAS.height, 97, ({ set, fill, random }) => {
    fill(0, 0, ATLAS.width, ATLAS.height, store.signRedDeep);
    for (const [word, sign] of Object.entries(SIGNS)) {
      const { x, y, w, h, scale = 1, ink = "signWhite", ground = "signRed" } = sign;
      fill(x, y, w, h, store[ground], 4);
      fill(x, y, w, 1, store.signRedDeep, 2);
      fill(x, y + h - 1, w, 1, store.signRedDeep, 2);
      const left = x + Math.floor((w - textWidth(word, scale)) / 2);
      const top = y + Math.floor((h - 7 * scale) / 2);
      eachDot(word, left, top, scale, (px, py) => set(px, py, store[ink], 3));
    }
    const { x, y, w, h } = SCREEN;
    fill(x, y, w, h, store.monitorScreen, 3);
    fill(x + 2, y + 2, w - 4, 2, store.monitorText, 8);
    for (let row = y + 6; row < y + h - 2; row += 3) {
      let at = x + 2;
      while (at < x + w - 4) {
        const run = 2 + Math.floor(random() * 6);
        fill(at, row, Math.min(run, x + w - 2 - at), 1, store.monitorText, 18, 0.85);
        at += run + 1 + Math.floor(random() * 2);
      }
    }
  }, { repeat: false });
}

// Her own dark, fitted crew-neck: fine vertical ribbing.
export function knit(palette = patientPalette) {
  return paint(16, 16, 71, ({ fill, set }) => {
    fill(0, 0, 16, 16, palette.top, 4);
    for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y += 1) set(x, y, palette.topDeep, 2);
  });
}

// A polo's pique knit: a fine grid of darker cells in the body colour, with the odd fleck of light.
export function pique(palette) {
  return paint(16, 16, 73, ({ fill, set, random }) => {
    fill(0, 0, 16, 16, palette.top, 4);
    for (let y = 0; y < 16; y += 2) for (let x = y % 4 ? 1 : 0; x < 16; x += 2) set(x, y, palette.topDeep, 3);
    for (let i = 0; i < 10; i += 1) set(random() * 16, random() * 16, palette.topRib, 4);
  });
}

// Denim: a diagonal twill in two blues, faded here and there where a jacket wears.
export function denim(palette) {
  return paint(16, 16, 79, ({ set, random, blot }) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) set(x, y, (x + y) % 4 === 0 ? palette.topDeep : palette.top, 7);
    }
    for (let i = 0; i < 3; i += 1) blot(random() * 16, random() * 16, 2.5, palette.topRib, 0.45);
  });
}

// A flannel plaid in one 16-texel repeat: blue and green blocks, teal where they cross,
// and dark navy bands between, deepest where two bands meet.
export function plaid(palette) {
  return paint(16, 16, 83, ({ set }) => {
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const bandX = x === 7 || x === 15;
        const bandY = y === 7 || y === 15;
        const greenX = x < 7;
        const greenY = y < 7;
        if (bandX && bandY) set(x, y, palette.topDeep, 2, 0.7);
        else if (bandX || bandY) set(x, y, palette.topDeep, 4);
        else if (greenX === greenY) set(x, y, greenX ? palette.topCheck : palette.top, 6);
        else set(x, y, palette.topRib, 6);
      }
    }
  });
}

// The face and hair: small PNGs cropped from the photo by
// scripts/make-face-texture.mjs, drawn through the same three-point filter.
export function imageTexture(url, { repeat = false } = {}) {
  const image = new Image();
  const texture = forThreePoint(new Texture(image), repeat);
  const ready = new Promise((resolve, reject) => {
    image.onload = () => {
      texture.needsUpdate = true;
      resolve(texture);
    };
    image.onerror = reject;
  });
  image.src = url;
  return { texture, ready };
}
