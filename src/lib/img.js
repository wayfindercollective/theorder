/**
 * Painting/photo URL router.
 *
 * The heavy full-bleed oils ship as 2560px JPEGs but are served through lean
 * WebP derivatives (scripts/optimize-paintings.mjs → /images/opt/<name>.webp).
 * optImage() rewrites a known /images/<name>.jpg|png to its derivative. Anything
 * without a derivative — a freshly CMS-uploaded image, an external URL — passes
 * through untouched, so the site never points at a file that doesn't exist.
 */
import { OPTIMIZED } from './optimizedImages.js'

export function optImage(src) {
  if (!src || typeof src !== 'string') return src
  const m = src.match(/^\/images\/([^/?#]+)\.(jpe?g|png)$/i)
  if (!m) return src
  return OPTIMIZED.has(m[1]) ? `/images/opt/${m[1]}.webp` : src
}

/** Convenience for inline styles: returns a ready `url("…")` value. */
export function bgImage(src) {
  return `url("${optImage(src)}")`
}
