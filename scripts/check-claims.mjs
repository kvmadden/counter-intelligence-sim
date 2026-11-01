// The claims gate. Kevin, 2026-09-15: facts stay at conversation level and must be
// accurate, from the CDC or other established public-health sources, and each one
// carries his review stamp. This runs first in `npm run build` and in the gate, and it
// fails closed. `--self-test` proves it RED on planted problems before a GREEN counts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLAIMS } from "../src/counter/claims.js";
import { TREES } from "../src/counter/trees/index.js";
import { hash, inventory, supportStatus } from "./claim-proof.mjs"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Public-health publishers: any US government host, plus a short list of others.
const OTHER_HOSTS = ["www.who.int", "who.int", "www.nfid.org", "www.immunize.org"];
const trustedHost = (host) => /(^|\.)[a-z0-9-]+\.gov$/.test(host) || OTHER_HOSTS.includes(host);

// Agencies may be named only in a staff line that cites one of their pages.
export const AGENCY = /\b(CDC|ACIP|FDA|HHS|NIH)\b|World Health Organization/;

// A staff line "reads as a public-health fact" when it pairs a health word with a
// fact marker, or states a duration around a procedure. A backstop for authors who
// forget to cite, not a replacement for citing.
const HEALTH = /\b(shots?|vaccin\w*|flu|influenza|covid\S*|doses?|boosters?|side effects?|immun\w*|protect\w*|fever|faint\w*|antibod\w*)\b/i;
const FACT = /\bcan(?:'|’|no)?t\b|\bcannot\b|\bevery (?:year|season)\b|\bpeaks?\b|\bcommon\b|\busually\b|\bsafe\b|\bworks?\b|\bcovered\b|\bno cost\b|%|\bpercent\b/i;
const DURATION = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty)\s+(?:minutes?|hours?|days?|weeks?|months?|years?)\b/i;
const PROCEDURE = /\b(sit|wait|after|kick in|last)\b/i;
export const factShaped = (text) => (HEALTH.test(text) && (FACT.test(text) || DURATION.test(text))) || (DURATION.test(text) && PROCEDURE.test(text));

const textsOf = (value) => (Array.isArray(value) ? value.map((variant) => variant.text) : value == null ? [] : [value]);
const choicesOf = (tree) => [...Object.values(tree.nodes).flatMap((node) => node.choices ?? []), ...(tree.closes ?? [])];

export function checkLedger(claims = CLAIMS, trees = TREES, passageOverride = null) {
  const problems = [];
  const proofFile = name => {
    try { return JSON.parse(fs.readFileSync(new URL(`../docs/claims/${name}`, import.meta.url), 'utf8')) }
    catch { return {} }
  }
  const historical = proofFile('historical-bindings.json')
  const reviews = proofFile('support-reviews.json')
  const passages = passageOverride ?? proofFile('passages.json')
  const surfaces = inventory(trees)
  const add = (rule, where, detail) => problems.push({ rule, where, detail });

  for (const [id, claim] of Object.entries(claims)) {
    const where = `claim ${id}`;
    const source = claim?.source ?? {};
    if (!claim?.text?.trim()) add("claim text", where, "the claim has no text");
    if (!source.org?.trim() || !source.title?.trim()) add("unsourced claim", where, "the source needs an organisation and a page title");
    let url = null;
    try { url = new URL(source.url); } catch { url = null; }
    if (!url || url.protocol !== "https:" || !trustedHost(url.hostname)) add("untrusted source", where, `the source must be an https page on a public-health host, got ${source.url}`);
    if (!ISO_DATE.test(source.accessed ?? "")) add("unsourced claim", where, "the source needs the date it was accessed (YYYY-MM-DD)");
    if (!claim?.reviewedBy?.trim?.() || !ISO_DATE.test(claim?.reviewedOn ?? "")) add("unreviewed claim", where, "needs Kevin's review stamp (reviewedBy and reviewedOn)");
    else if (claim.reviewedOn < source.accessed) add("unreviewed claim", where, "the stamp predates the source it reviewed");
    if (!passages[id]?.passage?.trim()) add('missing supporting passage', where, 'needs a captured public source passage, human support decision remains separate')
    const uses = surfaces.filter(row => row.claims.includes(id))
    // Self-tests may replace reviewer metadata in memory. Content still has to
    // match the historical public snapshot or an actual new bound approval.
    const authorStamp = CLAIMS[id]
    const historicalClaim = { ...claim, reviewedBy: authorStamp?.reviewedBy, reviewedOn: authorStamp?.reviewedOn }
    const unchanged = historical[id] === hash({ claim: historicalClaim, uses })
    const newlyApproved = supportStatus(claim, uses, passages[id], reviews[id]) === 'approved'
    if (!unchanged && !newlyApproved) add('unreviewed claim', where, 'historical content binding is missing or changed, needs a new bound pharmacist decision')
  }

  for (const tree of Object.values(trees)) {
    for (const choice of choicesOf(tree)) {
      const where = `${tree.id} ${choice.id}`;
      const cited = choice.claims ?? [];
      for (const id of cited) if (!claims[id]) add("missing claim", where, `cites "${id}", which the ledger does not hold`);
      for (const text of textsOf(choice.label)) {
        if (factShaped(text) && cited.length === 0) add("uncited fact", where, `"${text}" reads as a public-health fact but cites no claim`);
        const agency = text.match(AGENCY);
        if (agency && !cited.some((id) => claims[id]?.source?.org?.includes(agency[1] ?? agency[0]))) add("uncited agency", where, `names ${agency[0]} without citing one of its pages`);
      }
      for (const text of textsOf(choice.reply)) {
        const agency = text.match(AGENCY);
        if (agency) add("uncited agency", where, `the patient names ${agency[0]}, and agencies belong only in cited staff lines`);
      }
    }
    const loose = [
      tree.briefing, tree.equipment,
      ...Object.values(tree.nodes).flatMap((node) => textsOf(node.line)),
      ...textsOf(tree.timeout?.line),
      ...Object.values(tree.endings).flatMap((ending) => [ending.name, ending.debrief, ending.huddle]),
      ...Object.values(tree.shared ?? {}),
    ];
    for (const text of loose.filter(Boolean)) {
      const agency = text.match(AGENCY);
      if (agency) add("uncited agency", tree.id, `"${text}" names ${agency[0]} outside a cited staff line`);
    }
  }
  return problems;
}

