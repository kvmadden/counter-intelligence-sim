import { FONT, CHW, textW, fitLine, wrapText } from './font.js';
import { CHARS, T, COPY, SHOTS, SHOT_IDS, TITLE_LINE, TITLE_BLINK } from './data.js';
import { L } from './logic.js';
import { ST } from './state.js';

/* render.js — software pixel renderer (identical in browser & Node) + all art.
   ART=0 → placeholder rectangles (phase 1 timing build)
   ART=1 → full pixel art (phase 2)
   Everything draws to one 480x270 Uint32 buffer; browser blits it, Node dumps PNGs. */

let ART = 1;

const R = {
  W: 480, H: 270,
  buf: null,
  ctx: null, imgData: null, view32: null, little: true,
  lint: { on: false, records: [] },

  init() {
    if (!this.buf) this.buf = new Uint32Array(this.W * this.H);
  },
  initBrowser(canvas) {
    this.init();
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.imgData = this.ctx.createImageData(this.W, this.H);
    this.view32 = new Uint32Array(this.imgData.data.buffer);
    // endianness check: 0x01020304 → if first byte is 0x04, little-endian ABGR packing
    const probe = new Uint32Array(1); probe[0] = 0x01020304;
    const bytes = new Uint8Array(probe.buffer);
    this.little = bytes[0] === 0x04;
  },
  blit() {
    if (!this.view32) return;
    const v = this.view32, b = this.buf;
    if (this.little) {
      for (let i = 0; i < b.length; i++) v[i] = b[i]; // 0xAABBGGRR is already ABGR on LE
    } else {
      for (let i = 0; i < b.length; i++) {
        const x = b[i];
        v[i] = ((x & 0xff) << 24) | ((x & 0xff00) << 8) | ((x & 0xff0000) >> 8) | ((x & 0xff000000) >>> 24);
      }
    }
    this.ctx.putImageData(this.imgData, 0, 0);
  },

  clear(col) { this.fill(0, 0, this.W, this.H, col); },
  rect(x, y, w, h, col) { this.fill(x | 0, y | 0, w | 0, h | 0, col); },

  // input: #RRGGBB or #RRGGBBAA (web convention) -> internal 0xAABBGGRR (byte-packed LE)
  _cc(col) {
    if (typeof col === 'number') return col >>> 0;
    const v = parseInt(col.slice(1), 16);
    const a = (col.length === 9) ? (v & 0xff) : 0xff;
    const r = (v >> 16) & 0xff, g = (v >> 8) & 0xff, b = v & 0xff;
    return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
  },

  ox: 0, oy: 0,

  fill(x, y, w, h, col) {
    x = (x + (this.ox | 0)) | 0;
    y = (y + (this.oy | 0)) | 0;
    const c = this._cc(col);
    const buf = this.buf, W = this.W, H = this.H;
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x >= W || y >= H || w <= 0 || h <= 0) return;
    const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
    const a = c >>> 24;
    if (a >= 255) {
      for (let yy = y; yy < y1; yy++) {
        let i = yy * W + x;
        for (let xx = x; xx < x1; xx++, i++) buf[i] = c;
      }
    } else {
      const f = a / 255, inv = 1 - f;
      const cr = (c >> 16) & 255, cg = (c >> 8) & 255, cb = c & 255;
      for (let yy = y; yy < y1; yy++) {
        let i = yy * W + x;
        for (let xx = x; xx < x1; xx++, i++) {
          const o = buf[i];
          const r = (cr * f + ((o >> 16) & 255) * inv) | 0;
          const g = (cg * f + ((o >> 8) & 255) * inv) | 0;
          const b = (cb * f + (o & 255) * inv) | 0;
          buf[i] = (0xff << 24 | r << 16 | g << 8 | b) >>> 0;
        }
      }
    }
  },

  px(x, y, col) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    this.fill(x, y, 1, 1, col);
  },

  line(x0, y0, x1, y1, col, wdt) {
    wdt = wdt || 1;
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.rect(x0 - (wdt >> 1), y0 - (wdt >> 1), wdt, wdt, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  },

  circle(x, y, r, col, filled) {
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const d = i * i + j * j;
        if (filled ? d <= r * r : d >= (r - 1) * (r - 1)) this.px(x + i, y + j, col);
      }
    }
  },

  // ---- text ---------------------------------------------------------------
  textW(str, scale) { return textW(str, scale); },

  text(x, y, str, col, scale, align) {
    scale = scale || 1;
    if (align === 'center') x = x - textW(str, scale) / 2;
    else if (align === 'right') x = x - textW(str, scale);
    x |= 0; y |= 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      const g = FONT[ch] || FONT[ch.toUpperCase()] || FONT['?'] || FONT[' '];
      if (!g) continue;
      const gx = x + i * CHW * scale;
      for (let r = 0; r < 7; r++) {
        const row = g[r];
        if (!row) continue;
        for (let c = 0; c < 5; c++) {
          if (row & (16 >> c)) this.rect(gx + c * scale, y + r * scale, scale, scale, col);
        }
      }
    }
    if (this.lint.on) {
      this.lint.records.push({
        x: x | 0, y: y | 0,
        w: textW(str, scale), h: 7 * scale,
        str: str.toUpperCase(),
      });
    }
  },
};

// ============================================================================
// STAGE GEOMETRY
// ============================================================================
const PANEL_Y = 186;
const STAGE_H = 186;
const FLOOR_Y = 142;
const FEET_Y = 178;
const PHARM_X = 150, PAT_X = 330;
const RIM = { x: 441, y: 53 };

