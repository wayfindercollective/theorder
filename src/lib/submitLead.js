import {
  savePendingLead,
  removePendingLead,
  markLeadSyncing,
  clearLeadSyncingLock,
} from './pendingLeads.js'

const WEBHOOK_URL = import.meta.env.VITE_WAYFINDER_WEBHOOK_URL || 'https://placeholder.invalid/replace-at-launch'
const API_KEY = import.meta.env.VITE_WAYFINDER_API_KEY || ''

export async function submitLead(payload) {
  // Save FIRST. Then try.
  savePendingLead(payload)
  const got = markLeadSyncing(payload.pendingId)
  if (!got) {
    return { ok: false, queued: true }
  }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      clearLeadSyncingLock(payload.pendingId, `HTTP ${res.status} ${text.slice(0, 200)}`)
      return { ok: false, queued: true, status: res.status }
    }
    const result = await res.json().catch(() => ({}))
    removePendingLead(payload.pendingId)
    return { ok: true, result }
  } catch (err) {
    clearLeadSyncingLock(payload.pendingId, err?.message || String(err))
    return { ok: false, queued: true, error: err?.message || 'network' }
  }
}

export async function retryPendingLead(record) {
  const got = markLeadSyncing(record.pendingId)
  if (!got) return { ok: false, skipped: true }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify(record.payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      clearLeadSyncingLock(record.pendingId, `HTTP ${res.status} ${text.slice(0, 200)}`)
      return { ok: false, status: res.status }
    }
    removePendingLead(record.pendingId)
    return { ok: true }
  } catch (err) {
    clearLeadSyncingLock(record.pendingId, err?.message || String(err))
    return { ok: false, error: err?.message || 'network' }
  }
}
