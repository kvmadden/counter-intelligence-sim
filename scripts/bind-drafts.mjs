// Binds named drafts in docs/claims/pending-drafts.json to their current claim text,
// dialogue uses and CDC passage. Run it by hand after drafting, naming each id:
//   node scripts/bind-drafts.mjs flu-two-weeks tdap-ten-years
// A bound draft ships marked pending. Editing it afterward reads `changed` and fails
// the build until it is bound again on purpose. This never records an approval.
import fs from 'node:fs'
import path from 'node:path'
import { root, reviewSheet } from './claim-proof.mjs'

const file = path.join(root, 'docs/claims/pending-drafts.json')
const drafts = JSON.parse(fs.readFileSync(file, 'utf8'))
const ids = process.argv.slice(2)
if (!ids.length) throw new Error('Name the draft ids to bind')
const sheet = new Map(reviewSheet().map(row => [row.id, row]))
for (const id of ids) {
  if (!drafts[id]) throw new Error(`${id} has no entry in pending-drafts.json`)
  if (!sheet.has(id)) throw new Error(`${id} is not in the claims ledger`)
  drafts[id].binding = sheet.get(id).binding
}
fs.writeFileSync(file, JSON.stringify(drafts, null, 2) + '\n')
console.log(`bind-drafts: bound ${ids.join(', ')}`)
