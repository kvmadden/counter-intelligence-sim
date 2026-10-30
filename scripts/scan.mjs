// Bundle scanner: proves the built editions carry no network reference and no
// name that must never ship. Fails closed. Run with --self-test to prove it is
// RED on a planted string before trusting a GREEN.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(root, "dist");

export const PATTERNS = [
  // Allowed strings that are never fetched: the SVG namespace, and the link
  // React's production build prints inside its own error messages.
  ["network url", /https?:\/\/(?!www\.w3\.org\/|reactjs\.org\/docs\/error-decoder\.html)/i],
  ["websocket url", /\bwss?:\/\//i],
  ["fetch call", /\bfetch\s*\(/],
  ["xhr", /XMLHttpRequest/],
  ["beacon", /sendBeacon/],
  ["websocket api", /\bWebSocket\b/],
  ["event source", /\bEventSource\b/],
  ["service worker", /serviceWorker/],
  ["storage", /\b(localStorage|sessionStorage|indexedDB)\b/],
  // The pharmacy reads like a big chain's, but it is nobody's (no real chain is named).
  // Any case, since CSS can uppercase copy; embedded payloads are stripped before matching.
  ["deployment marker", /\b(vercel|supabase|analytics|telemetry)\b/i],
  // Hosted edition assets are relative (./assets/...); only a host counts as external.
  ["external script", /<script[^>]+src=["'](?:https?:)?\/\//i],
  ["external stylesheet", /<link[^>]+href=["'](?:https?:)?\/\//i],
  ["css import", /@import\s+(?!url\(["']?data:)/i],
  // Vaccines are central (Kevin, 2026-09-15), so vaccine, disease and agency words ship.
  // Products do not: generic names only, never a brand or its maker. Agencies may be
  // named only where a claim cites them, which scripts/check-claims.mjs holds at source.
  ["vaccine brand", /\b(?:Fluzone|Flucelvax|Fluad|Flu\s*Mist|Afluria|Flublok|Fluarix|FluLaval|Comirnaty|Spikevax|mNEXSPIKE|Nuvaxovid|Boostrix|Adacel|Tenivac|TDVAX|Shingrix|Zostavax|Arexvy|Abrysvo|mResvia|Prevnar|Capvaxive|Vaxneuvance|Pneumovax|Gardasil|Heplisav|Engerix|Recombivax|PreHevbrio|Twinrix|Havrix|Vaqta|Menveo|MenQuadfi|Bexsero|Trumenba|Penbraya|Penmenvy|Beyfortus|Enflonsia|Priorix|ProQuad|Varivax)\b/i],
  ["vaccine maker", /\b(?:Pfizer|BioNTech|Moderna|Novavax|Sanofi|GSK|Glaxo\s*Smith\s*Kline|Merck|Seqirus|AstraZeneca|Janssen|Dynavax)\b/i],
  ["commercial health site", /\bWebMD\b/i],
  // The encounter is a GoldenEye 64 homage by idiom only: its source's names never ship.
  // 007 must stand alone, so decimals (.007), longer numbers and base64 runs stay GREEN.
  ["homage GoldenEye", /golden\s*eye/i],
  ["homage 007", /(?<![\w.+\/=-])007(?![\w+\/=]|\.\d)/],
  ["homage Bond", /\b(?:Bond|BOND)\b/],
  ["homage Q WATCH", /\bQ[\s-]*WATCH\b/i],
  ["homage gun-barrel", /\bgun[\s-]*barrel\b/i],
  // The dossier's stamp carries a pharmacy phrase, never the source's own.
  // Up to four non-word characters between words, so a phrase split across lines of
  // a stamp (["For your eyes", "only"] in the bundle) is still caught.
  ["homage eyes-only stamp", /\bfor\W{1,4}your\W{1,4}eyes\W{1,4}only\b/i],
  ["homage Q Branch", /\bQ[\s-]*Branch\b/i],
  ["homage Moneypenny", /\bMoney\s*penny\b/i],
  // Unbranded (Kevin, 2026-09-15): the house type and tokens never ship in this game.
  ["house style", /IBM\s*Plex|ibm-plex|madden-tokens/i],
  // The Rx handheld is a generic rugged device, never the real maker's product it
  // was modelled on. The maker's name and a Marvel character's name both stay out.
  ["device brand", /\bZebra\b|\bIron[\s-]*Man\b/i],
];

// Words that must never ship, stored hashed. The one entry here is a placeholder.
// The self-test plants one banned word, base64 so it is not greppable in the repo.
const SELF_TEST_WORD_B64 = "ZXhhbXBsZW5hbWU=";

export const BANNED_WORD_HASHES = new Set(["a311cc6752e5556df96251e5a1270532a255645d9c8e5ba6124578c1aad9f3a5"]);

export function scanText(text, label = "text") {
  // Embedded base64 payloads (images, fonts) are opaque bytes, not executable or
  // copy content, and can contain a banned word's letters by chance. Keep each
  // URI's type and scan all the surrounding text, but not the payload itself.
  const inspected = text.replace(/data:[\w.+/-]+;base64,[A-Za-z0-9+/=]+/gi, (uri) => `${uri.slice(0, uri.indexOf(",") + 1)}[payload]`);
  const hits = [];
  for (const [name, re] of PATTERNS) {
    const m = inspected.match(re);
    if (m) hits.push({ file: label, rule: name, snippet: inspected.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, " ") });
  }
  const words = new Set(inspected.toLowerCase().match(/[a-z]{3,}/g) || []);
  for (const w of words) {
    if (BANNED_WORD_HASHES.has(crypto.createHash("sha256").update(w).digest("hex"))) hits.push({ file: label, rule: "banned word", snippet: "(name withheld)" });
  }
  return hits;
}

export function scanDist(dist = DIST) {
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      // Source maps too, so turning them on can never ship unscanned source.
      else if (/\.(html|js|css|json|svg|map)$/.test(e.name)) files.push(p);
    }
  };
  walk(dist);

  const hits = [];
  for (const f of files) hits.push(...scanText(fs.readFileSync(f, "utf8"), path.relative(root, f)));
  return { files, hits };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  if (!fs.existsSync(DIST)) { console.error("scan: dist/ missing, build first"); process.exit(2); }
  if (process.argv.includes("--self-test")) {
    const planted = fs.readFileSync(path.join(DIST, "index.html"), "utf8") + "\n<!-- https://example.invalid/ping -->";
    const red = scanText(planted, "self-test");
    if (!red.some((h) => h.rule === "network url")) { console.error("scan self-test: planted URL was NOT caught. The scanner is blind."); process.exit(1); }
    const hashedRed = scanText("hello " + Buffer.from(SELF_TEST_WORD_B64, "base64").toString("utf8") + " there", "self-test");
    if (!hashedRed.some((h) => h.rule === "banned word")) { console.error("scan self-test: hashed banned word was NOT caught."); process.exit(1); }
    const brandPlants = [["vaccine brand", "Fluzone High-Dose"], ["vaccine brand", "SPIKEVAX"], ["vaccine maker", "Pfizer-BioNTech"], ["vaccine maker", "Moderna"]];
    for (const [rule, plant] of brandPlants) {
      if (!scanText(`<p>${plant}</p>`, "self-test").some((h) => h.rule === rule)) { console.error(`scan self-test: planted "${plant}" was NOT caught by ${rule}.`); process.exit(1); }
    }
    const homagePlants = { "homage GoldenEye": "GoldenEye 64", "homage 007": "Agent 007.", "homage Bond": "James Bond", "homage Q WATCH": "Q WATCH v2.01", "homage gun-barrel": "gun-barrel open", "homage eyes-only stamp": "FOR YOUR EYES ONLY", "homage Q Branch": "Q Branch", "homage Moneypenny": "Moneypenny", "house style": "font-family: IBM Plex Sans" };
    for (const [rule, plant] of Object.entries(homagePlants)) {
      if (!scanText(`<p>${plant}</p>`, "self-test").some((h) => h.rule === rule)) { console.error(`scan self-test: planted "${plant}" was NOT caught by ${rule}.`); process.exit(1); }
    }
    const devicePlants = ["Zebra", "ZEBRA TC26", "Ironman", "Iron Man", "Iron-Man"];
    for (const plant of devicePlants) {
      if (!scanText(`<p>${plant}</p>`, "self-test").some((h) => h.rule === "device brand")) { console.error(`scan self-test: planted "${plant}" was NOT caught by device brand.`); process.exit(1); }
    }
    console.log(`scan self-test: RED as expected (${red.length + hashedRed.length} planted hits caught, plus ${brandPlants.length} vaccine brands and makers, ${Object.keys(homagePlants).length} homage names and house-style marks, and ${devicePlants.length} device brand names)`);
    process.exit(0);
  }
  const { files, hits } = scanDist();
  console.log(`scan: ${files.length} files inspected`);
  if (hits.length) { for (const h of hits) console.error(`  RED ${h.file} :: ${h.rule} :: ${h.snippet}`); process.exit(1); }
  console.log("scan: GREEN, no network reference, no banned name");
}
