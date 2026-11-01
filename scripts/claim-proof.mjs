import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { CLAIMS } from '../src/counter/claims.js'
import { TREES } from '../src/counter/trees/index.js'

export const root = fileURLToPath(new URL('../', import.meta.url))
export const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const claimBinding = (claim, uses, evidence) => hash({ claim, uses, evidence })
export function supportStatus(claim, uses, evidence, review) {
  if (!evidence?.passage?.trim()) return 'missing passage'
  if (!evidence.verified || evidence.url !== claim?.source?.url) return 'unverified passage'
  if (!review || !['approved', 'rejected'].includes(review.decision) || !review.reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedOn ?? '')) return 'draft, pending pharmacist review'
  return review.binding === claimBinding(claim, uses, evidence) ? review.decision : 'changed'
}

// Include every authored tree string, even ordinary dialogue and metadata, rather
// than trusting a fact detector to decide what a human reviewer gets to see.
export function inventory(trees = TREES) {
  const rows = []
  const visit = (value, location, claims = []) => {
    if (typeof value === 'string') rows.push({ location, text: value, claims })
    else if (Array.isArray(value)) value.forEach((item, i) => visit(item, `${location}[${i}]`, claims))
    else if (value && typeof value === 'object') {
      const refs = value.claims ?? claims
      for (const [key, item] of Object.entries(value)) if (key !== 'claims') visit(item, `${location}.${key}`, refs)
    }
  }
  visit(trees, 'trees')
  return rows.sort((a, b) => a.location.localeCompare(b.location))
}

export function reviewSheet() {
  const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/claims/passages.json'), 'utf8'))
  const historical = JSON.parse(fs.readFileSync(path.join(root, 'docs/claims/historical-bindings.json'), 'utf8'))
  const reviews = JSON.parse(fs.readFileSync(path.join(root, 'docs/claims/support-reviews.json'), 'utf8'))
  const surfaces = inventory()
  return Object.entries(CLAIMS).map(([id, claim]) => {
    const uses = surfaces.filter(row => row.claims.includes(id))
    const passage = evidence[id]
    return { id, claim, uses, evidence: passage, binding: claimBinding(claim, uses, passage), claimHash: hash(claim), passageHash: hash(passage?.passage), usesHash: hash(uses), historicalReview: { reviewedBy: claim.reviewedBy, reviewedOn: claim.reviewedOn, binding: historical[id], contentUnchanged: historical[id] === hash({ claim, uses }) }, review: reviews[id] ?? null, status: supportStatus(claim, uses, passage, reviews[id]), correctionNote: 'New passage-support review pending Kevin. Historical author stamp is preserved separately.' }
  })
}
