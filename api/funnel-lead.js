/**
 * POST /api/funnel-lead
 *
 * The server half of the booking-gated lead flow (BOOKING_GATED_LEADS.md).
 *
 * The browser holds the questionnaire answers and never sends them anywhere
 * until the embedded Wayfinder booking page confirms a booking. It then POSTs
 * the answers + the booking's contact details here, and THIS function attaches
 * the funnel secret and forwards to the Wayfinder funnel lead API. The secret
 * is server-side only — it must never appear in the bundle, which is why the
 * old browser-side `VITE_WAYFINDER_API_KEY` path is gone.
 *
 * Env vars (Vercel → Project → Environment Variables; NO `VITE_` prefix):
 *   WAYFINDER_FUNNEL_SECRET  — the funnel's webhookSecret, sent as X-API-Key
 *   WAYFINDER_FUNNEL_SLUG    — funnel slug in the URL      (default "the-order")
 *   WAYFINDER_OS_ORIGIN      — OS host                     (default "https://wayfindercollective.io")
 *   WAYFINDER_LEAD_URL       — optional full URL override, wins over the above
 *
 * Responses:
 *   200 { ok: true, enriched }   — Wayfinder accepted it
 *   400 { ok: false, error }     — malformed; the client should NOT retry
 *   502 { ok: false, error }     — Wayfinder rejected/unreachable; client queues + retries
 *   503 { ok: false, error }     — not configured (missing secret)
 *
 * A non-2xx leaves the lead in the browser's retry queue, which is the point:
 * by the time this runs the applicant has already booked a real call, so the
 * questionnaire enrichment is worth chasing. Retries are safe — the OS
 * deduplicates on `bookingId`.
 *
 * NOT A GATE. This endpoint is public and it does not verify that a
 * `bookingId` corresponds to a real booking — it cannot; only the OS can. A
 * script posting junk here still produces a bookingless deal, and the Origin
 * check below constrains browsers, not curl. The real fix is the per-funnel
 * "require booking" toggle on the OS side (see BOOKING_GATED_LEADS.md); the
 * checks here are hygiene, not security.
 */

const DEFAULT_OS_ORIGIN = 'https://wayfindercollective.io'
// The slug in the URL, NOT the `funnel` field in the payload (VITE_FUNNEL_SLUG,
// "the-order"). This default is the one verified live in the pre-cutover
// webhook URL — .../api/funnel/the-order-funnel/lead. Confirm it against the
// funnel's settings before launch and override with WAYFINDER_FUNNEL_SLUG (or
// the whole URL with WAYFINDER_LEAD_URL) if the funnel was recreated.
const DEFAULT_SLUG = 'the-order-funnel'

// This endpoint is called same-origin by our own page. Requests that DO carry
// an Origin (browsers send one on cross-origin POSTs) must carry one of ours;
// a missing Origin is allowed so server-side and non-browser retries still work.
const ALLOWED_ORIGINS = new Set([
  'https://theorder.global',
  'https://www.theorder.global',
  'http://localhost:3000',
  'http://localhost:5173',
])

// Bounds on the forwarded body. The relay is public, so it must not become a
// way to push an arbitrarily large or deeply-nested document into the CRM.
const MAX_KEYS = 60
const MAX_STRING = 800
const MAX_BODY_BYTES = 32 * 1024

function leadUrl() {
  const explicit = process.env.WAYFINDER_LEAD_URL
  if (explicit) return explicit
  const origin = (process.env.WAYFINDER_OS_ORIGIN || DEFAULT_OS_ORIGIN).replace(/\/+$/, '')
  const slug = process.env.WAYFINDER_FUNNEL_SLUG || DEFAULT_SLUG
  return `${origin}/api/funnel/${encodeURIComponent(slug)}/lead`
}

function funnelSecret() {
  // The VITE_-prefixed name is the pre-cutover variable. It is still readable
  // server-side, so accept it as a fallback rather than silently failing if
  // only the old var is set in Vercel — but it should be renamed and the old
  // one deleted, since anything VITE_ is also baked into the public bundle.
  return process.env.WAYFINDER_FUNNEL_SECRET || process.env.VITE_WAYFINDER_API_KEY || ''
}

// Only scalars survive, strings are capped: whatever shape the funnel's
// questions take, a value is a value.
function scalar(v) {
  if (typeof v === 'string') return v.slice(0, MAX_STRING)
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'boolean') return v
  return undefined
}

function sanitizeFlat(obj) {
  const out = {}
  let n = 0
  for (const [k, v] of Object.entries(obj || {})) {
    if (k === 'responses') continue
    const s = scalar(v)
    if (s === undefined) continue
    if (++n > MAX_KEYS) break
    out[k] = s
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'method not allowed' })
  }

  const origin = req.headers.origin
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ ok: false, error: 'origin not allowed' })
  }

  const secret = funnelSecret()
  if (!secret) {
    // 503, not 500: nothing is wrong with the request, and the client's queue
    // should hold the lead until the env var exists.
    return res.status(503).json({ ok: false, error: 'WAYFINDER_FUNNEL_SECRET not configured' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return res.status(400).json({ ok: false, error: 'invalid JSON' }) }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'expected a JSON object' })
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return res.status(400).json({ ok: false, error: 'body too large' })
  }

  const email = String(body.email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, error: 'valid email required' })
  }
  const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''

  // Questionnaire answers ride as top-level keys (they feed lead scoring) and,
  // for the other handler generation, nested under `responses`. Both shapes are
  // sanitized; see WAYFINDER_WIRING.md for why both are sent.
  const payload = sanitizeFlat(body)
  const responses = sanitizeFlat(body.responses)
  if (Object.keys(responses).length) payload.responses = responses

  payload.email = email
  if (bookingId) payload.bookingId = bookingId
  else delete payload.bookingId

  let osRes
  try {
    osRes = await fetch(leadUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Both header generations, same secret — the current contract asks for
        // X-API-Key, older handlers read the bearer token. Sending both is free.
        'X-API-Key': secret,
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return res.status(502).json({ ok: false, error: `wayfinder unreachable: ${err?.message || 'network'}` })
  }

  const text = await osRes.text().catch(() => '')
  if (!osRes.ok) {
    // Never echo the upstream body wholesale — it can carry request context.
    return res.status(502).json({ ok: false, error: `wayfinder ${osRes.status}: ${text.slice(0, 200)}` })
  }

  let result = {}
  try { result = JSON.parse(text) } catch { /* non-JSON 2xx is still a success */ }
  return res.status(200).json({ ok: true, enriched: !!bookingId, result })
}
