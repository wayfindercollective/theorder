/**
 * Thin wrapper. PostHog is optional — if no key set, every call is a no-op.
 * Lazy-imported to keep the bundle small if we don't ship it on v1.
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let _posthog = null
let _loading = null

async function load() {
  if (!KEY) return null
  if (_posthog) return _posthog
  if (_loading) return _loading
  _loading = import('posthog-js')
    .then((mod) => {
      const ph = mod.default || mod
      ph.init(KEY, { api_host: HOST, capture_pageview: true })
      _posthog = ph
      return ph
    })
    .catch(() => null)
  return _loading
}

export function bootAnalytics() {
  if (!KEY) return
  load()
}

export function track(event, props = {}) {
  if (!KEY) return
  load().then((ph) => ph && ph.capture(event, props))
}
