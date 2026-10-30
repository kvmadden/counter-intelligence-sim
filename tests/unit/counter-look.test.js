import { createHash } from "node:crypto";
import fs from "node:fs";
import { inflateSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Box3, Color, Texture, Vector3 } from "three";
import { patientPalette, patientPalettes } from "../../src/counter/theme.js";
import { LOOKS, buildPatient, lookFor, patientTriangles } from "../../src/counter/n64/patient.js";
import * as paint from "../../src/counter/n64/textures.js";
import { SIGNS } from "../../src/counter/n64/textures.js";
import { hasGlyph, textWidth } from "../../src/counter/n64/font.js";

const channel = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((at) => channel(Number.parseInt(hex.slice(at, at + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const texture = new Texture();
const jordan = () => buildPatient({ cloth: texture, face: texture, hair: texture });
const build = (id) => buildPatient({ cloth: texture, face: texture, hair: texture }, LOOKS[id]);
// Every vertex of a built mesh, in its own geometry's space.
const vertices = (mesh) => {
  const position = mesh.geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, i) => new Vector3().fromBufferAttribute(position, i));
};
const extent = (points, axis) => Math.max(...points.map((p) => p[axis])) - Math.min(...points.map((p) => p[axis]));

describe("the encounter's look, as Kevin ruled it (2026-09-15)", () => {
  it("builds Jordan N64-proper: shaped low-poly, not a box rig, inside the console's budget", () => {
    const { group } = jordan();
    const count = patientTriangles(group);
    expect(count, "Jordan's triangles").toBeGreaterThanOrEqual(300);
    expect(count, "Jordan's triangles").toBeLessThanOrEqual(800);
    // The photo sits on a faceted head, not one face of a cube...
    const face = group.getObjectByName("face");
    expect(face, "the face is its own mesh").toBeTruthy();
    expect(face.geometry.getAttribute("position").count / 3, "facets carrying the photo").toBeGreaterThan(12);
    // ...an elongated form that narrows to the chin, measured on the built mesh.
    const points = vertices(face);
    const widest = Math.max(...points.map((p) => Math.abs(p.x)));
    const bottom = Math.min(...points.map((p) => p.y));
    const chin = Math.max(...points.filter((p) => p.y < bottom + 0.005).map((p) => Math.abs(p.x)));
    expect(chin / widest, "chin against cheekbones").toBeLessThan(0.75);
    expect(extent(points, "y") / (2 * widest), "taller than it is wide").toBeGreaterThan(1.15);
  });

  it("tapers her limbs from shoulder to wrist, measured on the built mesh", () => {
    const left = vertices(jordan().group.getObjectByName("arms")).filter((p) => p.x < 0);
    const shoulder = left.filter((p) => p.y > 1.4);
    const reach = Math.max(...left.map((p) => p.z));
    const wrist = left.filter((p) => p.z > reach - 0.03);
    expect(shoulder.length && wrist.length, "found both ends of the arm").toBeTruthy();
    expect(extent(wrist, "y") / extent(shoulder, "x"), "wrist against shoulder").toBeLessThanOrEqual(0.7);
  });

  it("gives Jordan a slim, tall, fitted build in a dark top of her own, never black", () => {
    const torso = jordan().group.getObjectByName("torso");
    expect(torso, "the torso is named").toBeTruthy();
    const size = new Box3().setFromObject(torso).getSize(new Vector3());
    expect(size.x, "shoulder width").toBeLessThanOrEqual(0.4);
    expect(size.x / size.y, "width against height").toBeLessThanOrEqual(0.6);
    expect(luminance(patientPalette.top), "dark").toBeLessThan(0.06);
    expect(luminance(patientPalette.top), "but not black").toBeGreaterThan(0.015);
  });

  it("dresses the pharmacy in generic signage only: no chain's name, mark or store number", () => {
    const words = Object.keys(SIGNS);
    for (const word of ["PHARMACY", "PICK UP", "DROP OFF", "CONSULTATION"]) expect(words, word).toContain(word);
    for (const [word, { w, h, scale = 1 }] of Object.entries(SIGNS)) {
      // Letters and spaces only, so no store number can be painted.
      expect(word, "plain words").toMatch(/^[A-Z][A-Z &]*$/);
      expect([...word].every(hasGlyph), `${word} is paintable`).toBe(true);
      // An over-long word would wrap into its neighbour's cell in the atlas.
      expect(textWidth(word, scale), `${word} fits its cell`).toBeLessThanOrEqual(w - 2);
      expect(7 * scale, `${word} fits its cell`).toBeLessThanOrEqual(h - 2);
    }
  });
});

// The four patients Kevin added on 2026-09-15, each an N64-proper look of their own
// over Jordan's rig: build, clothes and hair from their own photo.
const NEW_PATIENTS = ["sam", "marcus", "priya", "walt"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Just enough PNG to read the 64px face textures back: 8-bit RGB or RGBA, no interlace.
const readPng = (file) => {
  const bytes = fs.readFileSync(file);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const [depth, type, interlace] = [bytes[24], bytes[25], bytes[28]];
  expect([depth, interlace], `${file} is 8-bit and not interlaced`).toEqual([8, 0]);
  expect([2, 6], `${file} is RGB or RGBA`).toContain(type);
  const channels = type === 6 ? 4 : 3;
  const chunks = [];
  for (let at = 8; at < bytes.length;) {
    const length = bytes.readUInt32BE(at);
    if (bytes.toString("ascii", at + 4, at + 8) === "IDAT") chunks.push(bytes.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x += 1) {
      const value = raw[y * (stride + 1) + 1 + x];
      const left = x >= channels ? out[y * stride + x - channels] : 0;
      const up = y ? out[(y - 1) * stride + x] : 0;
      const corner = y && x >= channels ? out[(y - 1) * stride + x - channels] : 0;
      const paeth = () => {
        const p = left + up - corner;
        const [pa, pb, pc] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
        return pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
      };
      const predictor = [0, left, up, (left + up) >> 1, paeth()][filter];
      out[y * stride + x] = (value + predictor) & 255;
    }
  }
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < width * height; i += 1) out.copy(pixels, i * 3, i * channels, i * channels + 3);
  return { width, height, pixels };
};
const faceCrop = (id) => {
  const script = fs.readFileSync(path.join(root, "scripts/make-face-texture.mjs"), "utf8");
  const start = script.indexOf(`\n  ${id}: {`);
  expect(start, `${id} has crops in make-face-texture.mjs`).toBeGreaterThan(-1);
  const block = script.slice(start, script.indexOf("\n  },", start));
  const [, w, h] = /face: "(\d+)x(\d+)\+\d+\+\d+"/.exec(block) ?? [];
  expect(w, `${id}'s own face crop`).toBeTruthy();
  return Number(w) / Number(h);
};
// A mesh's vertices carried into the patient's own space (the head's scale and place applied).
const worldVertices = (mesh) => {
  mesh.updateWorldMatrix(true, false);
  return vertices(mesh).map((point) => point.applyMatrix4(mesh.matrixWorld));
};

describe("the four new patients' looks (2026-09-16)", () => {
  it("gives every patient a look of their own, and Jordan's to anyone without one", () => {
    expect(Object.keys(LOOKS).sort()).toEqual(["jordan", "marcus", "priya", "sam", "walt"]);
    for (const id of Object.keys(LOOKS)) {
      expect(LOOKS[id].id, id).toBe(id);
      expect(LOOKS[id].palette, `${id}'s palette lives in theme.js`).toBe(patientPalettes[id]);
      expect(typeof paint[LOOKS[id].cloth.paint], `${id}'s cloth is painted in textures.js`).toBe("function");
    }
    expect(lookFor("nobody")).toBe(LOOKS.jordan);
    expect(lookFor("constructor"), "never a key off the prototype").toBe(LOOKS.jordan);
    expect(patientPalettes.jordan).toBe(patientPalette);
    // The scene draws each look with that patient's own face and hair.
    const scene = fs.readFileSync(path.join(root, "src/counter/N64Scene.jsx"), "utf8");
    for (const id of Object.keys(LOOKS)) expect(scene, `${id}'s face and hair in N64Scene.jsx`).toMatch(new RegExp(`\\b${id}: \\{ faceUrl: ${id}Face, hairUrl: ${id}Hair \\}`));
  });

  it("leaves Jordan exactly as she was before the looks: every vertex, name and material", () => {
    // Hashes what buildPatient makes for Jordan. The value is the fourth pass's, taken
    // before patient.js took looks. If a deliberate change to Jordan lands, look at her
    // in the encounter first, then update it.
    const tex = (name) => Object.assign(new Texture(), { name });
    const { group, head } = buildPatient({ cloth: tex("knit"), face: tex("face"), hair: tex("hair") });
    const hash = createHash("sha256");
    group.traverse((object) => {
      hash.update(`${object.type}|${object.name}|${object.position.toArray()}|${object.rotation.toArray()}|${object.scale.toArray()}\n`);
      if (!object.isMesh) return;
      for (const name of Object.keys(object.geometry.attributes).sort()) {
        const attribute = object.geometry.getAttribute(name);
        hash.update(`${name}:${attribute.itemSize}:`);
        hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
      }
      if (object.geometry.index) hash.update(Buffer.from(object.geometry.index.array.buffer));
      const m = object.material;
      hash.update(`${m.type}|${m.color?.getHexString()}|${m.vertexColors}|${m.map?.name ?? ""}|${Boolean(m.onBeforeCompile && m.map)}\n`);
    });
    hash.update(`head:${head.position.toArray()}`);
    expect(patientTriangles(group), "Jordan's triangles").toBe(784);
    expect(hash.digest("hex"), "Jordan's geometry").toBe("618785098f7d279ce7f0a0645ecabaefb5b36c054ac26db4d21bf9316a1c68aa");
  });

  for (const id of NEW_PATIENTS) {
    describe(id, () => {
      it("stays N64-proper: shaped low-poly inside the console's budget, in a handful of draws", () => {
        const { group } = build(id);
        const count = patientTriangles(group);
        expect(count, `${id}'s triangles`).toBeGreaterThanOrEqual(300);
        expect(count, `${id}'s triangles`).toBeLessThanOrEqual(800);
        let meshes = 0;
        group.traverse((object) => { meshes += object.isMesh ? 1 : 0; });
        expect(meshes, `${id}'s draw calls`).toBeLessThanOrEqual(7);
        const face = group.getObjectByName("face");
        expect(face.geometry.getAttribute("position").count / 3, "facets carrying the photo").toBeGreaterThan(12);
        const points = vertices(face);
        const widest = Math.max(...points.map((p) => Math.abs(p.x)));
        const bottom = Math.min(...points.map((p) => p.y));
        const chin = Math.max(...points.filter((p) => p.y < bottom + 0.005).map((p) => Math.abs(p.x)));
        expect(chin / widest, "chin against cheekbones").toBeLessThan(0.8);
      });

      it("keeps the photo in proportion: the face crop matches the head it is wrapped on", () => {
        const [sx, sy] = LOOKS[id].head?.scale ?? [1, 1];
        // The face region is 0.2 m across, and runs from the chin (0.004 m) to the height
        // the crop's top edge reaches, before the head's own scale. Below the brow the
        // photo is laid on unwarped, so that is the proportion that must hold.
        const top = LOOKS[id].head?.photo?.top ?? 0.262;
        const head = (0.2 * sx) / ((top - 0.004) * sy);
        expect(Math.abs(faceCrop(id) / head - 1), `${id}'s crop aspect against the head's`).toBeLessThan(0.02);
      });

      it("wears a top that reads as a colour under the store's light, never black", () => {
        expect(luminance(LOOKS[id].palette.top), `${id}'s top`).toBeGreaterThan(0.015);
        expect(luminance(LOOKS[id].palette.skin), `${id}'s skin`).toBeGreaterThan(0.1);
      });

      it("rests both hands on the counter top, whatever the build", () => {
        const { palm } = LOOKS[id].body;
        for (const [, y, z] of palm.points) {
          expect(y, `${id}'s palm height`).toBeGreaterThan(0.95);
          expect(y, `${id}'s palm height`).toBeLessThan(1.0);
          expect(z, `${id}'s palm over the counter`).toBeGreaterThan(0.22);
        }
        const torso = LOOKS[id].body.torso.radii;
        expect(Math.max(...torso.map(([across]) => across)) * 2, `${id}'s shoulders`).toBeLessThan(0.5);
      });

      it("carries the photo's own hairline and hair over the crown: no cap edge, no bald dome", () => {
        const { group } = build(id);
        const face = group.getObjectByName("face");
        const head = group.getObjectByName("head");
        const { photo, rings } = LOOKS[id].head;
        expect(photo?.hairline, `${id}: where the photo's own hairline sits`).toBeTypeOf("number");
        const hair = worldVertices(group.getObjectByName("hair"));
        expect(worldVertices(face).length, `${id}: every front facet from chin to crown carries the photo, none swapped for a hair texture`).toBe(48 * 3);
        expect(Math.max(...hair.map((p) => p.y)) - head.position.y, `${id}: crown above the neck`).toBeGreaterThan(0.27);
        // The photo's hairline is pinned to the ring above the forehead, so everything
        // on the head above that ring is hair in the photo, and nothing runs off its top.
        const hairlineRing = rings[6].y;
        const [position, uv] = [face.geometry.getAttribute("position"), face.geometry.getAttribute("uv")];
        const above = Array.from({ length: position.count }, (_, i) => i).filter((i) => position.getY(i) >= hairlineRing - 1e-6);
        expect(above.length, `${id}: face vertices at and above the hairline ring`).toBeGreaterThan(8);
        for (const i of above) {
          expect(uv.getY(i), `${id}: above the hairline ring, the photo shows hair`).toBeGreaterThanOrEqual(1 - photo.hairline - 1e-6);
          expect(uv.getY(i), `${id}: and never past the photo's top edge`).toBeLessThanOrEqual(1 + 1e-6);
        }
      });

      it("keeps the neck and hands the colour of the face as its texture now has it", () => {
        // Jordan's skin token sits in a fixed relation to the middle of her face texture.
        // Each patient's keeps the same relation to theirs, measured between the eyes and
        // the mouth, so a re-graded face with a stale token fails here.
        const band = (file, rows) => {
          const { width, pixels } = readPng(path.join(root, "src/counter/assets", file));
          const sum = [0, 0, 0];
          let count = 0;
          for (let y = rows[0]; y < rows[1]; y += 1) {
            for (let x = 16; x < 48; x += 1) {
              for (let c = 0; c < 3; c += 1) sum[c] += pixels[(y * width + x) * 3 + c];
              count += 1;
            }
          }
          return sum.map((value) => value / count);
        };
        const hex = (value) => [1, 3, 5].map((at) => Number.parseInt(value.slice(at, at + 2), 16));
        const jordanBand = band("patient-face-64.png", [28, 50]);
        const relation = hex(patientPalette.skin).map((value, c) => value / jordanBand[c]);
        const expected = band(`patients/${id}-face-64.png`, [34, 51]).map((value, c) => value * relation[c]);
        hex(LOOKS[id].palette.skin).forEach((value, c) => expect(Math.abs(value - expected[c]), `${id}'s skin, channel ${"RGB"[c]}`).toBeLessThan(8));
      });
    });
  }

  it("gives Sam wire-thin glasses frames standing on his face across both eyes", () => {
    const trim = vertices(build("sam").group.getObjectByName("jaw"));
    for (const side of [-1, 1]) {
      const rim = trim.filter((p) => side * p.x > 0.02 && side * p.x < 0.07 && p.y > 0.14 && p.y < 0.18 && p.z > 0.08);
      expect(rim.length, `a rim before his ${side > 0 ? "left" : "right"} eye`).toBeGreaterThan(6);
      // The rim under the middle of the lens, measured top to bottom: wire, not a heavy frame.
      const rimBelow = trim.filter((p) => Math.abs(side * p.x - 0.051) < 0.004 && p.y > 0.135 && p.y < 0.152 && p.z > 0.08);
      expect(rimBelow.length, "lower rim vertices").toBeGreaterThan(2);
      expect(extent(rimBelow, "y"), "the lower rim's depth, top to bottom").toBeLessThan(0.003);
    }
  });

  it("dresses Sam's tee as a shirt under the cardigan, not a pale board down his chest", () => {
    const { palette } = LOOKS.sam;
    expect(luminance(palette.tee) / luminance(palette.top), "tonal against the navy, not a bright panel").toBeLessThan(8);
    expect(luminance(palette.teeRib), "a crew neck darker than the tee").toBeLessThan(luminance(palette.tee));
    const geometry = build("sam").group.getObjectByName("skin").geometry;
    const [position, colour] = [geometry.getAttribute("position"), geometry.getAttribute("color")];
    const { r, g } = new Color(palette.tee);
    // The tee's own vertices: the tee's hue, darkened by its shading, in front of the chest.
    const tee = Array.from({ length: position.count }, (_, i) => i).filter((i) => {
      const gain = colour.getX(i) / r;
      return Math.abs(position.getX(i)) < 0.06 && position.getY(i) < 1.5 && position.getZ(i) > 0.05
        && gain > 0.5 && gain <= 1.001 && Math.abs(colour.getY(i) / g - gain) < 0.002;
    });
    expect(tee.length, "tee vertices").toBeGreaterThan(20);
    const gains = tee.map((i) => colour.getX(i) / r);
    expect(Math.max(...gains) / Math.min(...gains), "shaded down and across, never one flat colour").toBeGreaterThan(1.2);
    const centre = tee.filter((i) => Math.abs(position.getX(i)) < 1e-6).map((i) => colour.getX(i) / r);
    const edges = tee.filter((i) => Math.abs(position.getX(i)) > 0.02 && Math.abs(position.getY(i) - 1.2) < 0.01).map((i) => colour.getX(i) / r);
    expect(centre.length && edges.length, "found the tee's middle and its edges").toBeTruthy();
    expect(Math.max(...edges), "its edges fall into the cardigan's shade").toBeLessThan(Math.max(...centre));
    expect(Math.max(...tee.filter((i) => position.getY(i) < 1.3).map((i) => Math.abs(position.getX(i)))), "a narrow opening over the chest").toBeLessThan(0.05);
  });

  it("hangs Marcus's twists past his temples, and leaves his forearms bare below a short sleeve", () => {
    const { group } = build("marcus");
    const hair = vertices(group.getObjectByName("hair"));
    for (const side of [-1, 1]) {
      expect(hair.filter((p) => side * p.x > 0.095 && p.y < 0.13).length, "twists hanging at the side").toBeGreaterThan(8);
    }
    const sleeves = vertices(group.getObjectByName("arms"));
    expect(Math.min(...sleeves.map((p) => p.y)), "the sleeves stop above the elbow").toBeGreaterThan(1.25);
    const skin = vertices(group.getObjectByName("skin"));
    expect(skin.filter((p) => Math.abs(p.x) > 0.2 && p.y > 1.05 && p.y < 1.25).length, "bare upper arms and elbows").toBeGreaterThan(12);
  });

  it("hangs Priya's side braid from her body, a thick plaited braid over her left shoulder ending on her chest", () => {
    const { group, head } = build("priya");
    const braid = group.getObjectByName("braid");
    expect(braid.parent, "hangs from the body, so it stays put when she turns her head").toBe(group);
    const points = vertices(braid);
    const neck = head.position.y;
    expect(points.every((p) => p.x > 0.03), "all on her left").toBe(true);
    expect(Math.max(...points.map((p) => p.y)), "starts up behind her ear").toBeGreaterThan(neck + 0.03);
    const end = Math.min(...points.map((p) => p.y));
    expect(end, "reaches her chest").toBeLessThan(neck - 0.2);
    expect(end, "and ends there, not at her belly").toBeGreaterThan(neck - 0.3);
    expect(Math.max(...points.filter((p) => p.y < neck - 0.15).map((p) => p.z)), "lies in front of her").toBeGreaterThan(0.08);
    // Thick and tapering: its width across, averaged over slices of its length.
    const across = (from, to) => {
      const widths = [];
      for (let d = from; d >= to - 1e-9; d -= 0.02) {
        const slice = points.filter((p) => Math.abs(p.y - (neck + d)) < 0.012);
        if (slice.length) widths.push(extent(slice, "x"));
      }
      expect(widths.length, `slices found from ${from} to ${to}`).toBeGreaterThan(2);
      return widths.reduce((sum, width) => sum + width, 0) / widths.length;
    };
    expect(across(-0.1, -0.2), "thick over her chest, never a thin cord").toBeGreaterThan(0.032);
    expect(across(-0.16, -0.22), "thinner towards the end").toBeLessThan(across(-0.02, -0.08));
    expect(luminance(LOOKS.priya.palette.tee), "her tee toned down, no longer the brightest thing on screen").toBeLessThan(0.6);
  });

  it("gives Walt short grey hair with no clumps, and a mustache seated in his face under the nose", () => {
    const { group } = build("walt");
    const trim = vertices(group.getObjectByName("jaw"));
    const mustache = trim.filter((p) => Math.abs(p.x) < 0.06 && p.y > 0.05 && p.y < 0.085 && p.z > 0.07);
    expect(mustache.length, "mustache vertices").toBeGreaterThan(12);
    expect(Math.max(...mustache.map((p) => Math.abs(p.x))), "corner to corner").toBeGreaterThan(0.045);
    // Seated, not stuck on: under the nose it stands no more than a few millimetres
    // proud of the face's own front line there.
    const front = vertices(group.getObjectByName("face")).filter((p) => Math.abs(p.x) < 1e-6).sort((a, b) => a.y - b.y);
    const [below, above] = [front.filter((p) => p.y <= 0.07).at(-1), front.find((p) => p.y > 0.07)];
    const faceZ = below.z + ((above.z - below.z) * (0.07 - below.y)) / (above.y - below.y);
    expect(Math.max(...mustache.filter((p) => Math.abs(p.x) < 0.01).map((p) => p.z)) - faceZ, "stands proud of the lip by").toBeLessThan(0.0045);
    const hair = vertices(group.getObjectByName("hair"));
    expect(Math.max(...hair.map((p) => p.y)), "close-cut: nothing stands above the skull").toBeLessThanOrEqual(0.3);
    expect(luminance(LOOKS.walt.palette.hair), "grey, not dark").toBeGreaterThan(0.4);
  });

  it("dresses each patient in their own garment's cues", () => {
    // A garment colour on the body below the neck ring (which is painted too, so it
    // must not count), allowing for a part shaded darker towards its foot. The colour
    // goes through three's Color, as the builder's does, so the test and the game agree.
    const has = (id, hex) => {
      const geometry = build(id).group.getObjectByName("skin").geometry;
      const [position, colour] = [geometry.getAttribute("position"), geometry.getAttribute("color")];
      const below = LOOKS[id].body.rib.points[0][1] - 0.005;
      const { r, g, b } = new Color(hex);
      return Array.from({ length: colour.count }, (_, i) => i).some((i) => {
        if (position.getY(i) >= below) return false;
        const gains = [colour.getX(i) / r, colour.getY(i) / g, colour.getZ(i) / b];
        return gains.every((gain) => gain > 0.7 && gain <= 1.001 && Math.abs(gain - gains[0]) < 0.002);
      });
    };
    expect(LOOKS.sam.cloth.paint, "Sam's cardigan is knitted").toBe("knit");
    expect(LOOKS.marcus.hair, "Marcus's twists").toBeTypeOf("function");
    expect(has("sam", LOOKS.sam.palette.tee), "Sam's grey tee shows between the cardigan's fronts").toBe(true);
    expect(LOOKS.marcus.cloth.paint, "Marcus's polo is pique").toBe("pique");
    expect(has("marcus", LOOKS.marcus.palette.topRib), "Marcus's polo collar").toBe(true);
    expect(LOOKS.priya.cloth.paint, "Priya's jacket is denim").toBe("denim");
    expect(has("priya", LOOKS.priya.palette.tee), "Priya's white tee under the jacket").toBe(true);
    expect(LOOKS.walt.cloth.paint, "Walt's shirt is a plaid flannel").toBe("plaid");
    expect(has("walt", LOOKS.walt.palette.tee), "Walt's white undershirt at the open collar").toBe(true);
  });
});
