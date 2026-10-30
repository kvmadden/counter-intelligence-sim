import { describe, expect, it } from "vitest";
import { dossier } from "../../src/counter/theme.js";

// WCAG relative luminance and contrast, from the theme's own token values.
const channel = (value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((at) => channel(Number.parseInt(hex.slice(at, at + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

// Every text colour the file screens print, on every ground it is printed on:
// the sheet runs paperLight -> paper -> paperDeep, the side tabs are paperDeep,
// the huddle card is card, and SELECT FILE is night lifted to nightLift.
const TEXT_ON = {
  ink: ["paperLight", "paper", "paperDeep", "card"],
  inkSoft: ["paperLight", "paper", "paperDeep", "card"],
  menu: ["night", "nightLift"],
  menuDim: ["night", "nightLift"],
};

describe("the file screens' type reads at 4.5:1 on every ground it sits on", () => {
  for (const [text, grounds] of Object.entries(TEXT_ON)) {
    for (const ground of grounds) {
      it(`${text} on ${ground}`, () => {
        const ratio = contrast(dossier[text], dossier[ground]);
        expect(ratio, `${text} ${dossier[text]} on ${ground} ${dossier[ground]}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
