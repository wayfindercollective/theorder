/**
 * Shared rich-text config + render helper.
 *
 * PLAIN ES ONLY — imported by both the Vite client (public site + editors) and
 * the Vercel Node API (server sanitiser). Must NOT import TipTap or sanitize-html,
 * so neither leaks into the public bundle. The allowlist data lives here so the
 * editor, the server sanitiser, and the renderer all agree on one rule set.
 */

// Per-selection font sizes, relative (em) so they scale with each field's base
// size (the cqw base in /presentations, the section CSS on the public site).
// 1em is the implicit default (no span).
export const FONT_SIZES = ['0.7em', '0.85em', '1em', '1.15em', '1.3em', '1.5em', '1.75em', '2em', '2.5em']

// Regex the sanitiser uses to allow only those font-size values on a span style.
export const FONT_SIZE_RE = /^(0\.7|0\.85|1|1\.15|1\.3|1\.5|1\.75|2|2\.5)em$/

// sanitize-html configs (plain data — the server passes these to sanitize-html).
export const ALLOWED_INLINE = {
  allowedTags: ['b', 'strong', 'i', 'em', 'u', 'a', 'span', 'br'],
  allowedAttributes: { a: ['href', 'target', 'rel'], span: ['style'] },
  allowedStyles: { '*': { 'font-size': [FONT_SIZE_RE] } },
  allowedSchemes: ['http', 'https', 'mailto'],
  // disallowed tags discarded but their text kept (so a stray <p> becomes text)
  disallowedTagsMode: 'discard',
}

export const ALLOWED_BLOCK = {
  ...ALLOWED_INLINE,
  allowedTags: [...ALLOWED_INLINE.allowedTags, 'p'],
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
