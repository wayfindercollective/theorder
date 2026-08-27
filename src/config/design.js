/**
 * Design layout.
 *
 * The site now ships a single layout: the split design, where five key
 * sections (hero, code, become, faq, howWeOperate) pull the painting to one
 * side (faded at its inner edge) with the text in the opposite half.
 *
 * This used to be a v1/v2 toggle served at "/" vs "/2". The split design won,
 * so it is now the only design — DESIGN_V2 is always on. The old /2 (and ?v=2)
 * URL now redirects to "/" (see App.jsx). The constant name is kept so the
 * section components don't all have to change.
 */

export const DESIGN_V2 = true

/**
 * Hero video (HERO_VIDEO_PLAN.md): Nico's "Who Am I" video playable on the
 * hero before any scroll — desktop: the horseman is the play surface; mobile:
 * a play bar opening the native fullscreen player. The Who Am I section keeps
 * its own portrait tile beside the letter; that tile is independent of the
 * hero video.
 *
 * Nico approved the /preview test run 2026-08-18; now on for EVERY page (main
 * site and all variant pages). /preview stays reserved and simply renders the
 * same site. Flip to a path check again if a layout test run is ever needed.
 */
export const HERO_VIDEO = true

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
