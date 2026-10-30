import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { objectivePrompts } from "../../src/counter/objectives.js";
import { LEVELS, PATIENTS, conversationOf, fileObjectives, levelOf } from "../../src/counter/patients.js";
import { TREES } from "../../src/counter/trees/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});

describe("patient files: difficulty is static per patient (Kevin, 2026-09-15)", () => {
  it("holds the ruled pyramid: Jordan and Priya at Agent, Sam and Walt at Secret Agent, Marcus at 00 Agent", () => {
    expect(PATIENTS.map((patient) => [patient.id, patient.level])).toEqual([
      ["jordan", "agent"], ["priya", "agent"], ["sam", "secret-agent"], ["walt", "secret-agent"], ["marcus", "00-agent"],
    ]);
    expect(PATIENTS.map((patient) => levelOf(patient).label)).toEqual(["Agent", "Agent", "Secret Agent", "Secret Agent", "00 Agent"]);
    expect(conversationOf(PATIENTS.find((patient) => patient.id === "marcus")).rushed, "the 00 file is the rushed one").toBe(true);
  });

  it("prints exactly one known level on every file, and nothing at run time can change it", () => {
    expect(Object.isFrozen(PATIENTS)).toBe(true);
    for (const patient of PATIENTS) {
      expect(LEVELS.map((level) => level.id), patient.id).toContain(patient.level);
      expect(Object.isFrozen(patient), patient.id).toBe(true);
      expect(() => { patient.level = "00-agent"; }, `${patient.id} level is fixed`).toThrow(TypeError);
    }
  });

  it("takes every file's objectives from its own level", () => {
    for (const patient of PATIENTS) {
      expect(fileObjectives(patient).length, patient.id).toBeGreaterThan(0);
      expect(fileObjectives(patient), patient.id).toEqual(objectivePrompts(patient.level, conversationOf(patient)));
    }
  });

  it("pairs every file with a written conversation tree, and every tree with a file and its photo", () => {
    expect(PATIENTS.map((patient) => patient.id).sort()).toEqual(Object.keys(TREES).sort());
    for (const patient of PATIENTS) {
      expect(conversationOf(patient).patient, patient.id).toBe(patient.name);
      expect(patient.portrait, patient.id).toBeTruthy();
      expect(patient.portraitAlt, patient.id).toMatch(/fictional/i);
    }
  });

  it("ships small file photos and never a 1024px source photo", () => {
    const portraits = ["src/counter/assets/patient-portrait.jpg", ...["priya", "sam", "walt", "marcus"].map((id) => `src/counter/assets/patients/${id}-portrait.jpg`)];
    for (const portrait of portraits) expect(fs.statSync(path.join(root, portrait)).size, `${portrait} bytes`).toBeLessThanOrEqual(40 * 1024);
    const sources = walk(path.join(root, "src/counter")).filter((file) => /\.(jsx?|css)$/.test(file));
    expect(sources.length, "sources scanned").toBeGreaterThan(10);
    // An import, a dynamic import or a URL reference would ship it; a comment naming it would not.
    const loadsPhoto = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new\s+URL\(\s*|url\(\s*)["']?[^"')\s]*(?:patient-face-photo|patients\/[a-z]+-photo)/;
    const importers = sources.filter((file) => loadsPhoto.test(fs.readFileSync(file, "utf8")));
    expect(importers.map((file) => path.relative(root, file)), "nothing in the game loads the source photo").toEqual([]);
  });
});
