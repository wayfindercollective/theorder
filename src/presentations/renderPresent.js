/**
 * Client-side sanitised render for PRESENT mode.
 *
 * Present mode can render content that hasn't been through the server sanitiser
 * yet — specifically a restored localStorage draft. TipTap already strips unknown
 * markup while editing, but the present view uses dangerouslySetInnerHTML, so we
 * run the gold-standard DOMPurify at that boundary with the same allowlist. This
 * module is only imported by the presentation chunk (author-only) — never the
 * public bundle.
 */
import DOMPurify from 'dompurify'

const CONFIG = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'a', 'span', 'br', 'p'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style'],
  ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
}

export function renderPresent(html) {
  return { __html: DOMPurify.sanitize(String(html == null ? '' : html), CONFIG) }
}