export const volatileClaims = (claims = CLAIMS) => Object.keys(claims).filter((id) => claims[id].volatile);
export function unusedClaims(claims = CLAIMS, trees = TREES) {
  const cited = new Set(Object.values(trees).flatMap(choicesOf).flatMap((choice) => choice.claims ?? []));
  return Object.keys(claims).filter((id) => !cited.has(id));
}

// Plant each problem into a copy of the ledger that is stamped in memory only, so the
// self-test proves every rule RED whether or not Kevin has stamped the real claims yet.
export function selfTest() {
  const stamped = () => {
    const claims = structuredClone(CLAIMS);
    for (const claim of Object.values(claims)) Object.assign(claim, { reviewedBy: "self-test", reviewedOn: "2999-12-31" });
    return { claims, trees: structuredClone(TREES) };
  };
  const firstClaim = Object.keys(CLAIMS)[0];
  const firstChoice = (trees) => choicesOf(Object.values(trees)[0])[0];
  const baseline = checkLedger(stamped().claims, stamped().trees);
  const cases = [
    ["unreviewed claim", ({ claims }) => { claims[firstClaim].reviewedBy = null; }],
    ["unsourced claim", ({ claims }) => { claims[firstClaim].source.org = ""; }],
    ["untrusted source", ({ claims }) => { claims[firstClaim].source.url = "https://example.com/flu-facts"; }],
    ["missing claim", ({ trees }) => { firstChoice(trees).claims = ["no-such-claim"]; }],
    ["uncited fact", ({ trees }) => { Object.assign(firstChoice(trees), { label: "It takes about two weeks to kick in.", claims: [] }); }],
    ["uncited agency", ({ trees }) => { Object.assign(firstChoice(trees), { label: "The CDC says hello.", claims: [] }); }],
  ];
  const missed = cases.filter(([rule, mutate]) => {
    const copy = stamped();
    mutate(copy);
    return !checkLedger(copy.claims, copy.trees).some((problem) => problem.rule === rule);
  }).map(([rule]) => rule);
  return { baseline, missed, planted: cases.length };
}

const realpath = (file) => { try { return fs.realpathSync(file); } catch { return path.resolve(file); } };
const invokedDirectly = process.argv[1] && realpath(process.argv[1]) === realpath(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  if (process.argv.includes("--self-test")) {
    const { baseline, missed, planted } = selfTest();
    if (baseline.length) { for (const p of baseline) console.error(`  RED ${p.where} :: ${p.rule} :: ${p.detail}`); console.error("claims self-test: the stamped baseline is not clean, so a GREEN would mean nothing."); process.exit(1); }
    if (missed.length) { console.error(`claims self-test: planted problems were NOT caught: ${missed.join(", ")}. The gate is blind.`); process.exit(1); }
    console.log(`claims self-test: RED as expected (${planted} planted problems caught, and the stamped baseline is clean)`);
    process.exit(0);
  }
  const problems = checkLedger();
  const lines = Object.values(TREES).flatMap(choicesOf).length;
  console.log(`claims: ${Object.keys(CLAIMS).length} claims, ${Object.keys(TREES).length} trees, ${lines} staff lines checked`);
  for (const id of volatileClaims()) console.warn(`  NOTE ${id} is marked volatile. Re-check its source before each season.`);
  for (const id of unusedClaims()) console.warn(`  NOTE ${id} is not cited by any tree.`);
  if (problems.length) { for (const p of problems) console.error(`  RED ${p.where} :: ${p.rule} :: ${p.detail}`); process.exit(1); }
  console.log("claims: GREEN, historical source and stamp metadata checked. New passage-support review pending.");
}
