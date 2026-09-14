/**
 * Where The Order's leads go, and with which secret — shared by the relay
 * (api/funnel-lead.js) and the admin diagnostics (api/admin/diag.js) so the two
 * can never disagree about the configuration in use.
 *
 * Env vars (Vercel → Project → Environment Variables; NO `VITE_` prefix):
 *   WAYFINDER_FUNNEL_SECRET  — the funnel's webhookSecret, sent as X-API-Key
 *   WAYFINDER_LEAD_URL       — optional full lead URL, wins over the two below
 *   WAYFINDER_OS_ORIGIN      — OS host   (default "https://wayfindercollective.io")
 *   WAYFINDER_FUNNEL_SLUG    — URL slug  (default "the-order-funnel")
 *
 * Legacy names from the first wiring (2026-06) are still read as fallbacks, so a
 * project that only ever had those set keeps working: VITE_WAYFINDER_API_KEY for
 * the secret, VITE_WAYFINDER_WEBHOOK_URL for the URL. They are read here, on the
 * server, and are not referenced by any client code, so Vite does not bake them
 * into the public bundle — but the old key DID ship in the bundle before
 * 2026-07-27, so if it is still the funnel's secret it should be rotated.
 */

const DEFAULT_OS_ORIGIN = 'https://wayfindercollective.io'
// The slug in the URL, NOT the `funnel` field in the payload ("the-order").
// This is the slug verified live in the original webhook URL
// (…/api/funnel/the-order-funnel/lead).
const DEFAULT_SLUG = 'the-order-funnel'

function legacyWebhookUrl() {
  const legacy = process.env.VITE_WAYFINDER_WEBHOOK_URL
  return legacy && !legacy.includes('placeholder.invalid') ? legacy : ''
}

export function leadUrl() {
  const explicit = process.env.WAYFINDER_LEAD_URL
  if (explicit) return explicit
  const legacy = legacyWebhookUrl()
  if (legacy) return legacy
  const origin = (process.env.WAYFINDER_OS_ORIGIN || DEFAULT_OS_ORIGIN).replace(/\/+$/, '')
  const slug = process.env.WAYFINDER_FUNNEL_SLUG || DEFAULT_SLUG
  return `${origin}/api/funnel/${encodeURIComponent(slug)}/lead`
}

export function funnelSecret() {
  return process.env.WAYFINDER_FUNNEL_SECRET || process.env.VITE_WAYFINDER_API_KEY || ''
}

// Which rung of each fallback is in use — names only, never values.
export function describeLeadConfig() {
  return {
    secretFrom: process.env.WAYFINDER_FUNNEL_SECRET
      ? 'WAYFINDER_FUNNEL_SECRET'
      : process.env.VITE_WAYFINDER_API_KEY
        ? 'VITE_WAYFINDER_API_KEY (legacy name, still works; rename + rotate)'
        : 'none set: leads wait in applicants’ browsers until it is',
    urlFrom: process.env.WAYFINDER_LEAD_URL
      ? 'WAYFINDER_LEAD_URL'
      : legacyWebhookUrl()
        ? 'VITE_WAYFINDER_WEBHOOK_URL (legacy name)'
        : 'default: WAYFINDER_OS_ORIGIN + WAYFINDER_FUNNEL_SLUG',
    url: leadUrl(),
  }
}
