/**
 * Cleans the raw pasted questions JSON (which has multiple stray '[' characters
 * separating segments) into a single valid flat array, then writes it to
 * src/data/questions.json.
 *
 * Usage:  node scripts/build-questions.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = resolve(__dir, '..')

const raw = readFileSync(resolve(root, 'scripts/questions-raw.txt'), 'utf-8')

// Strategy:
//  1. Remove any '[' that is NOT the very first '[' in the file
//     (i.e. the extra segment-opening brackets)
//  2. Remove ']' that is NOT the very last ']' in the file
//     (i.e. the extra segment-closing brackets)
//  3. Clean up any double-commas or comma-whitespace-comma that result

let cleaned = raw.trim()

// Find the first '[' and last ']'
const firstOpen = cleaned.indexOf('[')
const lastClose = cleaned.lastIndexOf(']')
const inner = cleaned.slice(firstOpen + 1, lastClose)

// Remove stray '[' and ']' that remain in the middle
// These appear as:  },\n[\n  {   or   }\n]\n[\n  {
// Replace any sequence like:  (optional whitespace + '[' + optional whitespace)
// and                          (optional whitespace + ']' + optional whitespace + ',')
const fixed = inner
  .replace(/\s*\]\s*,?\s*\[\s*/g, ',')  // close-bracket then open-bracket => just comma
  .replace(/,\s*,/g, ',')               // double commas
  .trim()
  .replace(/,\s*$/, '')                  // trailing comma

const jsonStr = `[\n${fixed}\n]`

// Validate
let parsed
try {
  parsed = JSON.parse(jsonStr)
} catch (e) {
  console.error('JSON parse error:', e.message)
  // Try to show context around the error
  const m = e.message.match(/position (\d+)/)
  if (m) {
    const pos = parseInt(m[1])
    console.error('Context:', jsonStr.slice(Math.max(0, pos - 80), pos + 80))
  }
  process.exit(1)
}

// Deduplicate by id (keep last occurrence)
const byId = new Map()
for (const q of parsed) byId.set(q.id, q)
const deduped = [...byId.values()].sort((a, b) => a.id - b.id)

const outDir = resolve(root, 'src/data')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'questions.json'), JSON.stringify(deduped, null, 2))

console.log(`✓ Wrote ${deduped.length} questions to src/data/questions.json`)