function easeOut(t) { return 1 - (1 - t) * (1 - t); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ============================================================================
// CHIBI SPRITES (big-head, feet planted, slow horizontal drift only)
// ============================================================================
function chibi(x, y, c, f, G, expr, opts) {
  opts = opts || {};
  const s = opts.s || 1;
  const P = c.palette;
  const Rr = (px, py, pw, ph, col) => R.rect(x + Math.round(px * s), y - Math.round(ph * s) - Math.round((py - 66) * s * 0) , pw * s, ph * s, col);
  // simpler: helper that places with explicit top offset from feet
  const rectAt = (px, top, pw, ph, col) => {
    // px: x offset from center; top: height above feet
    R.rect(x + Math.round(px * s), y - Math.round((top + ph) * s), Math.max(1, Math.round(pw * s)), Math.max(1, Math.round(ph * s)), col);
  };

  // legs + shoes
  rectAt(-7, 3, 6, 10, P.pants);
  rectAt(1, 3, 6, 10, P.pants);
  rectAt(-9, 0, 9, 3, P.shoes);
  rectAt(1, 0, 9, 3, P.shoes);
  // torso
  rectAt(-11, 12, 22, 27, '#20203A');
  rectAt(-10, 13, 20, 25, c.id === 'pharm' ? '#f2f4f8' : P.coat);
  // arms
  rectAt(-14, 21, 4, 15, c.id === 'pharm' ? '#e4e8ef' : P.coatDark);
  rectAt(10, 21, 4, 15, c.id === 'pharm' ? '#e4e8ef' : P.coatDark);
  rectAt(-14, 17, 4, 4, P.skin);
  rectAt(10, 17, 4, 4, P.skin);
  if (c.id === 'pharm') {
    // coat details: lapels, chest cross, armband
    rectAt(-3, 13, 1, 25, '#c9d2dd');
    rectAt(2, 13, 1, 25, '#c9d2dd');
    const cx = f > 0 ? 3 : -4;
    rectAt(cx, 24, 7, 2, '#d63b3b');
    rectAt(cx + 2, 21, 2, 8, '#d63b3b');
    rectAt(10, 28, 4, 3, '#2e9e5b'); // cross armband
  }
  // neck + head (big, rounded): head spans heights 40..62
  const ho = opts.headOff || 0;
  rectAt(-3, 38 + ho, 6, 2, P.skin);
  rectAt(-3, 39 + ho, 6, 1, '#00000026');
  rectAt(-12, 59 + ho, 24, 4, '#20203A');
  rectAt(-13, 41 + ho, 26, 20, '#20203A');
  rectAt(-10, 39 + ho, 20, 4, '#20203A');
  rectAt(-11, 60 + ho, 22, 2, P.skin);   // top (chamfered) 60..62
  rectAt(-12, 42 + ho, 24, 18, P.skin);  // main 42..60
  rectAt(-9, 40 + ho, 18, 2, P.skin);    // chin 40..42
  // hair by style
  const hair = P.hair;
  if (c.style === 'cap') {
    const cap = c.palette.cap || hair, capD = c.palette.capDark || hair;
    rectAt(-12, 62 + ho, 24, 3, cap);
    rectAt(-9, 65 + ho, 18, 2, cap);
    rectAt(f > 0 ? 7 : -17, 62 + ho, 10, 2, capD);
    rectAt(-1, 67 + ho, 2, 1, capD);
  } else if (c.style === 'bun') {
    rectAt(-12, 61 + ho, 24, 4, hair);
    R.circle(x + Math.round((f > 0 ? -15 : 15) * s), y - Math.round((63 + ho) * s), 4 * s, hair, true);
    rectAt(-12, 57 + ho, 2, 6, hair);
    rectAt(10, 57 + ho, 2, 6, hair);
  } else if (c.style === 'long') {
    rectAt(-12, 61 + ho, 24, 4, hair);
    rectAt(-14, 42 + ho, 4, 20, hair);
    rectAt(10, 42 + ho, 4, 20, hair);
    rectAt(-9, 55 + ho, 2, 6, hair);
    rectAt(7, 55 + ho, 2, 6, hair);
  } else if (c.style === 'foil') {
    rectAt(-10, 63 + ho, 20, 4, '#cfd6dd');
    rectAt(-7, 67 + ho, 14, 4, '#cfd6dd');
    rectAt(-3, 71 + ho, 6, 3, '#dfe5ea');
    rectAt(-12, 61 + ho, 24, 2, '#9aa2ab');
    R.px(x + 2, y - Math.round((68 + ho) * s), '#ffffff');
    R.px(x - 5, y - Math.round((64 + ho) * s), '#ffffff');
  } else { // pharm tuft
    rectAt(-12, 62 + ho, 24, 3, '#2a2320');
    rectAt(-12, 60 + ho, 2, 3, '#2a2320');
    rectAt(10, 60 + ho, 2, 3, '#2a2320');
    rectAt(-2, 65 + ho, 4, 2, '#2a2320');
  }

  // ---- face ----------------------------------------------------------------
  const ey = 54 + ho; // eye top height above feet
  const worried = (expr === 'sweat');
  const shock = (expr === 'shock');
  const joy = (expr === 'joy');
  const det = (expr === 'det');
  const browCol = c.id === 'pharm' ? '#2a2320' : '#3a2a1a';
  // eyebrows
  const bL = worried ? 1 : (shock ? 2 : 0);
  const bR = worried ? 0 : (shock ? 2 : 0);
  rectAt(-9, 55 + bL + ho, 6, 1, browCol);
  rectAt(3, 55 + bR + ho, 6, 1, browCol);
  if (det) { rectAt(-9, 57 + ho, 2, 1, browCol); rectAt(3, 57 + ho, 2, 1, browCol); }
  // eyes
  if (c.id === 'pharm' && !opts.noGlasses) {
    // capsule glasses: rounded pill, white half + pink (facing) half
    for (const ex of [-10, 1]) {
      rectAt(ex + 1, 54 + ho, 7, 1, '#fafbfc');
      rectAt(ex, 53 + ho, 9, 4, '#fafbfc');
      rectAt(ex + 1, 49 + ho, 7, 1, '#fafbfc');
      if (f > 0) {
        rectAt(ex + 6, 54 + ho, 2, 1, '#ff8fb8');
        rectAt(ex + 5, 53 + ho, 4, 4, '#ff8fb8');
        rectAt(ex + 6, 49 + ho, 2, 1, '#ff8fb8');
      } else {
        rectAt(ex + 1, 54 + ho, 2, 1, '#ff8fb8');
        rectAt(ex, 53 + ho, 4, 4, '#ff8fb8');
        rectAt(ex + 1, 49 + ho, 2, 1, '#ff8fb8');
      }
      // frame
      R.rect(x + Math.round(ex * s), y - Math.round((53 + ho) * s), Math.max(1, s), 1, '#4a4a55');
      R.rect(x + Math.round((ex + 8) * s), y - Math.round((53 + ho) * s), Math.max(1, s), 1, '#4a4a55');
      R.rect(x + Math.round((ex + 1) * s), y - Math.round((52 + ho) * s), Math.max(1, s), 1, '#4a4a55');
      R.rect(x + Math.round((ex + 1) * s), y - Math.round((50 + ho) * s), Math.max(1, s), 1, '#4a4a55');
    }
    rectAt(-1, 51 + ho, 2, 1, '#4a4a55'); // bridge
    // pupils behind the lens
    rectAt(f > 0 ? -6 : -7, 50 + ho, 2, 3, '#22222c');
    rectAt(f > 0 ? 6 : 5, 50 + ho, 2, 3, '#22222c');
    if (opts.fire) { // flaming capsule glasses
      const fr = Math.floor((G ? G.time : 0) * 10) % 3;
      for (const fx of [-7, -1, 5]) {
        R.rect(x + Math.round(fx * s), y - Math.round((56 + ho) * s), s, (2 + fr) * s, fr === 0 ? '#ffd23e' : '#ff7a1a');
      }
      R.px(x + 2, y - Math.round((59 + ho) * s), '#ffef9e');
    }
  } else {
    for (const ex of [-9, 4]) {
      if (joy) {
        rectAt(ex, 51 + ho, 5, 1, '#22222c');
        rectAt(ex, 52 + ho, 1, 1, '#22222c');
        rectAt(ex + 4, 52 + ho, 1, 1, '#22222c');
      } else {
        rectAt(ex, 53 + ho, 6, 6, '#ffffff');
        const pw = shock ? 2 : 2;
        rectAt(ex + (f > 0 ? 3 : 0), 55 + ho, pw, 3, '#22222c');
        R.px(x + Math.round((ex + (f > 0 ? 4 : 1)) * s), y - Math.round((58 + ho) * s), '#ffffff');
      }
    }
  }
  // blush on joy
  if (joy) { rectAt(-11, 47 + ho, 2, 1, '#f2a0a0'); rectAt(9, 47 + ho, 2, 1, '#f2a0a0'); }
  // mouth
  const my = 45 + ho;
  if (shock) rectAt(-1, my, 2, 3, '#7a3a3a');
  else if (joy) {
    rectAt(-3, my, 6, 1, '#7a3a3a');
    rectAt(-4, my + 1, 1, 1, '#7a3a3a');
    rectAt(3, my + 1, 1, 1, '#7a3a3a');
  }
  else if (expr === 'talk') rectAt(-2, my, 4, 2, '#7a3a3a');
  else if (det) rectAt(-2, my, 4, 1, '#7a3a3a');
  else rectAt(-2, my, 4, 1, '#8a4a4a');

  // sweat drop (bad news)
  if (expr === 'sweat') {
    const sy = (opts.dropOff || 0);
    const sx = f > 0 ? 11 : -13;
    rectAt(sx, 58 - sy + ho, 2, 3, '#66ccff');
    R.px(x + Math.round(sx * s), y - Math.round((61 - sy + ho) * s), '#cfeeff');
  }
}

// big head for cut-ins (center cx,cy)
function chibiHead(cx, cy, c, f, expr, scale) {
  scale = scale || 2.4;
  const P = c.palette;
  const rectAt = (px, py, pw, ph, col) =>
    R.rect(cx + Math.round(px * scale), cy + Math.round(py * scale), Math.max(1, Math.round(pw * scale)), Math.max(1, Math.round(ph * scale)), col);
  // rounded head centered at (cx,cy)
  rectAt(-11, -13, 22, 2, P.skin);   // top (chamfered)
  rectAt(-12, -11, 24, 20, P.skin);  // main
  rectAt(-10, 9, 20, 2, P.skin);     // chin
  // neck + shoulders hint (bust)
  rectAt(-4, 11, 8, 3, P.skin);
  rectAt(-16, 13, 32, 5, c.palette.coat);
  const hair = P.hair;
  if (c.style === 'cap') { rectAt(-12, -16, 24, 4, hair); rectAt(-9, -18, 18, 2, hair); rectAt(f > 0 ? 8 : -18, -14, 10, 2, c.palette.coatDark || hair); }
  else if (c.style === 'bun') { rectAt(-12, -15, 24, 4, hair); R.circle(cx + Math.round((f > 0 ? -16 : 16) * scale), cy - Math.round(13 * scale), 5 * scale, hair, true); }
  else if (c.style === 'long') { rectAt(-12, -15, 24, 4, hair); rectAt(-15, -11, 4, 22, hair); rectAt(11, -11, 4, 22, hair); }
  else if (c.style === 'foil') { rectAt(-11, -19, 22, 4, '#cfd6dd'); rectAt(-7, -23, 14, 4, '#dfe5ea'); rectAt(-12, -15, 24, 2, '#9aa2ab'); }
  else if (c.style === 'pharm') { rectAt(-12, -16, 24, 4, '#2a2320'); rectAt(-12, -12, 2, 4, '#2a2320'); rectAt(10, -12, 2, 4, '#2a2320'); }
  const browCol = c.style === 'pharm' ? '#2a2320' : '#3a2a1a';
  // eyes
  if (c.style === 'pharm') {
    for (const ex of [-11, 1]) {
      rectAt(ex + 1, -7, 7, 1, '#fafbfc');
      rectAt(ex, -6, 9, 5, '#fafbfc');
      rectAt(ex + 1, -1, 7, 1, '#fafbfc');
      if (f > 0) { rectAt(ex + 6, -7, 2, 1, '#ff8fb8'); rectAt(ex + 5, -6, 4, 5, '#ff8fb8'); rectAt(ex + 6, -1, 2, 1, '#ff8fb8'); }
      else { rectAt(ex + 1, -7, 2, 1, '#ff8fb8'); rectAt(ex, -6, 4, 5, '#ff8fb8'); rectAt(ex + 1, -1, 2, 1, '#ff8fb8'); }
      R.rect(cx + Math.round(ex * scale), cy + Math.round(-1 * scale), Math.max(1, scale), 1, '#4a4a55');
      R.rect(cx + Math.round((ex + 8) * scale), cy + Math.round(-1 * scale), Math.max(1, scale), 1, '#4a4a55');
      R.rect(cx + Math.round((ex + 1) * scale), cy + Math.round(-6 * scale), Math.max(1, scale), 1, '#4a4a55');
      R.rect(cx + Math.round((ex + 1) * scale), cy + Math.round(-2 * scale), Math.max(1, scale), 1, '#4a4a55');
    }
    rectAt(-1, -3, 2, 1, '#4a4a55');
    rectAt(f > 0 ? -6 : -8, -5, 2, 4, '#22222c');
    rectAt(f > 0 ? 6 : 4, -5, 2, 4, '#22222c');
  } else {
    for (const ex of [-9, 4]) {
      rectAt(ex, -6, 6, 7, '#ffffff');
      rectAt(ex + (f > 0 ? 2 : 0), -5, 3, 5, '#22222c');
      R.px(cx + Math.round((ex + (f > 0 ? 4 : 1)) * scale), cy + Math.round(-5 * scale), '#ffffff');
    }
  }
  // brow + mouth (determined)
  rectAt(-10, -10, 7, 2, browCol);
  rectAt(4, -10, 7, 2, browCol);
  rectAt(-9, -8, 2, 1, browCol);
  rectAt(3, -8, 2, 1, browCol);
  rectAt(-2, 5, 4, 1, '#7a3a3a');
  return { w: 32 * scale, h: 30 * scale };
}

function ball(x, y, fire) {
  if (fire) {
    R.circle(x, y, 7, '#ff7a1a4d', false);
  }
  R.circle(x, y, 5, '#f08c1e', true);
  R.line(x - 5, y, x + 5, y, '#7a3d0c', 1);
  R.line(x, y - 5, x, y + 5, '#7a3d0c', 1);
  R.px(x - 2, y - 2, '#ffd9a0');
}

const PHARM = { id: 'pharm', name: 'THE PHARMACIST', style: 'pharm', palette: { skin: '#e8b58c', hair: '#2a2320', coat: '#f2f4f8', coatDark: '#d5dbe4', pants: '#2a3448', shoes: '#1c1c24' } };

// ============================================================================
// ARENA
// ============================================================================
function drawCrowd(G) {
  if (!ART) return;
  const t = G.time;
  // Row of crowd silhouettes behind the court wall
  const crowdY = 100; // just above the floor line
  const crowdCol = '#4A90B866'; // semi-transparent dark on sky
  for (let i = 0; i < 12; i++) {
    const cx = 20 + i * 40;
    const bob = Math.round(Math.sin(t * 0.8 + i * 1.3) * 1.5);
    // head
    R.rect(cx - 4, crowdY - 12 + bob, 8, 8, crowdCol);
    // shoulders
    R.rect(cx - 7, crowdY - 4 + bob, 14, 8, crowdCol);
  }
}

function drawArena(G) {
  const t = G.time;
  // wall
  R.rect(0, 0, 480, FLOOR_Y, '#6BB8E0');
  if (ART) {
    for (let x = 30; x < 480; x += 60) R.rect(x, 16, 1, FLOOR_Y - 16, '#5AA8D0');
    R.rect(0, 118, 480, 2, '#5AA8D0');
  }
  drawCrowd(G);
  if (ART) {
    // parquet floor
    for (let i = 0; i < 8; i++) {
      const y = FLOOR_Y + i * 5.5;
      R.rect(0, y, 480, 5, i % 2 ? '#C8944A' : '#D4A35C');
      R.rect(0, y + 5, 480, 1, '#A07030');
      const off = (i % 2) * 40;
      for (let x = off; x < 480; x += 80) R.rect(x, y, 1, 5, '#B08040');
    }
    R.rect(0, FLOOR_Y, 480, 3, '#FFD93D'); // sideline
    // center court ring (solid ellipse outline, 2px lines)
    for (let dx = -62; dx <= 62; dx++) {
      const k = 1 - (dx * dx) / (62 * 62);
      const yoff = Math.round(9 * Math.sqrt(Math.max(0, k)));
      R.rect(240 + dx, 164 + yoff - 1, 1, 2, '#FFD93D');
      R.rect(240 + dx, 164 - yoff, 1, 2, '#FFD93D');
    }
  } else {
    R.rect(0, FLOOR_Y, 480, 44, '#2a2a33');
    R.rect(0, FLOOR_Y, 480, 1, '#444');
  }
  // hoop (side view): backboard, rim, woven net
  R.rect(452, 22, 8, 34, ART ? '#F8F8FF' : '#556');
  R.rect(452, 22, 8, 2, '#9aa7bd');
  R.rect(452, 54, 8, 2, '#9aa7bd');
  R.rect(430, 54, 22, 2, '#ff7a1a');
  R.rect(430, 56, 2, 2, '#c25a0e');
  if (ART) {
    for (let i = 0; i < 5; i++) {
      const x0 = 431 + i * 4.5;
      R.line(x0, 56, 440, 70, '#dfe6f0', 1);
    }
    R.rect(434, 61, 12, 1, '#c3cbdb');
    R.rect(437, 66, 7, 1, '#c3cbdb');
  }
}

function drawScoreboard(G) {
  const enc = G.enc;
  R.rect(130, 6, 220, 20, '#FFD93D');
  R.rect(131, 7, 218, 18, '#20203A');
  const dim = '#A098B8', on = '#FFD93D';
  if (G.mode === 'battle' && enc) {
    R.text(136, 12, 'DBT', dim);
    R.text(158, 12, String(Math.min(enc.doubt, 21)).padStart(2, '0'), on);
    R.text(178, 12, 'CLK', dim);
    R.text(198, 12, String(Math.max(0, enc.clock)).padStart(2, '0'), enc.clock <= 0 ? '#FF5C5C' : on);
    R.text(262, 12, 'RN', dim);
    R.text(278, 12, (G.round + 1) + '/4', on);
    R.text(308, 12, 'G', dim);
    R.text(318, 12, enc.goals + '/' + enc.need, on);
  } else {
    R.text(142, 12, 'SHOT CLOCK', on);
    R.text(285, 12, 'ARENA', on);
  }
}

function drawMascot(G) {
  if (!ART) return;
  const mx = 240, my = 16;
  const enc = G.enc;
  // clock body (circle approximation)
  R.rect(mx - 10, my - 8, 20, 18, '#FFF3D1'); // cream face
  R.rect(mx - 12, my - 6, 24, 14, '#FFF3D1');
  R.rect(mx - 10, my - 10, 20, 2, '#FFD93D'); // top rim
  R.rect(mx - 12, my + 8, 24, 2, '#FFD93D'); // bottom rim
  // bells
  R.rect(mx - 14, my - 12, 6, 4, '#FFD93D');
  R.rect(mx + 8, my - 12, 6, 4, '#FFD93D');
  // ink outline
  R.rect(mx - 13, my - 7, 1, 16, '#20203A');
  R.rect(mx + 12, my - 7, 1, 16, '#20203A');
  R.rect(mx - 11, my - 9, 22, 1, '#20203A');
  R.rect(mx - 11, my + 9, 22, 1, '#20203A');
  // clock hand
  if (enc) {
    const angle = (1 - enc.clock / 60) * Math.PI * 2 - Math.PI / 2;
    const hx = mx + Math.round(Math.cos(angle) * 6);
    const hy = my + Math.round(Math.sin(angle) * 6);
    R.line(mx, my, hx, hy, '#20203A', 1);
  } else {
    R.line(mx, my, mx, my - 6, '#20203A', 1); // noon position
  }
  // center dot
  R.px(mx, my, '#FF5C5C');
  // eyes (mood-based)
  const panic = enc && enc.clock <= 15;
  const happy = enc && enc.heat >= 2;
  if (panic) {
    // wide worried eyes
    R.rect(mx - 5, my - 4, 3, 3, '#20203A');
    R.rect(mx + 3, my - 4, 3, 3, '#20203A');
    // sweat
    R.px(mx + 8, my - 2, '#8ED8FF');
  } else if (happy) {
    // happy squint eyes
    R.rect(mx - 5, my - 3, 3, 1, '#20203A');
    R.rect(mx + 3, my - 3, 3, 1, '#20203A');
  } else {
    // neutral dot eyes
    R.rect(mx - 5, my - 3, 2, 2, '#20203A');
    R.rect(mx + 3, my - 3, 2, 2, '#20203A');
  }
  // mouth
  if (panic) R.rect(mx - 2, my + 3, 4, 2, '#20203A'); // open mouth worry
  else if (happy) R.rect(mx - 2, my + 3, 4, 1, '#20203A'); // smile
  else R.rect(mx - 1, my + 3, 2, 1, '#20203A'); // neutral
  // legs
  R.rect(mx - 6, my + 10, 3, 4, '#20203A');
  R.rect(mx + 3, my + 10, 3, 4, '#20203A');
  R.rect(mx - 7, my + 14, 5, 2, '#FFD93D'); // shoes
  R.rect(mx + 2, my + 14, 5, 2, '#FFD93D');
}

// ============================================================================
// EFFECTS
// ============================================================================
function speedLines(cx, cy, n, r0, r1, col, jitterSeed) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ((jitterSeed * (i + 3) * 7) % 10) * 0.01;
    const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0 * 0.7;
    const x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1 * 0.7;
    R.line(x0 | 0, y0 | 0, x1 | 0, y1 | 0, col, 2);
  }
}

