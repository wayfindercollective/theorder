import {
  savePendingLead,
  removePendingLead,
  markLeadSyncing,
  recordFailure,
} from './pendingLeads.js'
import { normalizePhone } from './phone.js'
import { track } from './analytics.js'

const WEBHOOK_URL = import.meta.env.VITE_WAYFINDER_WEBHOOK_URL || 'https://placeholder.invalid/replace-at-launch'
const API_KEY = import.meta.env.VITE_WAYFINDER_API_KEY || ''

function headers() {
  return {
    'Content-Type': 'application/json',
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
  }
}

// Upgrade any payload to the current contract right before sending. Protects
// leads that were queued by an OLDER build (phone-as-object, no `responses`,
// single `smsConsent`) and are only now being retried. No-op for fresh payloads.
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
    const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: headers(), body: JSON.stringify(normalizePayload(payload)) })
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
    const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: headers(), body: JSON.stringify(normalizePayload(record.payload)) })
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
