/**
 * Offline-first lead queue.
 * Save BEFORE the fetch. Retry on mount / online / focus.
 * The Wayfinder webhook may be slow / cold-starting / down — we never lose a lead.
 */

const KEY = 'order_pending_leads'
const LOCK_MS = 30_000

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function write(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* quota or private mode — fail open */
  }
}

export function savePendingLead(payload) {
  const map = read()
  map[payload.pendingId] = {
    payload,
    savedAt: Date.now(),
    lastTriedAt: 0,
    lastError: null,
    syncing: false,
  }
  write(map)
}

export function removePendingLead(pendingId) {
  const map = read()
  delete map[pendingId]
  write(map)
}

export function listPendingLeads() {
  const map = read()
  return Object.entries(map).map(([pendingId, rec]) => ({ pendingId, ...rec }))
}

export function markLeadSyncing(pendingId) {
  const map = read()
  if (!map[pendingId]) return false
  if (map[pendingId].syncing && Date.now() - map[pendingId].lastTriedAt < LOCK_MS) {
    return false
  }
  map[pendingId].syncing = true
  map[pendingId].lastTriedAt = Date.now()
  write(map)
  return true
}

export function clearLeadSyncingLock(pendingId, errMsg) {
  const map = read()
  if (!map[pendingId]) return
  map[pendingId].syncing = false
  if (errMsg) map[pendingId].lastError = errMsg
  write(map)
}

export function newPendingId() {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