function flashWord(word, tIn, dur, col, highlightCol) {
  if (!word) return;
  const s = tIn < 0.12 ? 4 : 3;
  const cx = 240, cy = 104;
  const w = textW(word, s);
  const x = cx - w / 2, y = cy;
  for (const [ox, oy] of [[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,1],[-1,1],[1,-1]])
    R.text(x + ox, y + oy, word, '#3a1010', s, 'left');
  R.text(x, y, word, col || '#ffd23e', s);
  R.text(x, y - 1, word, highlightCol || '#fff2b0', s);
}

// slide-in card banner (curated mid-screen element with solid background)
function drawCard(text, tIn, hold, borderCol) {
  const slide = easeOut(Math.min(1, tIn / 0.25));
  const x = 70 - 410 * (1 - slide);
  R.rect(x, 88, 340, 30, '#20203A');
  R.rect(x, 88, 340, 2, borderCol || '#ffd23e');
  R.rect(x, 116, 340, 2, borderCol || '#ffd23e');
  R.text(x + 170, 97, text, '#FFF3D1', 2, 'center');
}

// ============================================================================
// CHARACTERS ON COURT (with idle drift: feet planted, slow horizontal only)
// ============================================================================
function drawDuelists(G, oP, oH, optsP, optsH) {
  const enc = G.enc;
  const t = G.time;
  const driftP = ART ? Math.round(Math.sin(t * 1.05) * 3) : 0;
  const driftH = ART ? Math.round(Math.sin(t * 1.05 + Math.PI) * 3) : 0;
  const cP = CHARS[G.round] || CHARS[0];
  const exprP = oP || 'idle';
  const exprH = oH || 'idle';
  if (!ART) {
    // phase-1 placeholders: plain blocks
    R.rect(PHARM_X + driftP - 12, FEET_Y - 62, 24, 24, '#e8b58c');
    R.rect(PHARM_X + driftP - 10, FEET_Y - 38, 20, 38, '#f2f4f8');
    R.rect(PAT_X + driftH - 12, FEET_Y - 62, 24, 24, cP.palette.coat);
    R.rect(PAT_X + driftH - 10, FEET_Y - 38, 20, 38, cP.palette.coatDark);
    return;
  }
  chibi(PHARM_X + driftP, FEET_Y, PHARM, 1, G, exprH, Object.assign({ s: 1.3, fire: !!(enc && enc.fire) }, optsH));
  chibi(PAT_X + driftH, FEET_Y, cP, -1, G, exprP, Object.assign({ s: 1.3 }, optsP));
  // ball in pharmacist's hand (held still — no dribble)
  ball(PHARM_X + driftP + 21, FEET_Y - 25, !!(enc && enc.fire));
}

