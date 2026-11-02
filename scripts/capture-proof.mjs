import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { chromium, expect } from '@playwright/test'
import { hash, root } from './claim-proof.mjs'

const evidence = process.env.SHOWCASE_EVIDENCE
if (!evidence) throw new Error('Set SHOWCASE_EVIDENCE to the registry evidence home')
const media = path.join(root, 'docs/media')
fs.mkdirSync(media, { recursive: true })
fs.mkdirSync(path.join(evidence, 'frames'), { recursive: true })
const browser = await chromium.launch({ headless: process.env.SHOWCASE_HEADLESS === '1' })
const records = []
const files = []
let frame = 0
try {
  for (const theme of ['light', 'dark']) for (const [width, height] of [[1440, 900], [430, 932], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: 1 })
    const requests = []
    page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:')) requests.push(request.url()) })
    const shot = async name => {
      const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, controls: [...document.querySelectorAll('button:not(:disabled),a[href]')].filter(el => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)
      }).map(el => el.textContent.trim()) }))
      records.push({ name, theme, width, height, ...geometry })
      expect(geometry).toEqual({ overflow: false, controls: [] })
      const file = `${name}-${theme}-${width}x${height}.png`
      await page.screenshot({ path: path.join(media, file) })
      files.push({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(media, file))).digest('hex') })
      if (theme === 'light' && width === 390) await page.screenshot({ path: path.join(evidence, 'frames', `${String(frame++).padStart(2, '0')}.png`) })
    }
    const activate = async locator => { await locator.focus(); await page.keyboard.press('Enter') }
    const move = async (family, label) => {
      await activate(page.getByRole('button', { name: family, exact: true }))
      await activate(page.getByRole('button', { name: label, exact: true }))
    }
    await page.goto(process.env.SHOWCASE_URL || 'http://127.0.0.1:4198')
    await shot('select')
    await activate(page.getByRole('button', { name: /Jordan/ }))
    await shot('dossier')
    await activate(page.getByRole('button', { name: /Mission brief/i }))
    await shot('briefing')
    await activate(page.getByRole('button', { name: 'Accept', exact: true }))
    await expect(page.locator('[data-scene="webgl"][data-camera="settled"]')).toBeVisible()
    await shot('conversation')
    await move('Offer', "Not long. Want your flu shot while you're here?")
    await shot('hesitant')
    await move('Offer', "We'd have you sit about fifteen minutes after. Next 14 instead?")
    await shot('fact')
    await move('Close', "No pressure. Here's your bag. We're here all season.")
    await shot('status')
    await activate(page.getByRole('button', { name: 'Continue', exact: true }))
    await shot('debrief')
    await activate(page.getByRole('tab', { name: 'Sources', exact: true }))
    const anchor = page.locator('a[data-claim-id="sit-after"]')
    await expect(anchor).toHaveAttribute('href', 'https://www.cdc.gov/vaccines/hcp/imz-best-practices/preventing-managing-adverse-reactions.html')
    await anchor.focus()
    await expect(anchor).toBeFocused()
    await shot('sources')
    fs.writeFileSync(path.join(evidence, `sources-${theme}-${width}.yaml`), await page.getByRole('main').ariaSnapshot())
    expect(requests).toEqual([])
    await page.close()
  }
} finally { await browser.close() }
fs.writeFileSync(path.join(evidence, 'geometry.json'), JSON.stringify(records, null, 2) + '\n')
fs.writeFileSync(path.join(media, 'manifest.json'), JSON.stringify({ revision: 'candidate on public origin/main ef6e5ef', contentHash: hash(fs.readdirSync(path.join(root, 'src/counter'), { recursive: true }).filter(name => /\.(js|jsx|css)$/.test(name)).sort().map(name => [name, fs.readFileSync(path.join(root, 'src/counter', name), 'utf8')])), reducedMotion: true, keyboard: true, automatedCapture: true, humanPilot: false, files }, null, 2) + '\n')
console.log(`Captured ${records.length} public-candidate screen states, zero automatic remote requests`)
