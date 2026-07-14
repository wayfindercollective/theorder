/**
 * One fan-out point for all analytics. Every provider is optional and driven
 * purely by env vars — with no IDs set, every call here is a silent no-op, so
 * the site ships fine before the ad/analytics accounts exist. To turn a
 * provider ON later, set its env var in Vercel and redeploy. No code changes.
 *
 *   VITE_POSTHOG_KEY         → PostHog        (product analytics — our tool)
 *   VITE_GA4_MEASUREMENT_ID  → Google Analytics 4  (G-XXXXXXXXXX — for the agency)
 *   VITE_META_PIXEL_ID       → Meta / Facebook Pixel (numeric — for ad optimization)
 *
 * Exception: the Meta Pixel (1046054754782392) is installed by an inline
 * snippet in index.html so PageView fires at first paint. bootMetaPixel()
 * detects and adopts it; the env var is only a fallback.
 *
 * All three ride the SAME track() calls already wired through the funnel
 * (session_start, form_started, form_submitted, …), so switching one on
 * instantly backfills it with the full existing event stream — including the
 * key conversion, which is mapped to Meta's standard `Lead` event below.
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
const GA4_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID

// ---- PostHog (lazy-imported to keep it out of the bundle when unused) --------
let _posthog = null
let _loading = null

function loadPostHog() {
  if (!POSTHOG_KEY) return null
  if (_posthog) return _posthog
  if (_loading) return _loading
  _loading = import('posthog-js')
    .then((mod) => {
      const ph = mod.default || mod
      ph.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, capture_pageview: true })
      _posthog = ph
      return ph
    })
    .catch(() => null)
  return _loading
}

// ---- Google Analytics 4 (gtag.js) -------------------------------------------
let _ga4Ready = false

// GA4 reserves a handful of event names (session_start, first_visit, error, …)
// and silently drops custom events that collide. Rename ours on the way in.
const GA4_RENAME = {
  session_start: 'order_session_start',
}

function bootGA4() {
  if (!GA4_ID || _ga4Ready) return
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`
  document.head.appendChild(s)
  window.dataLayer = window.dataLayer || []
  // gtag forwards raw `arguments` onto dataLayer — must not be a rest-param wrapper.
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA4_ID) // fires the initial page_view
  _ga4Ready = true
}

// ---- Meta / Facebook Pixel (fbq) --------------------------------------------
let _metaReady = false

// Internal event name → Meta *standard* event. Fired IN ADDITION to the custom
// event, so the ad account gets the optimizable standard conversion (Lead)
// while still receiving every granular custom event for audience-building.
const META_STANDARD_EVENTS = {
  form_submitted: 'Lead',
}

// Meta's Business Tools Terms prohibit sending data that reveals financial
// status or health/personal-hardship categories. These props still flow to
// PostHog and GA4 above — they must never reach the pixel.
const META_BLOCKED_PROPS = ['income_bracket', 'life_area']

function metaSafe(props) {
  if (!META_BLOCKED_PROPS.some((k) => k in props)) return props
  const out = { ...props }
  META_BLOCKED_PROPS.forEach((k) => { delete out[k] })
  return out
}

function bootMetaPixel() {
  if (_metaReady) return
  // The pixel is normally installed by the inline snippet in index.html
  // (init + PageView already fired). Adopt it — a second init would
  // double-count every PageView.
  if (window.fbq) {
    _metaReady = true
    return
  }
  if (!META_PIXEL_ID) return
  // Env-var fallback if the inline snippet is ever removed: stand up the
  // fbq() queue synchronously, then load fbevents.js, which drains the
  // queue once it's ready.
  const n = (window.fbq = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
  })
  if (!window._fbq) window._fbq = n
  n.push = n
  n.loaded = true
  n.version = '2.0'
  n.queue = []
  const t = document.createElement('script')
  t.async = true
  t.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(t)
  window.fbq('init', META_PIXEL_ID)
  window.fbq('track', 'PageView')
  _metaReady = true
}

// -----------------------------------------------------------------------------
export function bootAnalytics() {
  loadPostHog()
  bootGA4()
  bootMetaPixel()
}

export function track(event, props = {}) {
  if (POSTHOG_KEY) loadPostHog().then((ph) => ph && ph.capture(event, props))
  if (_ga4Ready && window.gtag) {
    window.gtag('event', GA4_RENAME[event] || event, props)
  }
  if (_metaReady && window.fbq) {
    const safe = metaSafe(props)
    window.fbq('trackCustom', event, safe)
    const standard = META_STANDARD_EVENTS[event]
    if (standard) window.fbq('track', standard, safe)
  }
}
