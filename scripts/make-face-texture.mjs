// Reproducibly derives each patient's N64-sized textures and file photo from its
// committed source photo:
//   face (64x64)      the face, hairline to chin and cheek to cheek, with a little
//                     hair at each edge so it blends into the sides of the head
//   hair (32x32)      a patch of the same hair, for the rest of the head
//   portrait (JPEG)   the file photo on SELECT FILE and the dossier
// Every source is a photo-real, entirely fictional ID-style photo (provenance in
// docs/assets/patient-face-photo-provenance.md for Jordan and
// docs/assets/new-patient-faces-provenance.md for the other four). The crops sit
// inside the photo, clear of Jordan's white print border and every grey backdrop.
// The face and hair are downsampled and drawn through the N64 three-point filter,
// so they read soft, never crisp. Needs ImageMagick 7 (`magick`). Metadata and
// timestamps are stripped, so a re-run is byte-identical.
//   node scripts/make-face-texture.mjs [--patient jordan|sam|marcus|priya|walt|all]
//     [--source image] [--face WxH+X+Y] [--hair WxH+X+Y] [--portrait WxH+X+Y] [--only face,hair,portrait]
// With no --patient it derives Jordan's, exactly as it always has. The crop flags
// override one patient's defaults, so they need a single --patient.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "src/counter/assets");
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? fallback : argv[at + 1];
};
const PNG = ["-define", "png:exclude-chunks=date,time"];

// Kevin's pick for every file photo (2026-09-15): the low-res video still. Greyscale,
// 52px wide, posterized to 7 levels, upscaled soft, a touch darker and flatter, with
// grain seeded so every run matches. work/photo-looks/3-video-still.png was the render
// he chose from three. A patient may carry one knob, `shift`: a level shift in percent
// just before the posterize. The four new photos have clean, even backdrops that sat
// right on a posterize step, so they broke into camouflage blotches. The shift moves
// each backdrop to the middle of a step, and each was picked so the eyes and mouth
// read best. Jordan has none, so her recipe is exactly the one Kevin picked.
const videoStill = (shift) => ["-colorspace", "Gray", "-resize", "52x", ...(shift ? ["-evaluate", shift < 0 ? "subtract" : "add", `${Math.abs(shift)}%`] : []), "-posterize", "7", "-filter", "Triangle", "-resize", "320x400!", "-brightness-contrast", "-6x-10", "-seed", "1515", "-attenuate", "0.55", "+noise", "Gaussian"];
const JPEG = ["-quality", "80", "-sampling-factor", "4:2:0", "-interlace", "none"];

// Each patient's crops, in pixels of its 1024x1024 source. Every face crop puts the
// eyes, nose and mouth on the same rings of every head, and its width follows that
// patient's head (patient.js LOOKS), so the photo is never stretched. Jordan's runs
// from her hairline to her chin. The other four run on up over the crown (the look's
// `faceTop`), so their own hairlines and hair sit on the head where the photo shows
// them, with no line where a hair texture takes over. The file photo crops frame the
// head and shoulders at 4:5 with the eyes about 39% down, as Jordan's does.
//
// `grade` brings a clean, evenly lit studio photo to the exposure of Jordan's grainy
// ID photo, so the four faces sit in the store's light the way hers does: `modulate`
// (brightness, saturation, hue) and `level` (the white point) on the face and its hair
// patch, then `falloff`, the share of light the face loses towards its sides and its
// chin, painted into the 64px face the way her photo's own lighting rounds her face.
const PATIENT_CROPS = {
  jordan: {
    source: "src/counter/assets/patient-face-photo.png",
    files: { face: "patient-face-64.png", hair: "patient-hair-32.png", portrait: "patient-portrait.jpg" },
    // Tightened for the shaped head (2026-09-15, fourth pass): the face fills the front
    // of the head as the console's photo faces did, with only a sliver of hair each side.
    face: "300x388+362+230",
    // The lightest patch of curls holding no backdrop-grey and no pixel brighter than luma 0.5.
    hair: "96x96+256+376",
    // Head and shoulders at 4:5, clear of the white print border.
    portrait: "640x800+190+70",
  },
  sam: {
    source: "src/counter/assets/patients/sam-photo.png",
    face: "363x584+334+101",
    hair: "80x80+560+110",
    portrait: "812x1015+110+0",
    shift: -7,
    grade: { modulate: "96,106,100", level: "0%,96%", falloff: [0.2, 0.08] },
  },
  marcus: {
    source: "src/counter/assets/patients/marcus-photo.png",
    face: "416x637+307+87",
    hair: "64x64+432+86",
    portrait: "816x1020+107+2",
    shift: 10,
    grade: { modulate: "96,104,100", level: "0%,96%", falloff: [0.2, 0.08] },
  },
  priya: {
    source: "src/counter/assets/patients/priya-photo.png",
    face: "326x463+352+149",
    hair: "64x64+520+100",
    portrait: "652x815+189+57",
    shift: 8,
    grade: { modulate: "96,106,100", level: "0%,96%", falloff: [0.2, 0.08] },
  },
  walt: {
    source: "src/counter/assets/patients/walt-photo.png",
    face: "426x627+300+78",
    hair: "28x28+302+214",
    portrait: "816x1020+105+0",
    shift: 3,
    grade: { modulate: "96,94,100", level: "0%,96%", falloff: [0.2, 0.08] },
  },
};

