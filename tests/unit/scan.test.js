import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { scanDist, scanText } from "../../scripts/scan.mjs";

describe("bundle scanner", () => {
  it("scans source maps too, so turning them on can never ship unscanned source", () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), "ci-scan-"));
    try {
      fs.writeFileSync(path.join(dist, "index.js.map"), '{"sourcesContent":["fetch(\\"https://example.invalid/ping\\")"]}');
      const { files, hits } = scanDist(dist);
      expect(files.map((file) => path.basename(file))).toEqual(["index.js.map"]);
      expect(hits.some((hit) => hit.rule === "network url")).toBe(true);
    } finally {
      fs.rmSync(dist, { recursive: true, force: true });
    }
  });

  it("is RED on a network URL, fetch, storage, and a hashed banned word", () => {
    const rules = (t) => scanText(t).map((h) => h.rule);
    expect(rules('const u = "https://example.invalid/x"')).toContain("network url");
    expect(rules("window.fetch(url)")).toContain("fetch call");
    expect(rules("localStorage.setItem('a', 1)")).toContain("storage");
    expect(rules("hello " + Buffer.from("ZXhhbXBsZW5hbWU=", "base64").toString("utf8"))).toContain("banned word");
  });
  it("is GREEN on the SVG namespace, data URIs and ordinary copy", () => {
    expect(scanText('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toEqual([]);
    expect(scanText('url("data:font/woff2;base64,AAAA")')).toEqual([]);
    expect(scanText("Tap the patient with the opening. Today works.")).toEqual([]);
  });
  it("is RED on the homage source's names and GREEN on the game's own words", () => {
    const homage = (t) => scanText(t).filter((h) => h.rule.startsWith("homage")).map((h) => h.rule);
    for (const plant of ["GoldenEye 64", "Golden Eye", "Agent 007.", "007 agent", "James Bond", "BOND", "Q WATCH v2.01 BETA", "Q-watch", "gun barrel", "gun-barrel", "FOR YOUR EYES ONLY", "For your eyes only", 'lines:["For your eyes","only"]', "Q Branch", "Q-BRANCH", "Moneypenny"]) {
      expect(homage(plant), plant).not.toEqual([]);
    }
    for (const own of ["Rx WATCH v2.01 BETA", "00 Agent", "Secret Agent", "x=.007", "1007", "0.0075", "AB007cd+/007x", "bonded", "Bonding", "Quick watch", "BEHIND THE COUNTER", "eyes on the counter", "a branch of the pharmacy", "money", "penny"]) {
      expect(scanText(own), own).toEqual([]);
    }
  });
  it("is RED on the house type and tokens, which this unbranded game never ships", () => {
    const rules = (t) => scanText(t).map((h) => h.rule);
    for (const plant of ['font-family: "IBM Plex Sans"', "@fontsource/ibm-plex-mono", 'import { colors } from "madden-tokens/design"']) {
      expect(rules(plant), plant).toContain("house style");
    }
    expect(scanText('font-family: "Michroma", "Oxanium", "Share Tech Mono"')).toEqual([]);
  });
  it("ignores opaque raster payload bytes but still scans text content around them", () => {
    const raster = 'const scene = "data:image/png;base64,AAAAACVSAAAA";';
    expect(scanText(raster)).toEqual([]);
    expect(scanText(`${raster} fetch("https://example.invalid/ping")`).map((hit) => hit.rule)).toEqual(["network url", "fetch call"]);
    expect(scanText('data:image/svg+xml,<svg><script>fetch("/ping")</script></svg>').map((hit) => hit.rule)).toContain("fetch call");
  });
  it("lets generic vaccine talk and cited agencies through, since vaccines are the point (Kevin, 2026-09-15)", () => {
    for (const ok of ["Want a flu shot while you're here?", "the updated COVID-19 vaccine", "Source: CDC, Key Facts About Seasonal Flu Vaccine", "a Td or Tdap booster", "immunization record", "a sore arm is a common side effect", "influenza", "RSV", "shingles"]) {
      expect(scanText(ok), ok).toEqual([]);
    }
  });
  it("is RED on the reference device's maker and its nickname, so the Rx handheld stays generic", () => {
    const rules = (t) => scanText(t).map((h) => h.rule);
    for (const plant of ["Zebra", "ZEBRA", "a Zebra handheld", "Ironman", "IRONMAN", "Iron Man", "the Iron Man scanner"]) {
      expect(rules(plant), plant).toContain("device brand");
    }
    for (const own of ["Rx HANDHELD v2.01 BETA", "a rugged scanner", "the counting tray", "an iron supplement", "ironclad resolve", "a man of iron will", "zebrafish"]) {
      expect(scanText(own), own).toEqual([]);
    }
  });
  it("is RED on brand-name vaccine products and their makers, so copy stays generic", () => {
    const rules = (t) => scanText(t).map((h) => h.rule);
    for (const plant of ["Fluzone High-Dose", "FLUMIST", "Flu Mist", "Comirnaty", "Spikevax", "Shingrix", "Prevnar 20", "Arexvy"]) {
      expect(rules(plant), plant).toContain("vaccine brand");
    }
    for (const plant of ["Pfizer-BioNTech", "Moderna", "GSK", "Sanofi", "Merck"]) {
      expect(rules(plant), plant).toContain("vaccine maker");
    }
    for (const own of ["merchant", "modern", "a moderate dose", "fluid", "fluffy"]) {
      expect(scanText(own), own).toEqual([]);
    }
  });
});
