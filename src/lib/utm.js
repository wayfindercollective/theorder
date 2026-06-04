const KEY = 'order_utm'
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
const CLICK_IDS = ['gclid', 'fbclid']

export function captureUTMs() {
  try {
    const params = new URLSearchParams(window.location.search)
    const stored = JSON.parse(sessionStorage.getItem(KEY) || '{}')
    const fromUrl = {}
    ;[...FIELDS, ...CLICK_IDS].forEach((f) => {
      const v = params.get(f)
      if (v) fromUrl[f] = v
    })
    // Merge — a later page that carries only gclid must not erase the
    // utm_* captured on first touch. New present values win; absent keys kept.
    const merged = { ...stored, ...fromUrl }
    sessionStorage.setItem(KEY, JSON.stringify(merged))
    return merged
  } catch {
    return {}
  }
}

export function getUTMs() {
  try {
    const raw = sessionStorage.getItem(KEY)
    const stored = raw ? JSON.parse(raw) : {}
    // Always send the core 3, defaulting to empty string so Wayfinder reporting sees them
    return {
      utm_source: stored.utm_source ?? '',
      utm_medium: stored.utm_medium ?? '',
      utm_campaign: stored.utm_campaign ?? '',
      ...(stored.utm_term ? { utm_term: stored.utm_term } : {}),
      ...(stored.utm_content ? { utm_content: stored.utm_content } : {}),
      ...(stored.gclid ? { gclid: stored.gclid } : {}),
      ...(stored.fbclid ? { fbclid: stored.fbclid } : {}),
    }
  } catch {
    return { utm_source: '', utm_medium: '', utm_campaign: '' }
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
