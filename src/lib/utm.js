const KEY = 'order_utm'
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']

export function captureUTMs() {
  try {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = {}
    let any = false
    FIELDS.forEach((f) => {
      const v = params.get(f)
      if (v) {
        fromUrl[f] = v
        any = true
      }
    })
    if (any) {
      sessionStorage.setItem(KEY, JSON.stringify(fromUrl))
      return fromUrl
    }
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
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
