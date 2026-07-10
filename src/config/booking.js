/**
 * Wayfinder OS booking calendar for this funnel.
 *
 * The committed URL is the source of truth — it is public, non-secret, and
 * must NOT depend on an env var (Vite bakes VITE_* at build time; an unset
 * var in the Vercel project would ship a placeholder to production forever).
 * The env var exists only to OVERRIDE it, e.g. a test calendar on a preview.
 *
 * Note the no-www host: www.wayfindercollective.io 301s to it, which would
 * add a pointless redirect hop inside the iframe.
 */
export const BOOKING_URL =
  import.meta.env.VITE_WAYFINDER_BOOKING_URL ||
  'https://wayfindercollective.io/book/nico-seedsman'
