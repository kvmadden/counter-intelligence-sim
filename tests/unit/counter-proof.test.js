import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLAIMS } from '../../src/counter/claims.js'
import { CLAIM_STATUS } from '../../src/counter/claim-status.js'
import { debriefFor } from '../../src/counter/engine.js'
import { walk } from './helpers/tree-walk.js'

it('carries explicit claim source destinations into the debrief', () => {
  const run = walk('jordan').finished.find(run => run.claims.length)
  const source = debriefFor(run).sources[0]
  expect(source.url).toBe(CLAIMS[source.id].source.url)
  expect(source.reviewed).toBe(CLAIM_STATUS[source.id].status === 'approved')
  expect(source.review).toBe(CLAIM_STATUS[source.id])
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
  expect(sheet).toHaveLength(Object.keys(CLAIMS).length)
  const { isPendingDraft } = await import('../../scripts/claim-proof.mjs')
  for (const row of sheet) {
    // Every claim is either approved by Kevin on its exact content, or a bound draft
    // that ships marked pending. Nothing is silently changed.
    expect(row.status === 'approved' || isPendingDraft(row.status), `${row.id}: ${row.status}`).toBe(true)
    if (row.status === 'approved') expect(row.historicalReview.contentUnchanged, row.id).toBe(true)
    if (row.status === 'approved') expect(row.review).toMatchObject({ decision: 'approved', reviewedBy: 'Kevin Madden, PharmD', reviewedOn: '2026-11-01', binding: row.binding })
  }
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

// Kevin Madden, PharmD reviewed every claim on 2026-11-01. These hold his record to
// the content it covers, keep drafts pending, and keep the topic he ruled out away.
describe('the 2026-11-01 pharmacist review', () => {
  const read = name => JSON.parse(fs.readFileSync(`docs/claims/${name}`, 'utf8'))
  const reviews = read('support-reviews.json')
  const drafts = read('pending-drafts.json')

  it('records all 24 decisions with reviewer, date and notes', () => {
    expect(Object.keys(reviews)).toHaveLength(24)
    for (const [id, review] of Object.entries(reviews)) {
      expect(review, id).toMatchObject({ reviewedBy: 'Kevin Madden, PharmD', reviewedOn: '2026-11-01' })
      expect(['approved', 'approved with edit', 'flagged', 'removed'], id).toContain(review.decision)
      expect(review.notes?.trim(), id).toBeTruthy()
      expect(review.binding, id).toMatch(/^[0-9a-f]{64}$/)
    }
    const by = decision => Object.keys(reviews).filter(id => reviews[id].decision === decision).sort()
    expect(by('approved')).toHaveLength(16)
    expect(by('approved with edit')).toEqual(['other-viruses'])
    expect(by('flagged')).toEqual(['flu-65-preferred', 'flu-two-weeks', 'recommendation-predicts', 'shingles-same-visit', 'tdap-ten-years'])
    for (const id of by('removed')) expect(CLAIMS[id], id).toBeUndefined()
  })

  it('keeps every flagged, edited or new claim pending, bound, freshly sourced and unstamped', async () => {
    const { reviewSheet } = await import('../../scripts/claim-proof.mjs')
    const sheet = new Map(reviewSheet().map(row => [row.id, row]))
    const rewrites = Object.keys(reviews).filter(id => ['flagged', 'approved with edit'].includes(reviews[id].decision))
    for (const id of rewrites) expect(drafts[id], `${id} needs a bound draft`).toBeTruthy()
    for (const [id, draft] of Object.entries(drafts)) {
      const row = sheet.get(id)
      expect(row.status, id).not.toBe('approved')
      expect(CLAIM_STATUS[id].label, id).toBe('Pharmacist review pending')
      expect(draft.binding, id).toBe(row.binding)
      if (['rewrite', 'new'].includes(draft.kind)) {
        expect(CLAIMS[id].reviewedBy, `${id} must wait for Kevin's own stamp`).toBeUndefined()
        expect(row.evidence.retrievedOn, id).toBe('2026-11-01')
        expect(row.evidence.url, id).toBe(CLAIMS[id].source.url)
      }
    }
  })

  it('fails the gate when a bound draft or an approved claim is edited afterward', async () => {
    const { checkLedger } = await import('../../scripts/check-claims.mjs')
    for (const id of ['flu-two-weeks', 'flu-cannot-cause-flu']) {
      const changed = structuredClone(CLAIMS)
      changed[id].text = `${changed[id].text} Edited after review.`
      expect(checkLedger(changed).some(row => row.rule === 'unreviewed claim' && row.where === `claim ${id}`), id).toBe(true)
    }
  })

  it('keeps the generated debrief status module in sync with the review files', async () => {
    const { statusModule } = await import('../../scripts/claim-sheet.mjs')
    expect(fs.readFileSync('src/counter/claim-status.js', 'utf8')).toBe(statusModule())
  })

  it('ships no COVID-19 or SARS content in dialogue, claims, quotes, sources or benchmark lines', async () => {
    const { inventory } = await import('../../scripts/claim-proof.mjs')
    const banned = /covid|sars/i
    for (const row of inventory()) expect(row.text, row.location).not.toMatch(banned)
    for (const [id, claim] of Object.entries(CLAIMS)) expect(JSON.stringify(claim), id).not.toMatch(banned)
    expect(fs.readFileSync('docs/claims/passages.json', 'utf8')).not.toMatch(banned)
    for (const file of fs.readdirSync('docs/claims/sources')) expect(fs.readFileSync(`docs/claims/sources/${file}`, 'utf8'), file).not.toMatch(banned)
    for (const set of ['dev', 'final']) expect(fs.readFileSync(`evaluation/${set}.json`, 'utf8'), set).not.toMatch(banned)
    const runtime = fs.readdirSync('src', { recursive: true }).filter(name => /\.(js|jsx|css)$/.test(name))
    for (const name of runtime) expect(fs.readFileSync(`src/${name}`, 'utf8'), name).not.toMatch(banned)
  })
})
