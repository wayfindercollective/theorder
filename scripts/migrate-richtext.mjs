/**
 * One-time migration: convert the rich-text fields in content/sections.json from
 * markdown to HTML (and truth.provocation from a \n-string to an array of inline
 * HTML lines), matching RICH_PATHS. Run once from the repo root:
 *   node scripts/migrate-richtext.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { renderInlineMarkdown, renderMarkdown } from '../src/lib/markdown.js'

const PATH = 'content/sections.json'
const data = JSON.parse(readFileSync(PATH, 'utf8'))

const blank = (s) => s == null || String(s).trim() === ''
const inline = (s) => (blank(s) ? '' : renderInlineMarkdown(String(s)))
const block = (s) => (blank(s) ? '' : renderMarkdown(String(s)))
const setInline = (obj, key) => { if (obj && key in obj) obj[key] = inline(obj[key]) }

if (data.code) { setInline(data.code, 'heading'); if (data.code.intro != null) data.code.intro = block(data.code.intro) }
if (data.become) { setInline(data.become, 'heading'); setInline(data.become, 'closing') }
if (data.evidence) { setInline(data.evidence, 'heading'); setInline(data.evidence, 'intro') }
if (data.founder) {
  setInline(data.founder, 'heading')
  if (Array.isArray(data.founder.paragraphs)) data.founder.paragraphs = data.founder.paragraphs.map(inline)
}
if (data.faq) setInline(data.faq, 'heading')
if (data.howWeOperate) {
  setInline(data.howWeOperate, 'heading')
  setInline(data.howWeOperate, 'pullQuote')
  if (Array.isArray(data.howWeOperate.paragraphs)) data.howWeOperate.paragraphs = data.howWeOperate.paragraphs.map(inline)
}
if (data.truth && typeof data.truth.provocation === 'string') {
  data.truth.provocation = data.truth.provocation.split('\n').map((l) => (l.trim() === '' ? '' : renderInlineMarkdown(l)))
}

writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n')
console.log('migrated rich fields in', PATH)