// ============================================================================
// CUTAWAYS (slow-mo, skippable) — run inside ST.CUTAWAY
// ============================================================================
function drawCutaway(G) {
  const cw = G.cutaway;
  if (!cw) return;
  const p = cw.t / cw.dur;
  const enc = G.enc;
  const cP = CHARS[G.round];
  const t = G.time;
  const driftP = Math.round(Math.sin(t * 1.05) * 3);
  const driftH = Math.round(Math.sin(t * 1.05 + Math.PI) * 3);

  if (cw.kind === 'swat') {
    drawArena(G);
    const impact = p > 0.30;
    if (p > 0.18 && p < 0.62) speedLines(240, 105, 14, 90, 235, '#ffffff55', 3);
    // pharmacist with extended arm (on left)
    chibi(PHARM_X + driftP, FEET_Y, PHARM, 1, G, impact ? 'joy' : 'det', { s: 1.3, fire: enc.fire });
    // patient (on right)
    chibi(PAT_X + driftH, FEET_Y, cP, -1, G, impact ? 'shock' : 'talk', { s: 1.3 });
    // objection card
    let cardX = 286, cardY = 118, cardAlive = true;
    if (p >= 0.10 && p < 0.30) { cardX = 286 + Math.sin(p * 40) * 1; }
    else if (p >= 0.30) {
      cardX = 286 + (p - 0.30) * 560;
      if (cardX > 520) cardAlive = false;
    }
    if (cardAlive && p >= 0.05) {
      if (p > 0.36 && p < 0.55) {
        R.rect(cardX - 22, cardY + 2, 26, 18, '#ffffff22');
        R.rect(cardX - 40, cardY + 4, 26, 18, '#ffffff14');
      }
      R.rect(cardX, cardY, 26, 18, '#f2ead8');
      R.rect(cardX, cardY, 26, 1, '#b8a888');
      R.text(cardX + 10, cardY + 6, '!', '#333333');
      R.rect(cardX, cardY, 2, 18, '#ff8f6a');
    }
    // swatting hand/arm from left to right
    if (p >= 0.12 && p < 0.42) {
      const hx = lerp(88, 282, Math.min(1, (p - 0.12) / 0.18));
      R.rect(hx - 14, FEET_Y - 30, 14, 6, '#e4e8ef');
      R.rect(hx, FEET_Y - 33, 7, 9, PHARM.palette.skin);
      if (impact && p < 0.36) {
        R.line(hx + 6, FEET_Y - 38, hx + 20, FEET_Y - 46, '#ffffff', 2);
        R.line(hx + 8, FEET_Y - 28, hx + 22, FEET_Y - 24, '#ffffff', 2);
      }
    }
  } else if (cw.kind === 'halfparry') {
    drawArena(G);
    // Both characters look uncomfortable
    chibi(PHARM_X + driftP, FEET_Y, PHARM, 1, G, 'sweat', { s: 1.3 });
    chibi(PAT_X + driftH, FEET_Y, cP, -1, G, p > 0.4 ? 'idle' : 'talk', { s: 1.3 });
    // Objection card wobbles but doesn't get swatted
    if (p < 0.6) {
      const wobble = Math.sin(p * 30) * 3;
      const cardX = 220 + wobble;
      R.rect(cardX, 118, 26, 18, '#f2ead8');
      R.text(cardX + 4, 124, '?', '#333333');
    }
    // Crowd slumps
    // (crowd already drawn by drawArena)
  } else if (cw.kind === 'airball') {
    drawArena(G);
    chibi(PHARM_X + driftP, FEET_Y, PHARM, 1, G, p > 0.5 ? 'sweat' : 'det', { s: 1.3, fire: false, dropOff: p > 0.5 ? 4 : 0 });
    chibi(PAT_X + driftH, FEET_Y, cP, -1, G, p > 0.5 ? 'joy' : 'idle', { s: 1.3 });
    const T1 = 1.6, T2 = 2.15, T3 = 2.7;
    let bx, by;
    if (cw.t < T1) {
      const q = cw.t / T1;
      bx = lerp(166, 436, q);
      by = lerp(150, 56, q) - Math.sin(Math.PI * q) * 45;
    } else if (cw.t < T2) {
      const q = (cw.t - T1) / (T2 - T1);
      bx = lerp(436, 310, q);
      by = lerp(56, 172, q) - Math.sin(Math.PI * q) * 18;
    } else if (cw.t < T3) {
      const q = (cw.t - T2) / (T3 - T2);
      bx = lerp(310, 252, q);
      by = lerp(172, 174, q) - Math.sin(Math.PI * q) * 7;
    } else {
      const q = (cw.t - T3) / (cw.dur - T3);
      bx = lerp(252, 210, q);
      by = 175;
    }
    if (cw.t < T1 + 0.3) speedLines(440, 90, 8, 60, 160, '#ffffff33', 7);
    ball(bx | 0, by | 0, false);
    // net dangle
    R.line(433, 56, 441, 68, '#dfe6f0', 1);
  } else {
    // layup / dunk / three
    drawArena(G);
    const dunk = cw.kind === 'dunk';
    const three = cw.kind === 'three';
    const TSHOT = three ? 2.0 : 1.9;
    let hopY = 0, hopX = 0;
    if (dunk) {
      if (cw.t < 1.4) { const q = cw.t / 1.4; hopY = -34 * Math.sin(Math.PI * q); hopX = 45 * Math.sin(Math.PI * q); }
      else if (cw.t < 1.8) hopY = 2;
    }
    const made = cw.res.made;
    chibi(PAT_X + driftH, FEET_Y, cP, -1, G, (made && cw.t > TSHOT + 0.3) ? 'joy' : (dunk && cw.t > 1.4 ? 'shock' : 'idle'), { s: 1.3 });
    chibi(PHARM_X + driftP + (dunk ? hopX : 0), FEET_Y + (dunk ? hopY : 0), PHARM, 1, G, made ? 'joy' : 'idle', { s: 1.3, fire: false });
    if (dunk && cw.t < 1.4) {
      // ball overhead in hand
      const hy = FEET_Y + hopY;
      ball(PHARM_X + driftP + hopX + 14, hy - 76, false);
    }
    // ball flight
    const T1 = TSHOT;
    if (cw.t <= T1 || (made && cw.t <= T1 + 0.5) || (!made && cw.t <= T1 + 0.2)) {
      let bx, by;
      if (cw.t <= T1) {
        let q = cw.t / T1;
        if (three) q = q * q * (3 - 2 * q); // hang at the arc
        const arc = three ? 60 : 35;
        bx = lerp(166, dunk ? 438 : RIM.x, q);
        by = lerp(dunk ? FEET_Y - 76 + hopY : 150, RIM.y, q) - Math.sin(Math.PI * q) * (dunk ? 6 : arc);
      } else if (dunk) {
        const q = (cw.t - T1) / 0.15;
        bx = lerp(438, RIM.x, Math.min(1, q));
        by = lerp(RIM.y - 6, RIM.y + 3, Math.min(1, q));
      } else if (made) {
        const q = (cw.t - T1) / 0.4;
        bx = RIM.x;
        by = lerp(RIM.y, RIM.y + 9, Math.min(1, q));
      } else {
        const q = (cw.t - T1) / 0.2;
        bx = lerp(RIM.x - 4, RIM.x - 14, q);
        by = lerp(RIM.y, RIM.y - 4, q);
      }
      ball(bx | 0, by | 0, false);
    }
    // net reaction
    if (made && cw.t > T1) {
      const spread = cw.t < T1 + 0.4 ? 2 : 0;
      for (let i = 0; i < 5; i++) {
        const x0 = 433 + i * 4;
        R.line(x0, 56, 441 + (i - 2) * spread, 68 + (i - 2) * spread * 0.5, '#dfe6f0', 1);
      }
      if (dunk && cw.slammed && cw.t < 1.9) {
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          const d = (cw.t - 1.42) * 90;
          R.px(RIM.x + Math.round(Math.cos(a) * d), RIM.y + 4 + Math.round(Math.sin(a) * d * 0.6), i % 2 ? '#ffd23e' : '#f2f4f8');
        }
      }
    }
    if (made && !dunk) speedLines(441, 70, 6, 40, 120, '#ffffff2e', 5);
    if (made && dunk) speedLines(441, 70, 10, 50, 170, '#ffffff55', 9);
  }
}

