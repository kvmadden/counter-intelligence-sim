// Bundle scanner: proves the built editions carry no network reference and no
// name that must never ship. Fails closed. Run with --self-test to prove it is
// RED on a planted string before trusting a GREEN.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(root, "dist");
const INERT_BASE64_DATA_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "font/woff",
  "font/woff2",
]);
const REQUIRED_ENTRYPOINTS = ["index.html", "counter-intelligence.html"];
const PROJECT_SVG_TEMPLATE = /url\(["']data:image\/svg\+xml,\$\{encodeURIComponent\([A-Za-z_$][\w$]*\)\}["']\)/g;
const DATA_URI = /\bdata:\s*(?:[a-z\d.+-]+\/[a-z\d.+-]+[^"'<>)]*|[;,][^"'<>)]*)/gi;

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

function expandDataUris(text, label, dataUriHits, depth = 0) {
  return text.replace(DATA_URI, (uri) => {
    const comma = uri.indexOf(",");
    if (comma < 0) {
      dataUriHits.push({ file: label, rule: "unreadable data URI", snippet: "data: without payload separator" });
      return "[unreadable data URI]";
    }

    const header = uri.slice(5, comma);
    const [rawMime, ...rawParams] = header.split(";");
    const mime = rawMime.trim().toLowerCase();
    const params = rawParams.map((param) => param.trim().toLowerCase());
    const isBase64 = params.includes("base64");
    const payload = uri.slice(comma + 1);
    const validBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload);

    if (INERT_BASE64_DATA_MIMES.has(mime) && isBase64 && validBase64) {
      return "[inert raster/font payload]";
    }

    const activeTextType = mime.startsWith("text/") || mime.endsWith("+xml");
    if (!activeTextType) {
      dataUriHits.push({ file: label, rule: "unvetted data URI", snippet: "data:" + (mime || "(missing MIME)") });
      return "[rejected data URI]";
    }

    const rule = mime.endsWith("+xml") ? "active data URI" : "executable data URI";
    dataUriHits.push({ file: label, rule, snippet: "data:" + (mime || "(missing MIME)") });
    try {
      if (isBase64 && !validBase64) throw new Error("invalid base64 data URI");
      const decoded = isBase64
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload);
      if (depth >= 8 && /\bdata:[^"'<>)]*,/i.test(decoded)) {
        dataUriHits.push({ file: label, rule: "nested data URI depth", snippet: "data:" + mime });
        return "[nested payload rejected]";
      }
      return expandDataUris(decoded, label, dataUriHits, depth + 1);
    } catch {
      dataUriHits.push({ file: label, rule: "unreadable data URI", snippet: "data:" + (mime || "(missing MIME)") });
      return "[unreadable data URI]";
    }
  });
}

export function scanText(text, label = "text") {
  // Only the built raster images and WOFF fonts are treated as inert opaque bytes.
  // Decode executable and other textual data URIs before applying the normal rules.
  // Reject unknown binary MIME types rather than trusting them as inert.
  // The app's fixed SVG noise filter is built from a local template scanned below.
  // Replace only the exact generated URL wrapper. The SVG source expression
  // remains in the inspected text and still passes through the ordinary rules.
  const source = text.replace(PROJECT_SVG_TEMPLATE, "[local SVG template data URL]");
  const dataUriHits = [];
  const inspected = expandDataUris(source, label, dataUriHits);
  const hits = [...dataUriHits];
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

export function scanDist(dist = DIST, { requireEntrypoints = false } = {}) {
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
  if (requireEntrypoints) {
    if (files.length === 0) hits.push({ file: path.relative(root, dist), rule: "scanner coverage", snippet: "zero files inspected" });
    for (const entry of REQUIRED_ENTRYPOINTS) {
      const entryPath = path.join(dist, entry);
      if (!fs.existsSync(entryPath) || !fs.statSync(entryPath).isFile()) hits.push({ file: path.relative(root, dist), rule: "scanner coverage", snippet: `missing ${entry}` });
    }
    if (!files.some((file) => /\.js$/.test(file))) hits.push({ file: path.relative(root, dist), rule: "scanner coverage", snippet: "missing JavaScript bundle" });
    if (!files.some((file) => /\.css$/.test(file))) hits.push({ file: path.relative(root, dist), rule: "scanner coverage", snippet: "missing stylesheet bundle" });
  }
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
    const fetchSentinel = 'fetch("/CIS_SCANNER_SENTINEL")';
    for (const [mime, payload] of [
      ["text/javascript", fetchSentinel],
      ["image/svg+xml", `<svg><script>${fetchSentinel}</script></svg>`],
      ["text/html", `<script>${fetchSentinel}</script>`],
    ]) {
      const data = Buffer.from(payload).toString("base64");
      if (!scanText(`data:${mime};base64,${data}`, "self-test").some((h) => h.rule === "fetch call")) {
        console.error(`scan self-test: executable ${mime} payload was not decoded and scanned.`);
        process.exit(1);
      }
    }
    for (const mime of ["image/png", "image/jpeg", "font/woff", "font/woff2"]) {
      if (scanText(`data:${mime};base64,AAAA`, "self-test").length) {
        console.error(`scan self-test: vetted inert ${mime} payload was rejected.`);
        process.exit(1);
      }
    }
    const defaultMime = Buffer.from(fetchSentinel).toString("base64");
    for (const uri of [`data:;base64,${defaultMime}`, `data:;charset=utf-8;base64,${defaultMime}`]) {
      if (!scanText(uri, "self-test").some((h) => h.rule === "unvetted data URI")) {
        console.error("scan self-test: default-text data URI was not rejected.");
        process.exit(1);
      }
    }
    fs.mkdirSync(path.join(root, "work"), { recursive: true });
    const fixtureRoot = fs.mkdtempSync(path.join(root, "work", "scanner-self-test-"));
    const empty = path.join(fixtureRoot, "empty-dist");
    const partial = path.join(fixtureRoot, "partial-dist");
    fs.mkdirSync(empty);
    fs.mkdirSync(partial);
    fs.writeFileSync(path.join(partial, "only.js"), "const safe = true;");
    const emptyRed = scanDist(empty, { requireEntrypoints: true });
    const partialRed = scanDist(partial, { requireEntrypoints: true });
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    if (!emptyRed.hits.some((h) => h.rule === "scanner coverage" && h.snippet === "zero files inspected")) {
      console.error("scan self-test: empty dist was not rejected.");
      process.exit(1);
    }
    if (!partialRed.hits.some((h) => h.rule === "scanner coverage" && h.snippet === "missing index.html")) {
      console.error("scan self-test: missing expected entrypoints were not rejected.");
      process.exit(1);
    }
    console.log(`scan self-test: RED as expected (${red.length + hashedRed.length} planted hits caught, plus ${brandPlants.length} vaccine brands and makers, ${Object.keys(homagePlants).length} homage names and house-style marks, ${devicePlants.length} device brand names, three decoded executable MIME types, two rejected default-text data URI forms, and empty/missing-entrypoint coverage controls; four inert image/font MIME types stayed GREEN)`);
    process.exit(0);
  }
  const { files, hits } = scanDist(DIST, { requireEntrypoints: true });
  console.log(`scan: ${files.length} files inspected`);
  if (hits.length) { for (const h of hits) console.error(`  RED ${h.file} :: ${h.rule} :: ${h.snippet}`); process.exit(1); }
  console.log("scan: GREEN, no network reference, no banned name");
}
