import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { expect, it } from 'vitest'
import { CLAIMS } from '../../src/counter/claims.js'
import { debriefFor } from '../../src/counter/engine.js'
import { walk } from './helpers/tree-walk.js'

it('carries explicit claim source destinations into the debrief', () => {
  const run = walk('jordan').finished.find(run => run.claims.length)
  const source = debriefFor(run).sources[0]
  expect(source.url).toBe(CLAIMS[source.id].source.url)
  expect(source.reviewed).toBe(false)
})

it('provides content-bound support review and separate evaluation contracts', async () => {
  expect(fs.existsSync('scripts/claim-proof.mjs'), 'support review implementation').toBe(true)
  const { supportStatus, claimBinding, inventory } = await import('../../scripts/claim-proof.mjs')
  const id = Object.keys(CLAIMS)[0]
  const uses = inventory().filter(row => row.claims.includes(id))
  const claim = CLAIMS[id]
  const evidence = { passage: 'Flu vaccines cannot cause flu illness.', verified: true, url: claim.source.url }
  const review = { decision: 'approved', reviewedBy: 'test fixture', reviewedOn: '2026-11-01', binding: claimBinding(claim, uses, evidence) }
  expect(supportStatus(claim, uses, evidence, review)).toBe('approved')
  expect(supportStatus({ ...claim, text: 'Changed fact' }, uses, evidence, review)).toBe('changed')
  expect(supportStatus(claim, uses, { ...evidence, passage: '' }, review)).toBe('missing passage')
  const unrelated = { ...evidence, url: 'https://www.cdc.gov/shingles/about/index.html' }
  expect(supportStatus(claim, uses, unrelated, { ...review, binding: claimBinding(claim, uses, unrelated) })).not.toBe('approved')
  expect(supportStatus(claim, uses, evidence, null)).toBe('draft, pending pharmacist review')
})

it('permits source literals but rejects automatic network and remote embeds', async () => {
  const { scanText } = await import('../../scripts/scan.mjs')
  const url = CLAIMS['flu-two-weeks'].source.url
  expect(scanText(JSON.stringify({ url }))).toEqual([])
  for (const input of [`fetch('${url}')`, `image.src = '${url}'`, `new Audio('${url}')`, `navigator.sendBeacon('${url}')`, `<img src="${url}">`, `<iframe src="${url}">`, `a{background:url(${url})}`, `<a href="${url}" ping="${url}">CDC</a>`]) expect(scanText(input).length, input).toBeGreaterThan(0)
})

it('exposes separate gate and ranking reports whose extreme controls fail opposite objectives', async () => {
  expect(fs.existsSync('scripts/evaluate-proof.mjs'), 'separate proof reports').toBe(true)
  const { gateReport, rankingReport, lines } = await import('../../scripts/evaluate-proof.mjs')
  expect(lines.dev).toHaveLength(12)
  expect(lines.final).toHaveLength(20)
  const families = new Set(lines.dev.map(row => row.family))
  const developmentSources = new Set(lines.dev.map(row => row.sourceUrl))
  for (const row of lines.final) expect(developmentSources.has(row.sourceUrl)).toBe(false)
  for (const row of lines.final) expect(families.has(row.family)).toBe(false)
  const report = gateReport(lines.final)
  expect(report.controls.allowAll.fn).toBe(10)
  expect(report.controls.rejectAll.fp).toBe(10)
  const ranks = rankingReport()
  expect(ranks.actual.errors).toEqual([])
  expect(ranks.metadataInvariance.errors).toEqual([])
  expect(ranks.outcomeOnly.errors.some(row => row.rule === 'respectful refusal ordering')).toBe(true)
  expect(ranks.alwaysBottom.errors.some(row => row.rule === 'differentiation')).toBe(true)
})

it('isolates final lines from runtime and makes labels and ordering irrelevant', async () => {
  const { lines, gateReport } = await import('../../scripts/evaluate-proof.mjs')
  const { factShaped } = await import('../../scripts/check-claims.mjs')
  const runtime = fs.readdirSync('src', { recursive: true }).filter(name => /\.(js|jsx)$/.test(name)).map(name => fs.readFileSync(`src/${name}`, 'utf8')).join('\n')
  for (const row of lines.final) {
    expect(runtime).not.toContain(row.text)
    expect(runtime).not.toContain(row.id)
    const relabeled = { ...row, id: 'permuted', sourceFamily: 'hidden', factual: !row.factual }
    expect(factShaped(relabeled.text)).toBe(factShaped(row.text))
  }
  expect(gateReport([...lines.final].reverse()).actual).toEqual(gateReport(lines.final).actual)
})