// The four new patients' textures live beside their source photos.
const filesFor = (id) => PATIENT_CROPS[id].files ?? { face: `patients/${id}-face-64.png`, hair: `patients/${id}-hair-32.png`, portrait: `patients/${id}-portrait.jpg` };

const requested = flag("patient", "jordan");
const ids = requested === "all" ? Object.keys(PATIENT_CROPS) : [requested];
if (!ids.every((id) => PATIENT_CROPS[id])) {
  console.error(`make-face-texture: no patient "${requested}" (try ${Object.keys(PATIENT_CROPS).join(", ")} or all)`);
  process.exit(1);
}
const overrides = ["source", "face", "hair", "portrait"].filter((name) => argv.includes(`--${name}`));
if (overrides.length && ids.length > 1) {
  console.error(`make-face-texture: --${overrides[0]} overrides one patient's default, so name a single --patient`);
  process.exit(1);
}
// --only portrait (or face,hair) re-derives just those, leaving the others untouched.
const only = flag("only", "")?.split(",").filter(Boolean) ?? [];

try {
  execFileSync("magick", ["-version"], { stdio: "ignore" });
} catch {
  console.error("make-face-texture: ImageMagick 7 (`magick`) is required");
  process.exit(1);
}

for (const id of ids) {
  const crops = PATIENT_CROPS[id];
  const files = filesFor(id);
  const source = path.resolve(root, flag("source", crops.source));
  if (!fs.existsSync(source)) {
    console.error(`make-face-texture: no source image at ${source}`);
    process.exit(1);
  }
  const [width, height] = execFileSync("magick", ["identify", "-format", "%w %h", source], { encoding: "utf8" }).split(" ").map(Number);
  const TEXTURES = [
    { key: "face", size: "64x64", encode: PNG },
    { key: "hair", size: "32x32", encode: PNG },
    // A small JPEG, because the standalone edition inlines every asset: the 1024px
    // source must never ship.
    { key: "portrait", size: "320x400", treat: videoStill(crops.shift), encode: JPEG, maxBytes: 40 * 1024 },
  ];
  const { grade } = crops;
  const tone = grade ? ["-modulate", grade.modulate, "+level", grade.level] : [];
  const round = grade ? ["-fx", `u*(1-${grade.falloff[0]}*pow(abs(i/w-0.5)*2,2))*(1-${grade.falloff[1]}*pow(j/h,3))`] : [];
  for (const { key, size, treat = [], encode, maxBytes } of TEXTURES) {
    if (only.length && !only.includes(key)) continue;
    const crop = flag(key, crops[key]);
    const match = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(crop ?? "");
    if (!match) {
      console.error(`make-face-texture: crop "${crop}" is not WxH+X+Y`);
      process.exit(1);
    }
    const [w, h, x, y] = match.slice(1).map(Number);
    if (x + w > width || y + h > height) {
      console.error(`make-face-texture: crop ${crop} runs off the ${width}x${height} source`);
      process.exit(1);
    }
    const out = path.join(assets, files[key]);
    const before = key === "portrait" ? [] : tone;
    const after = key === "face" ? round : [];
    execFileSync("magick", [source, "-crop", crop, "+repage", ...before, "-filter", "Triangle", "-resize", `${size}!`, ...treat, ...after, "-strip", ...encode, out]);
    const bytes = fs.statSync(out).size;
    const sha = createHash("sha256").update(fs.readFileSync(out)).digest("hex").slice(0, 16);
    console.log(`make-face-texture: ${files[key]} <- ${path.relative(root, source)} crop ${crop} at ${size}, ${bytes} bytes, sha256 ${sha}`);
    if (maxBytes && bytes > maxBytes) {
      console.error(`make-face-texture: ${files[key]} is ${bytes} bytes, over its ${maxBytes}-byte budget`);
      process.exit(1);
    }
  }
}
