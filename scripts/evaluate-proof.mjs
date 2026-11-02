import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { factShaped } from './check-claims.mjs'
import { root, hash, inventory, reviewSheet } from './claim-proof.mjs'
import { TREES } from '../src/counter/trees/index.js'
import { outcomeOf, makeEngine } from '../src/counter/engine.js'
import { RUNGS } from '../src/counter/tiers.js'
import { walk } from '../tests/unit/helpers/tree-walk.js'
export const lines = Object.fromEntries(['dev', 'final'].map(name => [name, JSON.parse(fs.readFileSync(path.join(root, `evaluation/${name}.json`), 'utf8'))]))

export function gateReport(rows) {
  const score = classify => {
    const result = { tp: 0, fp: 0, fn: 0, tn: 0, errors: [] }
    for (const row of rows) {
      const prediction = Boolean(classify(row.text))
      const key = row.factual ? prediction ? 'tp' : 'fn' : prediction ? 'fp' : 'tn'
      result[key]++
      if (key === 'fp' || key === 'fn') result.errors.push({ id: row.id, rule: key === 'fp' ? 'false alarm' : 'missed factual line', text: row.text })
    }
    result.errors.sort((a, b) => a.id.localeCompare(b.id))
    return result
  }
  const actual = score(factShaped)
  // Deterministic source-family cluster bootstrap. Intervals describe this small
  // draft set only, not medical classification accuracy or human agreement.
  const families = [...new Set(rows.map(row => row.sourceFamily))].sort()
  let seed = 20261101
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
  const samples = Array.from({ length: 2000 }, () => {
    const sample = families.flatMap(() => {
      const selected = families[Math.floor(random() * families.length)]
      return rows.filter(row => row.sourceFamily === selected)
    })
    const r = gateReportCounts(sample)
    return { detection: r.tp / (r.tp + r.fn), falseAlarm: r.fp / (r.fp + r.tn) }
  })
  const interval = field => {
    const values = samples.map(row => row[field]).filter(Number.isFinite).sort((a, b) => a - b)
    return values.length ? [values[Math.floor(values.length * .025)], values[Math.floor(values.length * .975)]] : null
  }
  return { status: 'Fixed public draft benchmark, pending Kevin labels. Not blind or human-authored evidence.', rows: rows.length, factual: rows.filter(row => row.factual).length, ordinary: rows.filter(row => !row.factual).length, actual, controls: { allowAll: score(() => false), rejectAll: score(() => true) }, sourceFamilyBootstrap: { seed: 20261101, replicates: 2000, detection: interval('detection'), falseAlarm: interval('falseAlarm') } }
}
function gateReportCounts(rows) {
  const result = { tp: 0, fn: 0, fp: 0, tn: 0 }
  for (const row of rows) result[row.factual ? factShaped(row.text) ? 'tp' : 'fn' : factShaped(row.text) ? 'fp' : 'tn']++
  return result
}
export function rankingReport() {
  const alteredTrees = structuredClone(TREES)
  for (const tree of Object.values(alteredTrees)) for (const ending of Object.values(tree.endings)) ending.name = 'permuted display title'
  const alternate = makeEngine(alteredTrees, {})
  const metadataErrors = []
  const paths = Object.keys(TREES).sort().flatMap(patient => walk(patient).finished.map(run => {
    const { ending, tier } = outcomeOf(run)
    const changed = { ...run, taken: run.taken.map((_, i) => `masked-${i}`), transcript: [], claims: [], testLabel: 'permuted', provenance: 'hidden' }
    if (alternate.outcomeOf(changed).tier.rank !== tier.rank) metadataErrors.push({ id: `${patient}/${run.taken.join('/')}`, rule: 'metadata invariance' })
    return { id: `${patient}/${run.taken.join('/')}`, patient, rung: ending.rung, pushes: run.pushes, afterNo: run.pushedAfterNo, rank: tier.rank }
  }))
  const score = scorer => {
    const ranked = paths.map(row => ({ ...row, score: scorer(row) }))
    const errors = []
    for (const patient of Object.keys(TREES).sort()) {
      const runs = ranked.filter(row => row.patient === patient)
      const respectful = runs.filter(row => !row.pushes && ['door-open', 'thinking'].includes(row.rung))
      const minRespectful = Math.min(...respectful.map(row => row.score))
      for (const row of runs) {
        if (row.pushes && row.score >= minRespectful) errors.push({ id: row.id, rule: 'respectful refusal ordering' })
        if (row.afterNo && row.score !== 1) errors.push({ id: row.id, rule: 'pressure after no' })
      }
      if (new Set(runs.map(row => row.score)).size < 2) errors.push({ id: patient, rule: 'differentiation' })
    }
    errors.sort((a, b) => a.rule.localeCompare(b.rule) || a.id.localeCompare(b.id))
    return { paths: ranked.length, errors, passed: ranked.length - new Set(errors.filter(row => row.id.includes('/')).map(row => row.id)).size }
  }
  return { status: 'Exhaustive authored paths, not player observations', metadataInvariance: { paths: paths.length, errors: metadataErrors }, actual: score(row => row.rank), outcomeOnly: score(row => RUNGS.indexOf(row.rung) + 1), alwaysBottom: score(() => 1) }
}
export function generate(destinationRoot = path.join(root, 'docs/proof')) {
  const sheet = reviewSheet()
  const reviewed = sheet.filter(row => ['approved', 'rejected'].includes(row.status)).length
  const supported = sheet.filter(row => row.status === 'approved').length
  const report = { schemaVersion: 1, surfaces: { treeStrings: inventory().length, sourceStrings: JSON.parse(fs.readFileSync(path.join(root, 'docs/claims/all-source-surfaces.json'), 'utf8')).length, factualClassificationsReviewed: 0, totalFactualSurfaces: null, status: 'inclusive inventory, pending human factual-surface classification' }, frozenInputs: { runtime: hash(fs.readdirSync(path.join(root, 'src/counter'), { recursive: true }).filter(name => /\.(js|jsx|css)$/.test(name)).sort().map(name => [name, fs.readFileSync(path.join(root, 'src/counter', name), 'utf8')])), gate: hash(fs.readFileSync(path.join(root, 'scripts/check-claims.mjs'), 'utf8')), evaluation: hash(['scripts/evaluate-proof.mjs', 'scripts/claim-proof.mjs', 'scripts/inventory-surfaces.mjs'].map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')])), dev: hash(lines.dev), final: hash(lines.final) }, support: { total: sheet.length, reviewed, supported, supportRatio: reviewed ? supported / reviewed : null, volatileClaims: sheet.filter(row => row.claim.volatile).length, staleVolatileClaims: null, secondReviewer: false, status: `Kevin Madden, PharmD reviewed every claim on 2026-11-01. ${supported} approved on their exact content, ${sheet.length - reviewed} pending his review of a rewrite, new claim or reworded line.`, missingPassages: sheet.filter(row => !row.evidence.passage).map(row => row.id), changedDestinations: sheet.filter(row => row.evidence.url !== row.claim.source.url).map(row => row.id) }, gate: { dev: gateReport(lines.dev), final: gateReport(lines.final) }, ranking: rankingReport(), pilot: { plannedPlayers: 3, actualPlayers: 0, observations: [], status: 'pending actual players' } }
  const errors = [
    ...sheet.filter(row => row.status !== 'approved').map(row => ({ id: row.id, rule: 'unsupported fact', status: row.status })),
    ...report.ranking.actual.errors,
    ...report.gate.final.actual.errors,
  ]
  const order = ['unsupported fact', 'respectful refusal ordering', 'missing source', 'inaccessible choice']
  errors.sort((a, b) => (order.indexOf(a.rule) < 0 ? 99 : order.indexOf(a.rule)) - (order.indexOf(b.rule) < 0 ? 99 : order.indexOf(b.rule)) || a.id.localeCompare(b.id))
  const files = { 'report.json': report, 'review-sheet.json': sheet, 'surface-inventory.json': inventory(), 'errors.json': errors }
  const revision = hash(files).slice(0, 16)
  const dir = path.join(destinationRoot, revision)
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, data] of Object.entries(files)) {
    const content = JSON.stringify(data, null, 2) + '\n'
    const destination = path.join(dir, name)
    if (fs.existsSync(destination) && fs.readFileSync(destination, 'utf8') !== content) throw new Error(`Refusing to overwrite historical evidence ${destination}`)
    fs.writeFileSync(destination, content)
  }
  const gallery = `# Fixed-rule failure gallery\n\nDraft support findings first, then pressure ranking, missing sources, inaccessible choices, then other gate errors. Ties use stable IDs. No finding is omitted from [the full error list](errors.json). Pending support is not an established factual error.\n\n${errors.slice(0, 8).map(row => `- ${row.id}: ${row.rule}, ${row.status ?? 'see full error list'}`).join('\n')}\n`
  const destination = path.join(dir, 'GALLERY.md')
  if (fs.existsSync(destination) && fs.readFileSync(destination, 'utf8') !== gallery) throw new Error('Refusing to overwrite historical gallery')
  fs.writeFileSync(destination, gallery)
  return { revision, report }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(generate(), null, 2))
