/**
 * Video delivery helpers.
 *
 * Nico's clips are 9:16 phone recordings shown inside modest cards — the
 * players are a few hundred CSS pixels wide, so the full-size file is far more
 * than either screen can resolve. Each clip ships as a 720p and a 540p
 * rendition (scripts/optimize-videos.mjs) and the CMS carries both URLs; these
 * helpers decide which one a given visitor gets and how eagerly it loads.
 */

/**
 * Choose between the desktop and mobile rendition.
 *
 * `<source media>` looks like the natural fit but is only honoured inside
 * `<picture>`, never for `<video>` — so the choice has to be made here. It is
 * made once, at mount: swapping `src` afterwards reloads the file and drops the
 * playhead, which is worse than serving a slightly oversized clip to someone
 * who rotated their phone. A clip with no mobile rendition uses the one file.
 */
export function pickVideoSource(desktop, mobile) {
  if (!mobile || typeof window === 'undefined') return desktop
  return window.matchMedia?.('(max-width: 700px)')?.matches ? mobile : desktop
}

/**
 * The most eager preload this visitor should get.
 *
 * Buffering before the press is what makes playback start instantly instead of
 * beginning the download, so the default is `auto`. Data Saver and 2G are an
 * explicit request not to spend someone's allowance on a clip they may never
 * play — there the smaller rendition is what saves them, not speculative
 * buffering. iOS clamps this to metadata regardless of what we ask for.
 *
 * Callers still gate this on visibility where the video is one section among
 * many; a player the visitor may never scroll to should not preload at all.
 */
export function maxPreload() {
  const conn = typeof navigator === 'undefined' ? null : navigator.connection
  if (conn?.saveData) return 'metadata'
  if (conn?.effectiveType && /2g$/.test(conn.effectiveType)) return 'metadata'
  return 'auto'
}
