/**
 * Offline-first lead queue.
 * Save BEFORE the fetch. Retry on mount / online / focus.
 * The Wayfinder webhook may be slow / cold-starting / down — we never lose a lead.
 */

const KEY = 'order_pending_leads'
const LOCK_MS = 30_000

// Session-only safety net: if localStorage is unavailable (Safari private mode,
// quota exceeded), leads still live here so the retry hook can resend them this
// session. They don't survive a reload — but combined with the immediate POST
// always being attempted, this closes the "storage AND webhook both fail" gap.
let memFallback = {}

function read() {
  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    stored = {}
  }
  // memFallback is authoritative for IDs it holds: it only ever contains leads
  // whose write to localStorage FAILED, so it carries the live lock/retry state
  // while localStorage is frozen at a stale snapshot. It is empty whenever
  // localStorage is healthy (write() clears it on success).
  return { ...stored, ...memFallback }
}

function write(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
    // The whole map (which read() already merged memFallback into) is now
    // persisted — the memory copy is redundant, so drop it.
    memFallback = {}
    return true
  } catch {
    return false // quota / private mode — caller falls back to memory
  }
}

export function savePendingLead(payload) {
  const map = read()
  const existing = map[payload.pendingId]
  const rec = {
    payload,
    savedAt: existing?.savedAt || Date.now(),
    lastTriedAt: existing?.lastTriedAt || 0,
    retryCount: existing?.retryCount || 0,
    lastError: null,
    syncing: false,
  }
  map[payload.pendingId] = rec
  const ok = write(map)
  if (!ok) memFallback[payload.pendingId] = rec // keep it somewhere
  return ok || !!memFallback[payload.pendingId] // true if persisted OR held in memory
}

export function removePendingLead(pendingId) {
  delete memFallback[pendingId]
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
  if (!write(map)) memFallback[pendingId] = map[pendingId]
  return true
}

// An attempt failed: release the lock, count it, record the error.
export function recordFailure(pendingId, errMsg) {
  const map = read()
  if (!map[pendingId]) return
  map[pendingId].syncing = false
  map[pendingId].retryCount = (map[pendingId].retryCount || 0) + 1
  if (errMsg) map[pendingId].lastError = errMsg
  if (!write(map)) memFallback[pendingId] = map[pendingId]
}

// Retained for non-counting lock releases (kept for back-compat).
export function clearLeadSyncingLock(pendingId, errMsg) {
  const map = read()
  if (!map[pendingId]) return
  map[pendingId].syncing = false
  if (errMsg) map[pendingId].lastError = errMsg
  if (!write(map)) memFallback[pendingId] = map[pendingId]
}

export function newPendingId() {
  return 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