// portrait cut-in (ST.CUTIN)
function drawCutin(G) {
  drawArena(G);
  const enc = G.enc;
  const cP = CHARS[G.round];
  const t = G.stT;
  const driftP = Math.round(Math.sin(G.time * 1.05) * 3);
  chibi(PAT_X + driftP, FEET_Y, cP, -1, G, 'idle', { s: 1.3 });
  R.rect(0, 0, 480, STAGE_H, '#00000066');
  speedLines(240, 105, 18, 95, 250, '#ffffff4d', 11);
  // diagonal hard bands
  for (let i = 0; i < 4; i++) R.line(0, 40 + i * 34, 480, 12 + i * 34, '#ffffff22', 2);
  // sliding head from the left
  const slide = easeOut(Math.min(1, t / 0.22));
  const hx = lerp(-80, 130, slide);
  chibiHead(hx, 102, PHARM, 1, 'det', 2.4);
  // name strip under head (panel keeps the attack-name card; this is pure art)
}

// ============================================================================
// PANEL — the ONLY text surface
// ============================================================================
const RX0 = 128, RW = 346; // right cell

function flame(x, y, lit) {
  if (lit) {
    R.rect(x + 1, y, 4, 3, '#ff7a1a');
    R.rect(x + 1, y + 3, 5, 4, '#ffd23e');
    R.rect(x + 2, y + 7, 3, 2, '#ffef9e');
    R.rect(x, y + 2, 1, 5, '#ff7a1a');
    R.rect(x + 5, y + 2, 1, 5, '#ff7a1a');
  } else {
    R.rect(x + 1, y, 5, 9, '#2a3352');
  }
}

function capsulePip(x, y, filled) {
  if (filled) {
    R.rect(x, y, 8, 7, '#ff5d8f');
    R.rect(x + 8, y, 8, 7, '#f2f4f8');
    R.rect(x, y, 16, 1, '#ffffff55');
  } else {
    R.rect(x, y, 16, 7, '#2A2040');
  }
  R.rect(x, y, 16, 1, '#3A3060');
  R.rect(x, y + 6, 16, 1, '#3A3060');
}

function panelLeft(G) {
  const enc = G.enc;
  // TRUST
  R.text(8, 192, 'TRUST', '#8EC8FF');
  R.text(48, 192, '♥', '#ff5d8f');
  R.rect(8, 202, 92, 8, '#2A2040');
  const tw = enc ? Math.round(92 * Math.min(1, enc.trust / 100)) : 0;
  if (tw > 0) R.rect(8, 202, tw, 8, '#ff5d8f');
  for (let i = 1; i < 4; i++) R.rect(8 + i * 23, 202, 1, 8, '#1A1535');
  R.rect(7, 201, 94, 10, '#3A3060');
  if (enc) R.text(112, 202, String(Math.round(enc.trust)), '#e8ecf2', 1, 'right');
  // HEAT
  R.text(8, 216, 'HEAT', '#8EC8FF');
  for (let i = 0; i < 3; i++) flame(48 + i * 13, 214, enc && enc.heat > i);
  // GOALS
  R.text(8, 230, 'GOALS', '#8EC8FF');
  const need = enc ? enc.need : 3;
  for (let i = 0; i < need; i++) capsulePip(46 + i * 19, 230, enc && enc.goals > i);
  // DOUBT
  R.text(8, 246, 'DOUBT', '#8EC8FF');
  for (let i = 0; i < 21; i++) {
    R.rect(40 + i * 4, 244, 3, 7, enc && enc.doubt > i ? '#ff4040' : '#2A2040');
  }
}

function menuRow(i, txt, armed, keyGold) {
  const y = 204 + i * 12;
  if (armed) R.rect(RX0 - 2, y - 1, RW + 4, 10, '#3A2860');
  const key = txt[0];
  R.text(RX0, y, key, keyGold ? '#ffd23e' : '#8EC8FF');
  R.text(RX0 + 6, y, txt.slice(1), armed ? '#ffd23e' : '#FFF3D1');
}

