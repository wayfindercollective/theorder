/**
 * Server-side rich-text sanitiser (the single write boundary).
 *
 * Cleans every rich field to the allowlist before it is stored, so the public
 * site and present mode can render the result directly. Driven by RICH_PATHS so
 * each field is cleaned at the SAME mode the editor produced it.
 */
import sanitizeHtml from 'sanitize-html'
import { ALLOWED_INLINE, ALLOWED_BLOCK, ALLOWED_RICH, RICH_PATHS, richText } from '../../src/lib/richtext.js'

// Force safe link attributes (scheme is already restricted by allowedSchemes).
const transformTags = {
  a: (tagName, attribs) => ({
    tagName: 'a',
    attribs: { ...attribs, rel: 'noopener noreferrer', target: '_blank' },
  }),
}
const inlineOpts = { ...ALLOWED_INLINE, transformTags }
const blockOpts = { ...ALLOWED_BLOCK, transformTags }
const richOpts = { ...ALLOWED_RICH, transformTags }

export function sanitizeInline(html) {
  if (html == null) return ''
  // Defensive: turn any paragraph break into <br> before <p> tags are discarded,
  // so a pasted/crafted block can never nest illegally inside an inline wrapper.
  const normalized = String(html).replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
  const clean = sanitizeHtml(normalized, inlineOpts)
  return richText(clean) ? clean : '' // normalise structure-only HTML (e.g. <br>) to ''
}

export function sanitizeBlock(html) {
  if (html == null) return ''
  const clean = sanitizeHtml(String(html), blockOpts)
  return richText(clean) ? clean : ''
}

// Block + lists (presentation slide body). Keeps <ul>/<ol>/<li> so pasted or
// authored bullet points survive the write boundary.
export function sanitizeRich(html) {
  if (html == null) return ''
  const clean = sanitizeHtml(String(html), richOpts)
  return richText(clean) ? clean : ''
}

function getAt(obj, path) {
  let cur = obj
  for (const k of path) {
    if (cur == null) return undefined
    cur = cur[k]
  }
  return cur
}

function setAt(obj, path, value) {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const isIdx = typeof head === 'number'
  const next = isIdx ? (Array.isArray(obj) ? [...obj] : []) : { ...(obj || {}) }
  next[head] = setAt(next[head], rest, value)
  return next
}

// Returns a new sections object with every RICH_PATHS field sanitised at its mode.
export function sanitizeRichSections(sections) {
  if (!sections || typeof sections !== 'object') return sections
  let out = sections
  for (const e of RICH_PATHS) {
    const val = getAt(out, e.path)
    if (e.array || e.mode === 'lines') {
      // Always end up with a sanitised array. Coerce a stray string (e.g. a
      // stale client or out-of-band edit) so it can never be stored unsanitised.
      let arr = null
      if (Array.isArray(val)) arr = val
      else if (typeof val === 'string' && val.trim() !== '') arr = e.mode === 'lines' ? val.split('\n') : [val]
      if (arr) out = setAt(out, e.path, arr.map((v) => sanitizeInline(v)))
    } else if (val != null) {
      out = setAt(out, e.path, e.mode === 'block' ? sanitizeBlock(val) : sanitizeInline(val))
    }
  }
  return out
}
