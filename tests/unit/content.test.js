import { describe, it, expect } from "vitest";
import { CHARS, COPY, SHOTS } from "../../src/engine/canvas/data.js";

// Legacy Shot Clock canvas data only (src/engine/canvas/, never shipped by Counter
// Intelligence). Kevin's 2026-09-07 zero-clinical-facts rule still describes THAT data.
// It does NOT bind Counter Intelligence, which since 2026-09-15 is about vaccines and
// holds its facts to scripts/check-claims.mjs instead (the design notes).
const CLINICAL = /\b(vaccin\w*|flu|flus|influenza|covid\w*|sars|rsv|hpv|hepatitis|hbv|tdap|dtap|pertussis|whooping|shingles|zoster|pneumococc\w*|pneumonia|tetanus|measles|mmr|varicella|meningococc\w*|shingrix|prevnar|capvaxive|heplisav|gardasil|abrysvo|arexvy|fluzone|comirnaty|spikevax|boostrix|adacel|immuniz\w*|inject\w*|dose|doses|dosing|side effect\w*)\b|\d+\s*%|percent|\b\d+\s*weeks?\b|\bmg\b/i;
const AGENCY = /\b(CDC|ACIP|FDA|WHO|HHS|NIH|OSHA)\b/;
const ORG = /Walgreens|Rite Aid|Walmart|Kroger|WebMD/i;

const allText = () => JSON.stringify(CHARS) + JSON.stringify(COPY) + JSON.stringify(SHOTS);

describe("content: behavior only", () => {
  it("names no vaccine, disease, brand, agency, percentage or gestational week anywhere in copy", () => {
    const m = allText().match(CLINICAL);
    expect(m, m && `clinical term in copy: "${m[0]}"`).toBeNull();
    expect(allText()).not.toMatch(ORG);
    expect(allText()).not.toMatch(AGENCY);
  });
  
  it("all strings are fully uppercase or correctly wrapped (no >55 char strings)", () => {
    function assertStrings(obj, path = '') {
      if (typeof obj === 'string') {
        expect(obj.length, `String at ${path} exceeds 55 chars (${obj.length}): "${obj}"`).toBeLessThanOrEqual(55);
      } else if (Array.isArray(obj)) {
        obj.forEach((item, idx) => assertStrings(item, `${path}[${idx}]`));
      } else if (obj !== null && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          assertStrings(obj[key], `${path}.${key}`);
        }
      }
    }

    assertStrings(CHARS, 'CHARS');
    assertStrings(COPY, 'COPY');
    assertStrings(SHOTS, 'SHOTS');

    // Also assert character structural properties
    for (const c of CHARS) {
      expect(c.id).toBeTruthy();
      expect(c.name).toMatch(/^[A-Z '.-]+$/);
      for (const obj of c.objections) {
        expect(obj.text).toMatch(/^[A-Z \n0-9'.,:;?!-]+$/);
        for (const res of obj.responses) {
          if (res.text) {
            expect(res.text).toMatch(/^[A-Z \n0-9'.,:;?!-]+$/);
          }
        }
      }
    }
  });

  it("every character has objections with responses", () => {
    for (const c of CHARS) {
      expect(c.objections.length).toBeGreaterThan(0);
      for (const obj of c.objections) {
        expect(obj.text.length).toBeGreaterThan(0);
        expect(obj.responses.length).toBe(3);
        const goods = obj.responses.filter(r => r.q === 'good');
        expect(goods.length).toBe(1);
      }
    }
  });
});

