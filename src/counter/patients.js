// The patient files on SELECT FILE. Kevin ruled 2026-09-15 that difficulty is STATIC
// PER PATIENT: each file carries one fixed level (Agent, Secret Agent or 00 Agent),
// printed on the file, and its objectives come from that level. There is no difficulty
// select anywhere. A file's conversation is the tree in ./trees/ with the same id, and
// replay value comes from that tree's branches and endings.
//
// Every patient is entirely fictional, with a generated photo of nobody real (Jordan's
// provenance: docs/assets/patient-face-photo-provenance.md). Only real files belong
// here: SELECT FILE draws exactly this list and never pads it with placeholder folders.
// A patient is added only once its tree is written and Kevin has picked its face.
import jordanPortrait from "./assets/patient-portrait.jpg";
import marcusPortrait from "./assets/patients/marcus-portrait.jpg";
import priyaPortrait from "./assets/patients/priya-portrait.jpg";
import samPortrait from "./assets/patients/sam-portrait.jpg";
import waltPortrait from "./assets/patients/walt-portrait.jpg";
import { conversationFor } from "./engine.js";
import { TIERS, objectivePrompts } from "./objectives.js";

// the classic N64 shooter's three difficulty names (objectives.js TIERS), as the fixed levels printed
// on files. `glyph` is what the Rx handheld control shows on its little screen.
const GLYPHS = { agent: "A", "secret-agent": "SA", "00-agent": "00" };
export const LEVELS = TIERS.map(({ id, label }) => ({ id, label, glyph: GLYPHS[id] }));
export const levelById = (levelId) => LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];

export const PATIENTS = Object.freeze([
  Object.freeze({
    id: "jordan",
    name: "Jordan",
    level: "agent",
    portrait: jordanPortrait,
    portraitAlt: "Jordan's file photo: a fictional woman with curly brown hair and a green sweater, smiling a little.",
  }),
  // The other four (Kevin's storyline picks, 2026-09-16), in the ruled pyramid: Priya at
  // Agent, Sam and Walt at Secret Agent, Marcus at 00 Agent. Faces Kevin picked 2026-09-15.
  Object.freeze({
    id: "priya",
    name: "Priya",
    level: "agent",
    portrait: priyaPortrait,
    portraitAlt: "Priya's file photo: a fictional woman with a long dark side braid and a denim jacket, smiling.",
  }),
  Object.freeze({
    id: "sam",
    name: "Sam",
    level: "secret-agent",
    portrait: samPortrait,
    portraitAlt: "Sam's file photo: a fictional man with short dark hair, glasses and a navy cardigan.",
  }),
  Object.freeze({
    id: "walt",
    name: "Walt",
    level: "secret-agent",
    portrait: waltPortrait,
    portraitAlt: "Walt's file photo: a fictional older man with grey hair, a white mustache and a blue flannel shirt.",
  }),
  Object.freeze({
    id: "marcus",
    name: "Marcus",
    level: "00-agent",
    portrait: marcusPortrait,
    portraitAlt: "Marcus's file photo: a fictional young man with twists and a green polo, smiling.",
  }),
]);

export const patientById = (patientId) => PATIENTS.find((patient) => patient.id === patientId);
export const levelOf = (patient) => levelById(patient.level);

// The branching conversation behind a file: its briefing, opener, rush and endings.
export const conversationOf = (patient) => conversationFor(patient.id);

// The stated goals printed in a file: always its own level's.
export const fileObjectives = (patient) => objectivePrompts(patient.level, conversationOf(patient));
