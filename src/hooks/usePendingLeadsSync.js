import { useEffect } from 'react'
import { listPendingLeads } from '../lib/pendingLeads.js'
import { retryPendingLead } from '../lib/submitLead.js'

const BASE_DELAY = 1000
const MAX_DELAY = 60_000
const MOUNT_DELAY = 2000
const FOCUS_DEBOUNCE = 5000
const GAP = 200

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Due if never tried, else after exponential backoff (±25% jitter) since last try.
// No hard retry cap: a long outage / temporarily-bad key must not permanently
// strand a real lead. Backoff is clamped at MAX_DELAY, so a stuck lead just
// retries politely (~once/min) until it lands or a human clears it via the
// recovery page. retryCount still grows (used only for backoff + display).
function isDue(rec) {
  if (!rec.lastTriedAt) return true
  const base = Math.min(BASE_DELAY * 2 ** Math.min(rec.retryCount || 0, 16), MAX_DELAY)
  const threshold = base * (0.75 + Math.random() * 0.5)
  return Date.now() - rec.lastTriedAt >= threshold
}

export function usePendingLeadsSync() {
  useEffect(() => {
    let cancelled = false
    let lastFlush = 0

    async function flush() {
      for (const rec of listPendingLeads()) {
        if (cancelled) return
        if (!isDue(rec)) continue
        await retryPendingLead(rec)
        await sleep(GAP)
      }
    }

    const debounced = () => {
      const now = Date.now()
      if (now - lastFlush < FOCUS_DEBOUNCE) return
      lastFlush = now
      flush()
    }

    const mountTimer = setTimeout(() => {
      lastFlush = Date.now()
      flush()
    }, MOUNT_DELAY)
    const onOnline = () => flush()
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', debounced)
    document.addEventListener('visibilitychange', debounced)
    return () => {
      cancelled = true
      clearTimeout(mountTimer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', debounced)
      document.removeEventListener('visibilitychange', debounced)
    }
  }, [])
}
