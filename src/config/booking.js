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
import { captureAttribution, readMetaIds } from '../lib/utm.js'

export const BOOKING_URL =
  import.meta.env.VITE_WAYFINDER_BOOKING_URL ||
  'https://wayfindercollective.io/book/nico-seedsman-the-order'

/**
 * The calendar URL with this visitor's attribution on the query string.
 *
 * The booking creates the deal in Wayfinder OS, which later reports the scored
 * lead to Meta server-side. The OS otherwise only holds what was typed into the
 * calendar — name, email, phone — which Meta matches against user profiles
 * maybe half the time. `fbc` is the actual ad click and matches near-perfectly,
 * but it lives in a cookie on THIS domain and reaches the OS by no other route.
 * The `utm_*` set rides along so the deal carries its campaign.
 *
 * Purely additive: a booking page that ignores these behaves exactly as before,
 * so this is safe to ship ahead of OS support for reading them. Values are
 * capped — a referrer can be arbitrarily long and the whole thing has to stay a
 * legal URL.
 */
const MAX_PARAM_LEN = 500

export function bookingUrlWithAttribution(base = BOOKING_URL) {
  try {
    const params = { ...captureAttribution(), ...readMetaIds() }
    const url = new URL(base)
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v !== 'string' || !v) return
      if (url.searchParams.has(k)) return // never clobber the page's own params
      url.searchParams.set(k, v.slice(0, MAX_PARAM_LEN))
    })
    return url.toString()
  } catch {
    return base
  }
}