function panelRight(G) {
  const enc = G.enc;
  const blink = (G.time % 1) < 0.55;
  const st = G.st;
  const H = (txt, col) => R.text(RX0, 192, txt, col || '#ffd23e');
  const B = (txt, col, lines) => {
    const ls = wrapText(txt, RW - 6, 1, lines || 2);
    for (let i = 0; i < ls.length; i++) R.text(RX0, 204 + i * 10, ls[i], col || '#FFF3D1');
  };

  if (G.paused) {
    H('PAUSED', '#8EC8FF');
    B('P TO RESUME  -  M MUSIC  -  V VOICE', '#8EC8FF', 1);
    return;
  }
  if (G.mode !== 'battle') return; // non-battle screens draw their own

  const cP = CHARS[G.round];
  switch (st) {
    case ST.INTRO:
      H('ROUND ' + (G.round + 1) + ' - ' + cP.name);
      B(cP.intro, '#FFF3D1');
      break;
    case ST.OBJCARD:
      H(cP.name + ' OBJECTS', '#ff8f6a');
      B(cP.tagline, '#9A90B0');
      break;
    case ST.OBJTYPE: {
      H(cP.name + ' - OBJECTION', '#ff8f6a');
      const n = G.typing ? G.typing.n : 0;
      const text = (G.obj && G.obj.text) || '';
      const shown = text.slice(0, n);
      const ls = wrapText(shown, RW - 6, 1, 2);
      for (let i = 0; i < ls.length; i++) R.text(RX0, 204 + i * 10, ls[i], '#FFF3D1');
      if (n < text.length) {
        const last = ls[ls.length - 1] || '';
        const cx = RX0 + textW(last, 1);
        if (blink) R.rect(cx + 2, 204 + (ls.length - 1) * 10, 4, 7, '#ffd23e');
      }
      break;
    }
    case ST.YOUCARD:
      H('YOUR MOVE', '#ffd23e');
      B(cP.tagline, '#9A90B0');
      break;
    case ST.FORCEDCARD:
      H('THE CLOCK IS DEAD!', '#ff4040');
      B(COPY.forcedBody, '#FFF3D1');
      break;
    case ST.CHOICE:
    case ST.ARM: {
      const armed = G.arm;
      if (G.menuKind === 'counter') {
        for (let i = 0; i < 4; i++) {
          const y = 196 + i * 18;
          const isArm = (st === ST.ARM && armed && armed.kind === 'response' && G.chosenResponse === (i < 3 ? G.obj?.responses?.[i] : null)) || (G.selectedChoice === i) || (G.cursor === i);
          if (isArm) {
            R.rect(126, y - 1, 350, 18, '#3A2860');
          }
          // Key number (1-4) at x=128 in accent color
          R.text(128, y, String(i + 1), '#ffd23e');

          // Dialogue text at x=140
          if (i < 3) {
            const resp = G.obj && G.obj.responses && G.obj.responses[i];
            if (resp) {
              const lines = wrapText(resp.text, 330, 1, 2);
              for (let l = 0; l < lines.length; l++) {
                R.text(140, y + l * 8, lines[l], isArm ? '#fff' : '#ccc');
              }
            }
          } else {
            R.text(140, y, 'MAKE THE RECOMMENDATION', isArm ? '#ffd23e' : '#aaa');
          }
        }
      } else if (G.menuKind === 'shot') {
        const odds = id => Math.round(L.pitchOdds(enc, id, () => 0) * 100);
        const rows = [
          '1 ' + SHOTS.LAYUP.name + '  +1 GOAL  (' + odds('LAYUP') + '%)',
          '2 ' + SHOTS.DUNK.name + '   +2 GOALS (' + odds('DUNK') + '%)',
          '3 ' + SHOTS.THREE.name + '  +3 GOALS (' + odds('THREE') + '%)',
        ];
        for (let i = 0; i < 3; i++) {
          const isArm = st === ST.ARM && armed && armed.kind === 'pitch' && SHOT_IDS[i] === armed.id;
          menuRow(i, rows[i], isArm, true);
        }
        if (enc.clock > 0) menuRow(3, '4 PICK A COUNTER - TAKE THE TIME', false, false);
        else menuRow(3, 'CLOCK DEAD - PITCH OR BUST', true, false);
      }
      if (st === ST.ARM && armed) {
        R.rect(RX0, 254, RW, 4, '#2A2040');
        R.rect(RX0, 254, Math.round(RW * Math.min(1, armed.t / T.ARM)), 4, '#ffd23e');
        R.text(RX0, 262, 'ARMING - PRESS ANOTHER KEY TO TAKE BACK', '#9A90B0');
      }
      break;
    }
    case 13: { // ST.EVALUATE
      const ev = G.evalResult || 'adequate';
      const col = ev === 'good' ? '#7ddc8a' : (ev === 'bad' ? '#ff8f6a' : '#FFD93D');
      H(ev === 'good' ? 'EXCELLENT READ' : (ev === 'bad' ? 'MISREAD' : 'STEADY PASS'), col);
      const chosenText = (G.chosenResponse && G.chosenResponse.text)
        || (G.cutin && G.cutin.res && G.cutin.res.text)
        || (G.arm && G.arm.responseObj && G.arm.responseObj.text)
        || (G.arm && G.arm.text)
        || '';
      if (chosenText) B(chosenText, '#FFF3D1');
      break;
    }
    case ST.CUTIN: {
      const ci = G.cutin;
      H(ci.name, '#ffd23e');
      const sub = ci.res.kind === 'response' ? (ci.res.technique || 'THE COUNTER') : SHOTS[ci.res.shot.id].sub;
      B(sub + ' ...', '#FFF3D1', 1);
      break;
    }
    case ST.CUTAWAY: {
      const names = {
        swat: 'THE COUNTER',
        halfparry: 'THE TURNOVER',
        layup: 'THE LAYUP',
        dunk: 'THE DUNK',
        three: 'THE THREE',
        airball: 'AIRBALL ...',
      };
      let swatText = (G.cutaway && G.cutaway.res && (G.cutaway.res.text || (G.cutaway.res.response && G.cutaway.res.response.text)))
        || G.chosenText
        || 'THE OBJECTION FLIES. THE PARQUET WATCHES.';
      const flavor = {
        swat: swatText,
        halfparry: 'MOMENTUM LOST. THE PARQUET WINCES.',
        layup: 'SOFT. SURE. IT ROLLS.',
        dunk: 'MAXIMUM DRAMA. THE NET IS CRYING (HAPPILY).',
        three: 'HANG TIME, FOR CREDIBILITY.',
        airball: 'THE RIM, RESPECTFULLY, DECLINES.',
      };
      const isBad = (G.cutaway.kind === 'airball' || G.cutaway.kind === 'halfparry');
      H(names[G.cutaway.kind] || '', isBad ? '#ff8f6a' : '#ffd23e');
      B(flavor[G.cutaway.kind] || '', '#FFF3D1');
      if (G.stT > 0.3) R.text(474, 254, '»', '#ffd23e', 1, 'right');
      break;
    }
    case ST.FIRE:
      H("HE'S ON FIRE!", '#ff7a1a');
      B(G.fireLine || COPY.heatLines[0], '#FFF3D1');
      break;
    case ST.RESULT: {
      const r = G.result;
      if (!r) break;

      // Check if shot result
      if (r.title && (r.title.includes('GOOD') || r.title === 'AIRBALL')) {
        H(r.title, r.title === 'AIRBALL' ? '#ff8f6a' : '#ffd23e');
        B(r.line, '#FFF3D1');
        if (blink) R.text(474, 254, '»', '#ffd23e', 1, 'right');
        break;
      }

      // 3-tier quality result
      let quality = r.quality || r.result || G.evalResult;
      if (!quality) {
        if (r.title === 'GREAT READ!' || r.title === 'CLEAN COUNTER') quality = 'good';
        else if (r.title === 'ACCEPTABLE') quality = 'adequate';
        else if (r.title === 'TURNOVER!' || r.title === 'HALF-PARRY') quality = 'bad';
        else quality = 'good';
      }

      let title = 'GREAT READ!';
      let titleCol = '#7ddc8a';
      let subtitle = 'ACKNOWLEDGE';
      let defaultFeedback = '';

      if (quality === 'good') {
        title = 'GREAT READ!';
        titleCol = '#7ddc8a';
        const tech = r.tech || (r.response && r.response.tech) || G.chosenTech || r.subtitle || 'ACKNOWLEDGE';
        subtitle = String(tech).toUpperCase();
        if (!r.feedback) {
          r.feedback = (COPY.cleanReadLines && COPY.cleanReadLines.length)
            ? COPY.cleanReadLines[(G.round || 0) % COPY.cleanReadLines.length]
            : 'GOOD READ. YOU MATCHED THE CONCERN.';
        }
        defaultFeedback = r.feedback;
      } else if (quality === 'adequate') {
        title = 'ACCEPTABLE';
        titleCol = '#FFD93D';
        subtitle = 'SAFE PASS';
        defaultFeedback = 'A STRONGER OPENING WOULD HAVE BUILT MORE TRUST.';
      } else {
        title = 'TURNOVER!';
        titleCol = '#ff8f6a';
        subtitle = 'FUMBLED';
        if (!r.feedback) {
          r.feedback = (COPY.mismatchHintLines && COPY.mismatchHintLines.length)
            ? COPY.mismatchHintLines[(G.round || 0) % COPY.mismatchHintLines.length]
            : 'WRONG APPROACH. READ THE CONCERN AGAIN.';
        }
        defaultFeedback = r.feedback;
      }

      // Result banner title + subtitle at y=192
      R.text(RX0, 192, title, titleCol);
      R.text(RX0 + textW(title, 1) + 8, 192, subtitle, '#FFF3D1');

      // Flavor line at y=206
      if (r.line) {
        const lineLs = wrapText(r.line, RW - 6, 1, 2);
        for (let i = 0; i < lineLs.length; i++) R.text(RX0, 206 + i * 10, lineLs[i], '#FFF3D1');
      }

      // Educational feedback at y=230
      const fb = r.feedback || defaultFeedback;
      if (fb) {
        const fbLs = wrapText(fb, RW - 6, 1, 2);
        for (let i = 0; i < fbLs.length; i++) R.text(RX0, 230 + i * 10, fbLs[i], titleCol);
      }

      if (blink) R.text(474, 254, '»', '#ffd23e', 1, 'right');
      break;
    }
    case ST.ENDWIN: {
      H('CASE CLOSED!', '#7ddc8a');
      B(cP.win, '#FFF3D1');
      R.text(RX0, 240, 'EX ' + G.encStats.ex + ' - HEAT ' + G.encStats.maxHeat + '/3 - CLEAN ' + G.encStats.clean, '#9A90B0');
      if (blink && G.stT >= T.END_LOCK) R.text(474, 254, '»', '#ffd23e', 1, 'right');
      break;
    }
    case ST.ENDLOSE: {
      H('PATIENT WALKS', '#ff4040');
      B(cP.lose, '#FFF3D1');
      if (G.stT >= T.END_LOCK) {
        menuRow(2, '1 CONTINUE - RETRY THIS DESK', false, true);
        menuRow(3, '2 GIVE UP - CLOSE THE BOOK', false, false);
      }
      break;
    }
  }
}

