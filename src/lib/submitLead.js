/**
 * Lead delivery — server-relayed, offline-first.
 *
 * The browser never talks to Wayfinder OS directly. The funnel secret must not
 * ship in a bundle, so the payload goes to our OWN serverless function
 * (`/api/funnel-lead`), which attaches the secret and forwards it to the funnel
 * lead API, where it becomes a deal.
 *
 * Every lead is saved to a local queue BEFORE the POST, so a network blip, a
 * cold start or an OS outage cannot lose it: usePendingLeadsSync resends it on
 * the next page load, reconnect or tab focus.
 */
import {
  savePendingLead,
  removePendingLead,
  markLeadSyncing,
  recordFailure,
} from './pendingLeads.js'
import { track } from './analytics.js'

// Same-origin: no CORS, no secret in the browser, no env var to forget at build.
const LEAD_ENDPOINT = '/api/funnel-lead'

// The applicant is waiting on this request before seeing the next step. The
// lead is already queued locally, so giving up after this long loses nothing.
// Kept above the relay's own upstream timeout, so a slow OS normally comes back
// as a 502 (queued, retried) rather than an abort here.
const TIMEOUT_MS = 10_000

// Rejections that no retry can fix: the relay refused the payload itself (400,
// 413) or the page's origin (403). Anything else — 5xx, 429, network, timeout —
// is transient and stays queued.
function isPermanent(status) {
  return status === 400 || status === 403 || status === 413
}

async function post(payload) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null
  try {
    return await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Lets the request finish even if the applicant taps straight through to
      // Instagram and the page unloads mid-flight.
      keepalive: true,
      signal: controller?.signal,
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function errorLabel(err) {
  return err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network')
}

export async function submitLead(payload) {
  // Save FIRST (best-effort). `saved` is false in private mode / quota cases.
  const saved = savePendingLead(payload)
  // Best-effort lock so the retry hook doesn't double-send — but NEVER gate the
  // immediate POST on it. If save failed there's no map entry and the lock
  // would be false; we must still attempt delivery or the lead is lost.
  markLeadSyncing(payload.pendingId)
  try {
    const res = await post(payload)
    if (res.ok) {
      removePendingLead(payload.pendingId)
      return { ok: true }
    }
    const text = await res.text().catch(() => '')
    if (isPermanent(res.status)) {
      removePendingLead(payload.pendingId)
      return { ok: false, queued: false, status: res.status }
    }
    recordFailure(payload.pendingId, `HTTP ${res.status} ${text.slice(0, 200)}`)
    return { ok: false, queued: saved, status: res.status }
  } catch (err) {
    recordFailure(payload.pendingId, errorLabel(err))
    return { ok: false, queued: saved, error: errorLabel(err) }
  }
}

export async function retryPendingLead(record) {
  const got = markLeadSyncing(record.pendingId)
  if (!got) return { ok: false, skipped: true }
  try {
    const res = await post(record.payload)
    if (res.ok) {
      removePendingLead(record.pendingId)
      track('wayfinder_lead_sent', { source: 'retry' })
      return { ok: true }
    }
    const text = await res.text().catch(() => '')
    if (isPermanent(res.status)) {
      removePendingLead(record.pendingId)
      track('wayfinder_lead_failed', { source: 'retry', status: res.status, queued: false })
      return { ok: false, status: res.status }
    }
    recordFailure(record.pendingId, `HTTP ${res.status} ${text.slice(0, 200)}`)
    track('pending_lead_sync_failed', { status: res.status })
    return { ok: false, status: res.status }
  } catch (err) {
    recordFailure(record.pendingId, errorLabel(err))
    track('pending_lead_sync_failed', { error: errorLabel(err) })
    return { ok: false, error: errorLabel(err) }
  }
}