it('binds approval to passage and dialogue content and preserves offline report history', async () => {
  const { generate } = await import('../../scripts/evaluate-proof.mjs')
  const { claimBinding, supportStatus, inventory, reviewSheet } = await import('../../scripts/claim-proof.mjs')
  const sheet = reviewSheet()
  expect(sheet).toHaveLength(24)
  expect(sheet.every(row => row.historicalReview.contentUnchanged)).toBe(true)
  for (const row of sheet) expect(row.status).not.toBe('approved')
  const row = sheet.find(row => row.evidence.url === row.claim.source.url)
  const review = { decision: 'approved', reviewedBy: 'fixture', reviewedOn: '2026-11-01', binding: claimBinding(row.claim, row.uses, row.evidence) }
  expect(supportStatus(row.claim, [...row.uses, { text: 'new line' }], row.evidence, review)).toBe('changed')
  expect(supportStatus(row.claim, row.uses, { ...row.evidence, passage: 'Unrelated CDC passage' }, review)).toBe('changed')
  expect(inventory().length).toBeGreaterThan(500)
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-report-'))
  try {
    const first = generate(fixture)
    const file = path.join(fixture, first.revision, 'report.json')
    const before = fs.readFileSync(file, 'utf8')
    expect(generate(fixture).revision).toBe(first.revision)
    expect(fs.readFileSync(file, 'utf8')).toBe(before)
    const gallery = path.join(fixture, first.revision, 'GALLERY.md')
    fs.writeFileSync(gallery, 'historical gallery sentinel')
    expect(() => generate(fixture)).toThrow('Refusing to overwrite historical gallery')
    expect(fs.readFileSync(gallery, 'utf8')).toBe('historical gallery sentinel')
    fs.writeFileSync(file, 'historical report sentinel')
    expect(() => generate(fixture)).toThrow('Refusing to overwrite historical evidence')
    expect(fs.readFileSync(file, 'utf8')).toBe('historical report sentinel')
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true })
  }
})

it('ties exact captured passages to source snapshots and keeps rights decisions pending', async () => {
  const { reviewSheet } = await import('../../scripts/claim-proof.mjs')
  for (const row of reviewSheet()) {
    const snapshot = JSON.parse(fs.readFileSync(row.evidence.snapshot, 'utf8'))
    expect(snapshot.htmlSha256).toBe(row.evidence.htmlSha256)
    expect(snapshot.retrievedOn).toBe('2026-11-01')
    for (const paragraph of row.evidence.paragraphs) expect(snapshot.paragraphs).toContainEqual(paragraph)
    expect(row.evidence.passage).toBe(row.evidence.paragraphs.map(row => row.text).join('\n'))
    expect(row.evidence.rightsDecision).toContain('pending')
  }
})

it('keeps the inclusive UI surface export synchronized with source', async () => {
  const { sourceSurfaces } = await import('../../scripts/inventory-surfaces.mjs')
  const { hash } = await import('../../scripts/claim-proof.mjs')
  expect(hash(sourceSurfaces())).toBe(hash(JSON.parse(fs.readFileSync('docs/claims/all-source-surfaces.json', 'utf8'))))
})

it('rejects a historical stamp after claim or cited dialogue content changes', async () => {
  const { checkLedger } = await import('../../scripts/check-claims.mjs')
  const { TREES } = await import('../../src/counter/trees/index.js')
  const changed = structuredClone(CLAIMS)
  changed['flu-two-weeks'].text = 'Protection develops instantly.'
  expect(checkLedger(changed).some(row => row.rule === 'unreviewed claim' && row.where === 'claim flu-two-weeks')).toBe(true)
  const trees = structuredClone(TREES)
  const choice = Object.values(trees.jordan.nodes).flatMap(node => node.choices).find(row => row.claims?.includes('flu-two-weeks'))
  choice.label = 'A newly authored factual line.'
  expect(checkLedger(CLAIMS, trees).some(row => row.rule === 'unreviewed claim' && row.where === 'claim flu-two-weeks')).toBe(true)
})

it('fails the build ledger check when a supporting passage is missing', async () => {
  const { checkLedger } = await import('../../scripts/check-claims.mjs')
  const passages = JSON.parse(fs.readFileSync('docs/claims/passages.json', 'utf8'))
  passages['flu-two-weeks'].passage = ''
  expect(checkLedger(CLAIMS, undefined, passages).some(row => row.rule === 'missing supporting passage')).toBe(true)
})