function drawPanel(G) {
  R.rect(0, PANEL_Y, 480, 270 - PANEL_Y, '#1A1535');
  R.rect(0, PANEL_Y, 480, 3, '#20203A');
  R.rect(123, PANEL_Y + 3, 1, 270 - PANEL_Y - 3, '#2A2040');
  panelLeft(G);
  panelRight(G);
}

// ============================================================================
// NON-BATTLE SCREENS
// ============================================================================
function drawTitle(G) {
  drawArena(G);
  drawScoreboard(G);
  drawMascot(G);
  const t = G.time;
  const d = (i) => Math.round(Math.sin(t * 1.05 + i * 1.7) * 3);
  chibi(110, FEET_Y, PHARM, 1, G, 'idle', { fire: false });
  ball(126, FEET_Y - 19, false);
  for (let i = 0; i < 4; i++) chibi(270 + i * 40, FEET_Y, CHARS[i], -1, G, 'idle', { s: 0.8 });
  R.text(240, 34, 'SHOT CLOCK', '#FFF3D1', 3, 'center');
  R.text(240, 66, 'PHARMACY EDITION', '#ffd23e', 1, 'center');
  // panel
  R.rect(0, PANEL_Y, 480, 84, '#1A1535');
  R.rect(0, PANEL_Y, 480, 3, '#20203A');
  const blink = (t % 1) < 0.55;
  R.text(240, 200, blink ? TITLE_BLINK : '', '#ffd23e', 1, 'center');
  R.text(240, 218, TITLE_LINE, '#9A90B0', 1, 'center');
  R.text(240, 236, '1-ON-1 COUNSELING DUELS - 4 BOUTS - 1 CHAMPION', '#66739a', 1, 'center');
  R.text(240, 252, 'V1.0 - TIME STOPS WHILE YOU THINK', '#66739a', 1, 'center');
}

function drawLadder(G) {
  drawArena(G);
  drawScoreboard(G);
  const t = G.time;
  const next = G.cleared ? G.cleared.findIndex(c => !c) : 0;
  for (let i = 0; i < 4; i++) {
    const d = Math.round(Math.sin(t * 1.05 + i * 1.7) * 3);
    if (i === next) {
      for (let a = 0; a < 32; a++) {
        const ang = a / 32 * Math.PI * 2;
        R.px(90 + i * 100 + d + Math.round(Math.cos(ang) * 26), FEET_Y + 2 + Math.round(Math.sin(ang) * 4), '#ffd23e');
      }
    }
    chibi(90 + i * 100 + d, FEET_Y, CHARS[i], 1, G, G.cleared[i] ? 'joy' : 'idle');
  }
  R.rect(0, PANEL_Y, 480, 84, '#1A1535');
  R.rect(0, PANEL_Y, 480, 3, '#20203A');
  R.text(RX0, 192, 'TONIGHT\'S APPOINTMENT BOOK', '#ffd23e');
  const blink = (t % 1) < 0.55;
  for (let i = 0; i < 4; i++) {
    const status = G.cleared[i] ? 'DONE' : (i === next ? 'UP NEXT' : 'QUEUED');
    const label = (i + 1) + ' ' + CHARS[i].name;
    const dots = Math.max(2, 52 - label.length - status.length);
    const col = G.cleared[i] ? '#7ddc8a' : (i === next ? '#ffd23e' : '#66739a');
    R.text(RX0, 204 + i * 12, label + '.'.repeat(dots) + ' ' + status, i === next && blink ? '#fff2b0' : col);
  }
  if (blink) R.text(RX0, 258, '[ENTER] FACE UP NEXT', '#9A90B0');
}

function drawChampion(G) {
  drawArena(G);
  drawScoreboard(G);
  const t = G.time;
  // confetti (calm, sparse)
  for (let i = 0; i < 20; i++) {
    const x = (i * 61 + t * (8 + (i % 5) * 3)) % 480;
    const y = (i * 97 + t * (14 + (i % 3) * 6)) % 180;
    const cols = ['#ffd23e', '#ff5d8f', '#66ccff', '#7ddc8a'];
    R.rect(x | 0, y | 0, 2, 2, cols[i % 4]);
  }
  // trophy: gold cup + capsule
  const tx = 240, ty = 118;
  R.rect(tx - 14, ty + 14, 28, 6, '#c9972e');
  R.rect(tx - 10, ty + 20, 20, 4, '#e8b23e');
  R.rect(tx - 12, ty - 12, 24, 26, '#e8b23e');
  R.rect(tx - 16, ty - 8, 4, 12, '#e8b23e');
  R.rect(tx + 12, ty - 8, 4, 12, '#e8b23e');
  R.rect(tx - 8, ty - 24, 6, 14, '#ff5d8f');
  R.rect(tx - 2, ty - 24, 6, 14, '#f2f4f8');
  R.text(tx, ty - 34, '*', '#ffd23e', 2, 'center');
  // Pharmacist on the left celebrating!
  chibi(140, FEET_Y, PHARM, 1, G, 'joy', { s: 1.3, fire: true });
  ball(161, FEET_Y - 25, true);
  for (let i = 0; i < 4; i++) chibi(310 + i * 35, FEET_Y, CHARS[i], -1, G, 'joy', { s: 0.8 });
  R.text(240, 30, 'PHARMACY CHAMPION', '#ffd23e', 2, 'center');
  R.rect(0, PANEL_Y, 480, 84, '#1A1535');
  R.rect(0, PANEL_Y, 480, 3, '#20203A');
  R.text(RX0, 192, 'ALL FOUR CONVINCED', '#7ddc8a');
  B_body('THE COUPON MACHINE WEEPS WITH PRIDE. BOW DOWN.');
  R.text(RX0, 232, 'EX ' + G.runStats.exchanges + ' - CLEAN ' + G.runStats.clean + ' - AIR ' + G.runStats.air + ' - CONT ' + G.continues, '#9A90B0');
  if ((t % 1) < 0.55) R.text(RX0, 254, '[1] PLAY AGAIN', '#ffd23e');
}
function B_body(txt) {
  const ls = wrapText(txt, RW - 6, 1, 1);
  R.text(RX0, 210, ls[0], '#FFF3D1');
}

function drawGameOver(G) {
  drawArena(G);
  drawScoreboard(G);
  const t = G.time;
  R.rect(0, 0, 480, STAGE_H, '#00000059');
  chibi(PHARM_X, FEET_Y, PHARM, 1, G, 'sweat', { s: 1.3 });
  for (let i = 0; i < 4; i++) {
    const wx = 240 + i * 65 + Math.min(60, t * 8);
    if (wx < 470) chibi(wx, FEET_Y, CHARS[i], 1, G, 'idle');
  }
  R.text(240, 40, 'THAT\'S THE SHUFFLE', '#FFF3D1', 2, 'center');
  R.rect(0, PANEL_Y, 480, 84, '#1A1535');
  R.rect(0, PANEL_Y, 480, 3, '#20203A');
  R.text(RX0, 192, 'BOOK CLOSED', '#ff8f6a');
  B_body('THE PATIENTS WHISPER. THE BALL SLEEPS.');
  if ((t % 1) < 0.55) R.text(RX0, 254, '[ENTER] TITLE', '#ffd23e');
}

