/**
 * Design version toggle.
 *
 * The site ships two layouts in one build:
 *   v1 (default) — every section centred, image full-bleed behind the text.
 *   v2 (split)   — five key sections pull the painting to one side (faded at
 *                  its inner edge) with the text in the opposite half.
 *
 * v2 is served at the /2 path (vercel.json already rewrites it to index.html)
 * or with a ?v=2 query, so the two designs can be compared side by side. When
 * DESIGN_V2 is false nothing below changes the markup, so v1 is untouched.
 */

function detectV2() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.replace(/\/+$/, '') // tolerate trailing slash
  const v = new URLSearchParams(window.location.search).get('v')
  return path === '/2' || v === '2'
}

export const DESIGN_V2 = detectV2()

/**
 * Which side the painting sits on in v2, per section key. The text takes the
 * opposite half. Chosen so each painting's focal subject lands in the outer
 * (un-faded) half — see THE_ORDER_PLAN / the v2 plan for the per-image reasoning.
 */
export const splitSides = {
  hero: 'right',
  code: 'right',
  become: 'left',
  faq: 'right',
  howWeOperate: 'left',
}

/**
 * Effective image alignment for a section: the v2 split side when on /2,
 * otherwise the section's own content alignment (currently 'full' everywhere).
 * This is the single switch the components read.
 */
export function sectionAlign(key, fallback = 'full') {
  if (DESIGN_V2 && splitSides[key]) return splitSides[key]
  return fallback || 'full'
}
