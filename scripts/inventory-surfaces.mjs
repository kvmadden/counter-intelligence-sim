import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'
import { root, hash } from './claim-proof.mjs'

// An inclusive review queue for UI, briefing, debrief, patient and scene strings.
// Code strings are included too. No heuristic excludes a potentially factual line.
export function sourceSurfaces() {
  const rows = []
  const folder = path.join(root, 'src/counter')
  for (const relative of fs.readdirSync(folder, { recursive: true }).filter(name => /\.(js|jsx)$/.test(name)).sort()) {
    const code = fs.readFileSync(path.join(folder, relative), 'utf8')
    const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] })
    const visit = node => {
      if (!node || typeof node !== 'object') return
      if (['StringLiteral', 'JSXText', 'TemplateElement'].includes(node.type)) {
        const text = node.type === 'TemplateElement' ? node.value.cooked : node.value
        if (text?.trim()) rows.push({ file: `src/counter/${relative}`, line: node.loc.start.line, text: text.trim(), hash: hash(text), decision: 'pending factual-surface classification by Kevin' })
      }
      for (const [key, value] of Object.entries(node)) {
        if (['loc', 'start', 'end', 'extra'].includes(key)) continue
        if (Array.isArray(value)) value.forEach(visit)
        else if (value && typeof value === 'object') visit(value)
      }
    }
    visit(ast)
  }
  return rows
}
if (process.argv[1]?.endsWith('inventory-surfaces.mjs')) console.log(JSON.stringify(sourceSurfaces(), null, 2))