function drawDebrief(G) {
  G = G || (typeof globalThis !== 'undefined' ? globalThis.G : null);
  // Sky blue background (same as arena wall)
  R.rect(0, 0, 480, 270, '#6BB8E0');
  for (let x = 30; x < 480; x += 60) R.rect(x, 0, 1, 270, '#5AA8D0');

  // Centered panel (60px from left, 360px wide)
  R.rect(60, 10, 360, 250, '#1A1535');
  R.rect(60, 10, 360, 2, '#20203A');
  R.rect(60, 258, 360, 2, '#20203A');
  R.rect(60, 10, 2, 250, '#20203A');
  R.rect(418, 10, 2, 250, '#20203A');

  // Title at y=20, scale=2, gold (#FFD93D)
  R.text(240, 20, "MANAGER'S REVIEW", '#FFD93D', 2, 'center');
  R.line(80, 42, 400, 42, '#3A2860', 1);

  // Grade rows at y=50-90, white text with grade letter in color
  const defaultCats = [
    'LISTENING & ACKNOWLEDGING',
    'ADDRESSING CONCERNS',
    'MAKING THE RECOMMENDATION',
  ];
  const catKeys = ['listen', 'address', 'recommend'];
  const dData = (G && G.debriefData) || {};
  const grades = dData.grades || ['A', 'B', 'A'];
  for (let i = 0; i < 3; i++) {
    const y = 52 + i * 14;
    let label = defaultCats[i];
    let grade = 'A';
    if (Array.isArray(grades)) {
      if (typeof grades[i] === 'string') {
        grade = grades[i];
      } else if (grades.length > 0 && typeof grades[0] === 'object') {
        const key = catKeys[i];
        const gList = grades.map(g => (g && (g[key] || g[key + 'ing'] || g.grade)) || 'B').filter(Boolean);
        if (gList.length > 0) {
          const pts = { A: 4, B: 3, C: 2, F: 0 };
          let sum = 0;
          for (const g of gList) sum += (pts[String(g).toUpperCase()] != null ? pts[String(g).toUpperCase()] : 3);
          const avg = sum / gList.length;
          grade = avg >= 3.5 ? 'A' : (avg >= 2.5 ? 'B' : (avg >= 1.5 ? 'C' : 'F'));
        }
      }
    } else if (typeof grades === 'object') {
      const key = catKeys[i];
      grade = grades[key] || grades[defaultCats[i]] || 'A';
    }
    const gUp = String(grade).toUpperCase().trim();
    let gCol = '#FF5C5C'; // F default
    if (gUp.startsWith('A')) gCol = '#7ddc8a';
    else if (gUp.startsWith('B')) gCol = '#FFD93D';
    else if (gUp.startsWith('C')) gCol = '#ff8f6a';

    R.text(80, y, label, '#FFF3D1');
    R.text(390, y, gUp, gCol, 1, 'right');
  }

  // Stats at y=110
  const totalGood = dData.totalGood != null ? dData.totalGood : ((G && G.runStats && G.runStats.clean) || 0);
  const totalBad = dData.totalBad != null ? dData.totalBad : ((G && G.runStats && G.runStats.air) || 0);
  R.text(240, 110, 'GOOD READS: ' + totalGood + '   BAD READS: ' + totalBad, '#FFF3D1', 1, 'center');

  // Coaching tip at y=135, wrapped
  let tipText = dData.tip;
  if (!tipText) {
    if (typeof COPY !== 'undefined' && COPY.coachingTips) {
      if (totalBad > 3) tipText = COPY.coachingTips.highBad;
      else if (totalGood < 5) tipText = COPY.coachingTips.lowEmpathy;
      else tipText = COPY.coachingTips.goodShot;
    }
    if (!tipText) {
      if (totalBad === 0) {
        tipText = 'TIP: OUTSTANDING ACTIVE LISTENING.';
      } else if (totalGood >= totalBad * 2) {
        tipText = 'TIP: VALIDATE HESITATIONS FIRST.';
      } else {
        tipText = 'TIP: LISTEN TO DISARM SKEPTICISM.';
      }
    }
  }
  if (!tipText.startsWith('TIP:')) {
    tipText = 'TIP: ' + tipText;
  }
  const tipLines = wrapText(tipText, 320, 1, 2);
  for (let i = 0; i < tipLines.length; i++) {
    R.text(80, 135 + i * 10, tipLines[i], '#A098B8');
  }

  // Huddle question at y=170, wrapped, in cream
  R.text(80, 168, 'HUDDLE QUESTION:', '#FFD93D');
  if (G && !G.debriefHuddle) {
    if (dData.huddleQuestion) {
      G.debriefHuddle = dData.huddleQuestion;
    } else if (typeof COPY !== 'undefined' && COPY.huddleQuestions && COPY.huddleQuestions.length) {
      G.debriefHuddle = COPY.huddleQuestions[(Math.random() * COPY.huddleQuestions.length) | 0];
    } else {
      G.debriefHuddle = 'SAY YOUR ASK OUT LOUD. IS IT CLEAR?';
    }
  }
  const huddleText = (G && G.debriefHuddle) || dData.huddleQuestion || 'SAY YOUR ASK OUT LOUD. IS IT CLEAR?';
  const hLines = wrapText(huddleText, 320, 1, 3);
  for (let i = 0; i < hLines.length; i++) {
    R.text(80, 180 + i * 10, hLines[i], '#FFF3D1');
  }

  // 'ENTER TO CONTINUE' at y=250, blinking
  const blink = (G ? (G.time % 1) < 0.55 : true);
  if (blink) {
    R.text(240, 250, 'ENTER TO CONTINUE', '#FFD93D', 1, 'center');
  }

  R.blit();
}

// ============================================================================
// TOP-LEVEL DRAW
// ============================================================================
export function drawFrame(G) {
  R.init();
  R.clear('#1A1535');
  // screen shake: stage only, dunks only
  let shx = 0, shy = 0;
  if (G.shakeT > 0) {
    shx = ((G.time * 60 | 0) % 2 === 0 ? 1 : -1) * 2;
    shy = ((G.time * 47 | 0) % 2 === 0 ? 1 : -1) * 1;
  }

  if (G.mode === 'title') { drawTitle(G); R.blit(); return; }
  if (G.mode === 'ladder') { drawLadder(G); R.blit(); return; }
  if (G.mode === 'champion') { drawChampion(G); R.blit(); return; }
  if (G.mode === 'gameover') { drawGameOver(G); R.blit(); return; }
  if (G.mode === 'debrief') { drawDebrief(G); return; }

  // battle — stage drawn with shake offset (panel & scoreboard stay stable)
  R.ox = shx; R.oy = shy;
  switch (G.st) {
    case ST.INTRO:
      drawArena(G);
      drawDuelists(G, 'talk', 'det');
      break;
    case ST.OBJCARD:
      drawArena(G);
      drawDuelists(G, 'talk', 'idle');
      break;
    case ST.OBJTYPE:
      drawArena(G);
      drawDuelists(G, 'talk', 'idle');
      break;
    case ST.YOUCARD:
      drawArena(G);
      drawDuelists(G, 'idle', 'det');
      break;
    case ST.CHOICE:
    case ST.ARM:
      drawArena(G);
      drawDuelists(G, 'idle', G.enc.fire ? 'det' : 'idle');
      break;
    case 13: { // ST.EVALUATE
      drawArena(G);
      const ev = G.evalResult || 'adequate';
      let pExpr = 'idle';
      let nod = 0;
      if (ev === 'good') {
        pExpr = 'idle';
        nod = (G.stT >= 0.15 && G.stT <= 0.45) ? -1 : 0;
      } else if (ev === 'bad') {
        pExpr = 'talk';
      } else {
        pExpr = 'idle';
      }
      drawDuelists(G, pExpr, G.enc && G.enc.fire ? 'det' : 'idle', { headOff: nod });
      break;
    }
    case ST.CUTIN:
      drawCutin(G);
      break;
    case ST.CUTAWAY:
      drawCutaway(G);
      break;
    case ST.FIRE:
      drawArena(G);
      drawDuelists(G, 'joy', 'det');
      speedLines(PHARM_X, 100, 12, 60, 200, '#ff9a3a66', 13);
      break;
    case ST.RESULT: {
      drawArena(G);
      const r = G.result;
      const q = r ? (r.quality || r.result || (r.title === 'GREAT READ!' || r.title === 'CLEAN COUNTER' ? 'good' : (r.title === 'TURNOVER!' || r.title === 'HALF-PARRY' || r.title === 'AIRBALL' ? 'bad' : 'adequate'))) : null;
      if (q === 'good' || (r && r.title === 'WIN')) drawDuelists(G, 'joy', 'joy');
      else if (q === 'bad') drawDuelists(G, 'sweat', 'sweat');
      else drawDuelists(G, 'idle', 'idle');
      break;
    }
    case ST.ENDWIN:
      drawArena(G);
      drawDuelists(G, 'joy', 'joy');
      break;
    case ST.ENDLOSE:
      drawArena(G);
      drawDuelists(G, 'sweat', 'idle');
      break;
    case ST.FORCEDCARD:
      drawArena(G);
      drawDuelists(G, 'shock', 'det');
      break;
  }
  R.ox = 0; R.oy = 0;
  drawScoreboard(G); // stable (no shake)
  if (G.mode === 'battle') drawMascot(G);
  // turn cards
  if (G.st === ST.INTRO) drawCard('ROUND ' + (G.round + 1) + ' - ' + CHARS[G.round].name, G.stT, T.INTRO, '#7ddc8a');
  else if (G.st === ST.OBJCARD) drawCard('PATIENT OBJECTS!', G.stT, T.OBJCARD, '#ff8f6a');
  else if (G.st === ST.YOUCARD) drawCard('YOUR MOVE', G.stT, T.YOUCARD, '#ffd23e');
  else if (G.st === ST.FORCEDCARD) drawCard('THE CLOCK IS DEAD!', G.stT, T.FORCEDCARD, '#ff4040');
  // flash words (the only two mid-screen words in the game)
  if (G.flash) {
    flashWord(G.flash.word, G.flash.t, G.flash.dur);
  } else if (G.st === 13) {
    const ev = G.evalResult || 'adequate';
    if (ev === 'good') flashWord('NICE', G.stT, 0.8, '#7ddc8a', '#bdf4c5');
    else if (ev === 'bad') flashWord('OUCH', G.stT, 0.8, '#ff8f6a', '#ffb89e');
  }
  // pause dim
  if (G.paused) R.rect(0, 0, 480, STAGE_H, '#00000089');
  drawPanel(G);
  R.blit();
}

// debug hook (used by tooling)
if (typeof globalThis !== 'undefined') globalThis.__SHOTCLOCK_R = R;

function setArt(n) { ART = n; }

export { R, ART, setArt };

