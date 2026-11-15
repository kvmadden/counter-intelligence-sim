// Captures fresh CDC passages for claims drafted or rewritten after Kevin's 2026-11-01
// review. Network is used only here, by hand, never by the game or the tests. Each page
// is fetched with curl, hashed, split into the text blocks of <main> (h1 to h4, p, li,
// in document order) and the chosen blocks are written as a snapshot plus a
// passages.json entry. A passage is always whole blocks, quoted exactly.
// Run: node scripts/capture-cdc.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { JSDOM } from 'jsdom'
import { root } from './claim-proof.mjs'

// Each block is picked by the exact start of its text, or by its whole text when the
// entry ends with $, so a page edit fails loudly. Blocks are quoted in page order.
export const CAPTURES = {
  'flu-two-weeks': { url: 'https://www.cdc.gov/flu/vaccines/keyfacts.html', starts: ['It takes about two weeks after vaccination', 'You may be exposed to an influenza virus shortly before'] },
  'other-viruses': { url: 'https://www.cdc.gov/flu/about/coldflu.html', starts: ['Influenza (flu) and the common cold are both contagious', 'Colds and flu share many symptoms'] },
  'tdap-ten-years': { url: 'https://www.cdc.gov/vaccines/hcp/by-disease/dtap-tdap-td.html', starts: ['Diphtheria toxoid-, tetanus toxoid-, and acellular pertussis-containing vaccines help protect', 'Tetanus and diphtheria (Td) only vaccines', 'Adults who have never received Tdap', 'After receipt of Tdap'] },
  'recommendation-predicts': { url: 'https://www.cdc.gov/vaccines-adults/hcp/imz-standards/index.html', starts: ['The National Vaccine Advisory Committee developed the Standards', "A health care professional's recommendation is the strongest predictor"] },
  'flu-65-preferred': { url: 'https://www.cdc.gov/flu/highrisk/65over.htm', starts: ['CDC and ACIP preferentially recommend the use of higher dose flu vaccines (high-dose', 'The best way to protect against flu and its potentially serious complications'] },
  'shingles-same-visit': { url: 'https://www.cdc.gov/shingles/vaccines/index.html', starts: ['Recombinant zoster (shingles) vaccine, called Shingrix, can prevent shingles.'] },
  'same-arm-ok': { url: 'https://www.cdc.gov/vaccines/hcp/imz-best-practices/vaccine-administration.html', starts: ['If multiple vaccines are administered at a single visit', 'For infants and younger children, if more than 2 vaccines are injected in a single limb'] },
  'pneumo-50-plus': { url: 'https://www.cdc.gov/pneumococcal/vaccines/index.html', starts: ['Pneumococcal disease is common in young children', 'CDC recommends pneumococcal vaccination for$', 'All adults 50 years or older$'] },
}

export const EXTRACTOR = 'jsdom: main h1, main h2, main h3, main h4, main p, main li, text with whitespace collapsed, indexed in document order'
const BANNED = /covid|sars/i
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
const today = () => new Date().toISOString().slice(0, 10)

function fetchPage(url) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cdc-')), 'page.html')
  const run = spawnSync('curl', ['-sSL', '--max-time', '60', '-o', file, '-w', '%{http_code} %{url_effective}', url], { encoding: 'utf8' })
  if (run.status !== 0) throw new Error(`curl failed for ${url}: ${run.stderr}`)
  const [status, resolved] = run.stdout.trim().split(' ')
  const html = fs.readFileSync(file)
  fs.rmSync(path.dirname(file), { recursive: true, force: true })
  return { status: Number(status), resolved, html }
}

export function blocks(html) {
  const doc = new JSDOM(html).window.document
  const rows = [...doc.querySelectorAll('main h1, main h2, main h3, main h4, main p, main li')].map((el, index) => ({ index, text: el.textContent.replace(/\s+/g, ' ').trim() }))
  const dates = [...doc.querySelectorAll('meta[property^="cdc:last_"], meta[property="cdc:first_published"]')].map(meta => ({ name: meta.getAttribute('property'), content: meta.getAttribute('content') }))
  return { rows, dates }
}

function capture() {
  const passages = JSON.parse(fs.readFileSync(path.join(root, 'docs/claims/passages.json'), 'utf8'))
  const pages = new Map()
  for (const [claim, spec] of Object.entries(CAPTURES)) {
    if (!pages.has(spec.url)) {
      const page = fetchPage(spec.url)
      if (page.status !== 200 || page.resolved !== spec.url) throw new Error(`${spec.url} answered ${page.status} at ${page.resolved}`)
      pages.set(spec.url, { ...page, ...blocks(page.html), picked: [] })
    }
    const page = pages.get(spec.url)
    const paragraphs = spec.starts.map(start => {
      const hit = start.endsWith('$') ? page.rows.find(row => row.text === start.slice(0, -1)) : page.rows.find(row => row.text.startsWith(start))
      if (!hit) throw new Error(`${claim}: no block on ${spec.url} starts with "${start}"`)
      if (BANNED.test(hit.text)) throw new Error(`${claim}: block ${hit.index} mentions COVID-19 or SARS, which Kevin ruled out`)
      return hit
    }).sort((a, b) => a.index - b.index)
    page.picked.push(...paragraphs)
    const snapshot = `docs/claims/sources/${sha(spec.url).slice(0, 12)}-r2.json`
    passages[claim] = {
      url: spec.url,
      originalUrl: spec.url,
      passage: paragraphs.map(row => row.text).join('\n'),
      paragraphs,
      verified: true,
      retrievedOn: today(),
      sourceDates: page.dates,
      snapshot,
      htmlSha256: sha(page.html),
      rights: 'CDC federal text, public domain in the US. Excerpt-level rights review pending.',
      rightsUrl: 'https://www.cdc.gov/other/agencymaterials.html',
      rightsDecision: 'draft, pending excerpt and third-party notice review',
      correctionNote: 'Drafted after Kevin\'s 2026-11-01 review. Pending his second look.',
    }
  }
  for (const [url, page] of pages) {
    const picked = [...new Map(page.picked.map(row => [row.index, row])).values()].sort((a, b) => a.index - b.index)
    const file = path.join(root, `docs/claims/sources/${sha(url).slice(0, 12)}-r2.json`)
    fs.writeFileSync(file, JSON.stringify({ url, resolvedUrl: page.resolved, retrievedOn: today(), httpStatus: page.status, htmlSha256: sha(page.html), extractor: EXTRACTOR, paragraphs: picked, dates: page.dates, notices: 'No third-party attribution found in selected narrative text. Human rights check pending.' }, null, 2) + '\n')
  }
  fs.writeFileSync(path.join(root, 'docs/claims/passages.json'), JSON.stringify(passages, null, 2) + '\n')
  console.log(`capture-cdc: ${Object.keys(CAPTURES).length} passages from ${pages.size} pages, retrieved ${today()}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) capture()
