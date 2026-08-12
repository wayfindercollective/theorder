// Traffic-source attribution: capture UTM + click IDs + referrer + vanity path
// from the landing URL and persist FIRST-touch (write-once) in localStorage for
// anonymous site analytics.
//
// Vanity links: a clean single-segment path (theorder.global/some-video) is read
// as utm_campaign with source/medium defaulting to youtube/video. Explicit
// ?utm_* query params always win over those defaults.
import { RESERVED_VARIANT_SLUGS, SYSTEM_PATHS } from '../config/variantFields.js'
import { VARIANT_PAGE_SLUGS, RETIRED_PAGE_SLUGS } from '../config/variantPages.js'

const URL_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid']
const OUTPUT_KEYS = [...URL_KEYS, 'referrer']
const FIRST_TOUCH_STORE = 'wf_attribution_first'

const VANITY_SOURCE = 'youtube'
const VANITY_MEDIUM = 'video'
// Every real non-root path of this site — never read these as a campaign slug.
// System paths + all seven planned focus-area slugs (built or not) + every
// variant page that exists in this build + every page that EVER existed (the
// retired tombstone — a removed page's old links must not start earning
// fabricated campaign attribution). Links to variant pages carry explicit
// ?utm_* params instead of doubling as campaign names.
const RESERVED_PATHS = new Set([
  '',
  ...SYSTEM_PATHS,
  ...RESERVED_VARIANT_SLUGS,
  ...VARIANT_PAGE_SLUGS,
  ...RETIRED_PAGE_SLUGS,
])

// Path segment -> normalized campaign slug.
function readVanityCampaign() {
  if (typeof window === 'undefined') return null
  const seg = (window.location.pathname || '/').replace(/^\/+|\/+$/g, '')
  if (!seg || seg.indexOf('/') !== -1 || seg.indexOf('.') !== -1) return null
  if (RESERVED_PATHS.has(seg.toLowerCase())) return null
  let decoded
  try { decoded = decodeURIComponent(seg) } catch { decoded = seg }
  const slug = decoded.toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return slug || null
}

function readStore() {
  try { return JSON.parse(window.localStorage.getItem(FIRST_TOUCH_STORE) || '{}') || {} } catch { return {} }
}

function writeStore(v) {
  try { window.localStorage.setItem(FIRST_TOUCH_STORE, JSON.stringify(v)) } catch { /* private mode / quota */ }
}

// Current-visit (last-touch) attribution, read fresh from the URL. Only the
// path-derived slug is normalized — an explicit ?utm_campaign=Foo stays as-typed
// (the VU store does the same).
function readLastTouch() {
  if (typeof window === 'undefined') return {}
  const qs = new URLSearchParams(window.location.search)
  const last = {}
  URL_KEYS.forEach((k) => { const v = qs.get(k); if (v) last[k] = v })
  const vanity = readVanityCampaign()
  if (vanity) {
    if (!last.utm_campaign) last.utm_campaign = vanity
    if (!last.utm_source) last.utm_source = VANITY_SOURCE
    if (!last.utm_medium) last.utm_medium = VANITY_MEDIUM
  }
  const refParam = qs.get('ref') || qs.get('referrer')
  if (refParam) last.referrer = refParam
  else if (document.referrer) last.referrer = document.referrer
  return last
}

// First-touch wins over last-touch: the video that originally brought a viewer
// keeps the credit even if they return later through another door.
function buildAttribution(last, first) {
  const merged = { ...last, ...first }
  const out = {}
  OUTPUT_KEYS.forEach((k) => { if (merged[k]) out[k] = merged[k] })
  return out
}

// Call once on page load. Persists first-touch (write-once — never overwrites
// an existing key). Returns the merged attribution.
export function captureAttribution() {
  try {
    const last = readLastTouch()
    const first = readStore()
    let changed = false
    Object.keys(last).forEach((k) => { if (!first[k]) { first[k] = last[k]; changed = true } })
    // When the click id lands for the first time, stamp WHEN — `_fbc` encodes
    // the click time and cannot be rebuilt later without it. Not in OUTPUT_KEYS,
    // so it stays internal to readMetaIds() below.
    if (first.fbclid && !first.fbclid_at) { first.fbclid_at = Date.now(); changed = true }
    if (changed) writeStore(first)
    return buildAttribution(last, first)
  } catch {
    return {}
  }
}

// ---- Meta click / browser IDs ----------------------------------------------
// The pixel writes `_fbc` (the ad click) and `_fbp` (the browser) as first-party
// cookies on this domain. They are the strongest identifiers we hold: a
// conversion reported later — by the CRM, server-side, from a different device
// — matches back to the ad click near-perfectly with `fbc`, versus roughly half
// the time on hashed email/phone alone. Nothing carries them off this page
// unless we pass them explicitly.
function readCookie(name) {
  const all = typeof document === 'undefined' ? '' : document.cookie || ''
  const hit = all.split('; ').find((c) => c.startsWith(name + '='))
  if (!hit) return ''
  try { return decodeURIComponent(hit.slice(name.length + 1)) } catch { return '' }
}

export function readMetaIds() {
  try {
    const out = {}
    const fbp = readCookie('_fbp')
    if (fbp) out.fbp = fbp
    const fbc = readCookie('_fbc')
    if (fbc) {
      out.fbc = fbc
      return out
    }
    // The pixel only writes `_fbc` when it sees an `fbclid` in the URL, and
    // Safari's ITP expires script-written cookies after 7 days — but we kept the
    // click id first-touch. Rebuild the value Meta expects:
    // fb.<subdomainIndex>.<clickTimeMs>.<fbclid>, where index 1 is the
    // registrable domain (theorder.global) the pixel writes to. Only with a real
    // timestamp — a fabricated one would be worse than sending nothing.
    const first = readStore()
    if (first.fbclid && first.fbclid_at) {
      out.fbc = `fb.1.${first.fbclid_at}.${first.fbclid}`
    }
    return out
  } catch {
    return {}
  }
}

const CTA_KEY = 'order_last_cta'

export function recordCTA(location) {
  try {
    sessionStorage.setItem(CTA_KEY, location)
  } catch { /* noop */ }
}

export function getLastCTA() {
  try {
    return sessionStorage.getItem(CTA_KEY) || ''
  } catch {
    return ''
  }
}
