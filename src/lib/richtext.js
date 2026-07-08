/**
 * Shared rich-text config + render helper.
 *
 * PLAIN ES ONLY — imported by both the Vite client (public site + editors) and
 * the Vercel Node API (server sanitiser). Must NOT import TipTap or sanitize-html,
 * so neither leaks into the public bundle. The allowlist data lives here so the
 * editor, the server sanitiser, and the renderer all agree on one rule set.
 */

// Numeric font sizes (Word/Docs-style). Stored as <span data-fs="N">; CSS maps
// each number to the SAME absolute px everywhere on the site (globals.css), and
// to the stage-proportional equivalent inside a presentation (presentations.css),
// so "size 8" always means the same thing wherever you use it.
export const FONT_SIZE_STEPS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72]

// Legacy: the first rich-text release sized selections with relative em spans.
// Kept ONLY so already-saved content still parses/renders; the editor now writes
// data-fs numbers instead.
export const FONT_SIZES = ['0.7em', '0.85em', '1em', '1.15em', '1.3em', '1.5em', '1.75em', '2em', '2.5em']
export const FONT_SIZE_RE = /^(0\.7|0\.85|1|1\.15|1\.3|1\.5|1\.75|2|2\.5)em$/

// sanitize-html configs (plain data — the server passes these to sanitize-html).
export const ALLOWED_INLINE = {
  allowedTags: ['b', 'strong', 'i', 'em', 'u', 'a', 'span', 'br'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    // data-fs is value-restricted to the exact numeric steps; style kept for
    // legacy em spans only.
    span: ['style', { name: 'data-fs', values: FONT_SIZE_STEPS.map(String) }],
  },
  allowedStyles: { '*': { 'font-size': [FONT_SIZE_RE] } },
  allowedSchemes: ['http', 'https', 'mailto'],
  // disallowed tags discarded but their text kept (so a stray <p> becomes text)
  disallowedTagsMode: 'discard',
}

export const ALLOWED_BLOCK = {
  ...ALLOWED_INLINE,
  allowedTags: [...ALLOWED_INLINE.allowedTags, 'p'],
}

// Block + bulleted/numbered lists. Used by the presentation slide body so the
// coach can write and paste bullet points; the same allowlist gates the editor
// output, the server sanitiser, and present-mode DOMPurify.
export const ALLOWED_RICH = {
  ...ALLOWED_BLOCK,
  allowedTags: [...ALLOWED_BLOCK.allowedTags, 'ul', 'ol', 'li'],
}

// The rich-text fields in content/sections.json — single source of truth, used by
// SectionsTab (to pick the editor mode) and the server sanitiser (to clean each
// field at the same mode the editor produced it).
//   mode: 'inline' | 'block' | 'lines'
//   array: the value at `path` is an array of strings, each sanitised inline
export const RICH_PATHS = [
  { path: ['truth', 'provocation'], mode: 'lines', array: true },
  { path: ['code', 'heading'], mode: 'inline' },
  { path: ['code', 'intro'], mode: 'block' },
  { path: ['become', 'heading'], mode: 'inline' },
  { path: ['become', 'closing'], mode: 'inline' },
  { path: ['evidence', 'heading'], mode: 'inline' },
  { path: ['evidence', 'intro'], mode: 'inline' },
  { path: ['founder', 'heading'], mode: 'inline' },
  { path: ['founder', 'paragraphs'], mode: 'inline', array: true },
  { path: ['faq', 'heading'], mode: 'inline' },
  { path: ['howWeOperate', 'heading'], mode: 'inline' },
  { path: ['howWeOperate', 'paragraphs'], mode: 'inline', array: true },
  { path: ['howWeOperate', 'pullQuote'], mode: 'inline' },
]

const samePath = (a, b) => a.length === b.length && a.every((x, i) => x === b[i])

// The rich mode for an admin field path, or null if the field is plain.
// Handles both a whole field (truth.provocation, code.heading) and an element of
// an array field (founder.paragraphs[0] → inline).
export function richModeForPath(path) {
  for (const e of RICH_PATHS) {
    if (samePath(e.path, path)) return e.mode
    if (
      e.array &&
      path.length === e.path.length + 1 &&
      typeof path[path.length - 1] === 'number' &&
      samePath(e.path, path.slice(0, -1))
    ) {
      return e.mode === 'lines' ? 'inline' : e.mode
    }
  }
  return null
}

// Strip tags → plain text. Used for empty checks and length limits (works in both
// the browser and Node — no DOM).
export function richText(html) {
  return String(html == null ? '' : html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

export function isRichEmpty(value) {
  if (Array.isArray(value)) return value.every((v) => !richText(v))
  return !richText(value)
}

// For dangerouslySetInnerHTML on the public site / present mode. Storage is
// server-sanitised, so this is a thin wrapper that guarantees a string.
export function renderRich(html) {
  return { __html: String(html == null ? '' : html) }
}
