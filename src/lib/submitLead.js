/**
 * Lead delivery — booking-gated, server-relayed.
 *
 * This funnel no longer posts to Wayfinder from the browser. The funnel secret
 * must never ship in a bundle, so the payload goes to our OWN serverless
 * function (`/api/funnel-lead`), which attaches the key and forwards it to the
 * Wayfinder funnel lead API. See BOOKING_GATED_LEADS.md.
 *
 * The offline queue is unchanged and still worth having: the POST happens
 * AFTER the applicant has already booked, so a failure here loses the
 * questionnaire enrichment for a call that is really in the calendar. Retries
 * are safe — the OS deduplicates on `bookingId`.
 */
import {
  savePendingLead,
  removePendingLead,
  markLeadSyncing,
  recordFailure,
} from './pendingLeads.js'
import { normalizePhone } from './phone.js'
import { track } from './analytics.js'

// Same-origin: no CORS, no key in the browser, no env var to forget at build.
const LEAD_ENDPOINT = '/api/funnel-lead'

function headers() {
  return { 'Content-Type': 'application/json' }
}

// Upgrade any payload to the current contract right before sending. Protects
// leads that were queued by an OLDER build (phone-as-object, no `responses`,
// single `smsConsent`, contact collected on-site with no `bookingId`) and are
// only now being retried. Those pre-cutover leads are real and must still be
// delivered — the relay forwards a bookingId-less payload as a plain lead.
// No-op for fresh payloads.
function normalizePayload(p) {
  const out = { ...p }
  if (out.phone && typeof out.phone === 'object') {
    const o = out.phone
    const { phone, phoneCountry } = normalizePhone(o.phone, { dial: o.dial, code: o.country })
    out.phone = phone
    if (!out.phoneCountry) out.phoneCountry = phoneCountry || o.country || ''
  }
  const consent = !!(out.smsConsent ?? out.smsConsentMarketing ?? out.smsConsentOperational)
  if (out.smsConsent === undefined) out.smsConsent = consent
  if (out.smsConsentMarketing === undefined) out.smsConsentMarketing = consent
  if (out.smsConsentOperational === undefined) out.smsConsentOperational = consent
  if (!out.responses) {
    out.responses = {
      mainChallenge: out.mainChallenge || '',
      commitment: out.commitment || '',
      readiness: out.readiness || '',
      income: out.income || '',
    }
  }
  return out
}

export async function submitLead(payload) {
  // Save FIRST (best-effort). `saved` is false in private mode / quota cases.
  const saved = savePendingLead(payload)
  // Best-effort lock so the retry hook doesn't double-send — but NEVER gate the
  // immediate POST on it. If save failed there's no map entry and the lock
  // would be false; we must still attempt delivery or the lead is lost.
  markLeadSyncing(payload.pendingId)
  try {
    const res = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: headers(), body: JSON.stringify(normalizePayload(payload)) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      recordFailure(payload.pendingId, `HTTP ${res.status} ${text.slice(0, 200)}`)
      return { ok: false, queued: saved, status: res.status }
    }
    const result = await res.json().catch(() => ({}))
    removePendingLead(payload.pendingId)
    return { ok: true, result }
  } catch (err) {
    recordFailure(payload.pendingId, err?.message || String(err))
    return { ok: false, queued: saved, error: err?.message || 'network' }
  }
}

export async function retryPendingLead(record) {
  const got = markLeadSyncing(record.pendingId)
  if (!got) return { ok: false, skipped: true }
  try {
    const res = await fetch(LEAD_ENDPOINT, { method: 'POST', headers: headers(), body: JSON.stringify(normalizePayload(record.payload)) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      recordFailure(record.pendingId, `HTTP ${res.status} ${text.slice(0, 200)}`)
      track('pending_lead_sync_failed', { pendingId: record.pendingId, status: res.status })
      return { ok: false, status: res.status }
    }
    removePendingLead(record.pendingId)
    track('wayfinder_lead_sent', { source: 'retry' })
    return { ok: true }
  } catch (err) {
    recordFailure(record.pendingId, err?.message || String(err))
    track('pending_lead_sync_failed', { pendingId: record.pendingId, error: err?.message })
    return { ok: false, error: err?.message || 'network' }
  }
}
