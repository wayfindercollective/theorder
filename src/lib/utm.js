// Traffic-source attribution: capture UTM + click IDs + referrer + vanity path
// from the landing URL, persist FIRST-touch (write-once) in localStorage, and
// expose a webhook-ready object to merge into the Wayfinder POST.
//
// Vanity links: a clean single-segment path (theorder.global/some-video) is read
// as utm_campaign with source/medium defaulting to youtube/video. Explicit
// ?utm_* query params always win over those defaults.
const URL_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid']
const OUTPUT_KEYS = [...URL_KEYS, 'referrer']
const FIRST_TOUCH_STORE = 'wf_attribution_first'

const VANITY_SOURCE = 'youtube'
const VANITY_MEDIUM = 'video'
// Every real non-root path of this site — never read these as a campaign slug.
const RESERVED_PATHS = new Set([
  '', 'admin', 'presentations', 'api', 'images', 'testimonials', 'assets',
  'favicon', 'robots', 'sitemap', 'index', 'index.html', '2',
])

// Path segment → normalized campaign slug. MUST match the Wayfinder VU store's
// transform exactly so both halves of the content→revenue ledger join on an
// identical utm_campaign: slug.toLowerCase().replace(/[^a-z0-9._-]/g, '')
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
    if (changed) writeStore(first)
    return buildAttribution(last, first)
  } catch {
    return {}
  }
}

// Call at submit time. Merged, webhook-ready subset; empty keys omitted.
export function getAttribution() {
  try {
    return buildAttribution(readLastTouch(), readStore())
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
