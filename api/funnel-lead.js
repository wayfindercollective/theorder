/**
 * POST /api/funnel-lead
 *
 * The server half of lead capture. The application's last step asks for name
 * and email; when the applicant passes the questionnaire gate, the browser
 * POSTs the answers + contact details here, and THIS function attaches the
 * funnel secret and forwards them to the Wayfinder funnel lead API, which
 * creates the lead and its deal. Declined applicants are never posted: the gate
 * runs in the browser before this is called.
 *
 * The secret is server-side only (see api/_lib/funnelLead.js for the env vars).
 *
 * Responses:
 *   200 { ok: true }          — Wayfinder accepted it
 *   400 { ok: false, error }  — malformed; the client does NOT retry
 *   403 { ok: false, error }  — a foreign page's origin; the client does NOT retry
 *   502 { ok: false, error }  — Wayfinder rejected it or was unreachable; the
 *                               client keeps it queued and retries
 *   503 { ok: false, error }  — not configured (no secret); queued and retried
 *
 * A Wayfinder 4xx (bad secret, a funnel setting that refuses the lead) comes
 * back as 502 on purpose: fixing the setting later lets every queued lead land.
 *
 * NOT A GATE. This endpoint is public, the questionnaire gate is client-side,
 * and the Origin check constrains browsers, not curl — a script can post a lead
 * that never answered the questions. The checks here are hygiene, not security.
 */

import { funnelSecret, leadUrl } from './_lib/funnelLead.js'

// This endpoint is called same-origin by our own page. Requests that DO carry
// an Origin (browsers send one on POSTs) must carry one of ours; a missing
// Origin is allowed so non-browser retries still work.
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
// Below the function's 15 s maxDuration (vercel.json), so a slow OS produces a
// clean 502 the browser can queue rather than a killed function.
const UPSTREAM_TIMEOUT_MS = 8000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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
    if (k === 'responses' || k === 'company') continue
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
    // 503, not 500: nothing is wrong with the request, and the browser's queue
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

  // The form's honeypot, in case a script posts here with it filled: pretend
  // success, forward nothing.
  if (typeof body.company === 'string' && body.company.trim()) {
    return res.status(200).json({ ok: true })
  }

  const email = String(body.email || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'valid email required' })
  }

  // Questionnaire answers ride as top-level keys (they feed lead scoring) and,
  // for the other handler generation, nested under `responses`. Both shapes are
  // sanitized; see WAYFINDER_WIRING.md for why both are sent.
  const payload = sanitizeFlat(body)
  const responses = sanitizeFlat(body.responses)
  if (Object.keys(responses).length) payload.responses = responses
  payload.email = email

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
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
      signal: controller.signal,
    })
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timed out' : (err?.message || 'network')
    return res.status(502).json({ ok: false, error: `wayfinder unreachable: ${reason}` })
  } finally {
    clearTimeout(timer)
  }

  const text = await osRes.text().catch(() => '')
  if (!osRes.ok) {
    // Never echo the upstream body wholesale — it can carry request context.
    return res.status(502).json({ ok: false, error: `wayfinder ${osRes.status}: ${text.slice(0, 200)}` })
  }
  return res.status(200).json({ ok: true })
}
