/**
 * Sliding session hook — shared by the admin editor and the presentations
 * builder. While the area is active it silently swaps the JWT for a fresh one
 * every half hour, so an editor who is sitting there signed in NEVER gets the
 * old "session expires in 5 minutes" warning or a forced sign-out mid-work.
 *
 * Sign-out now only happens when renewal is genuinely impossible: the token
 * already lapsed (away for more than a day, laptop asleep past expiry). A
 * network or server hiccup keeps the current token and simply retries on the
 * next tick.
 *
 * Returns a warning string for backwards compatibility with its render sites;
 * it is now always '' (there is nothing to warn about).
 */
import { useEffect } from 'react'
import {
  getTokenExpiryMs as adminTokenExpiryMs,
  refreshSession as adminRefreshSession,
} from '../admin/adminApi.js'

const REFRESH_INTERVAL_MS = 30 * 60 * 1000

// `getExpiryMs` / `refresh` let each area work its OWN token (admin vs
// presentations — separate localStorage keys, same JWT format and endpoint).
export function useSessionExpiry(
  active,
  onExpire,
  getExpiryMs = adminTokenExpiryMs,
  refresh = adminRefreshSession,
) {
  useEffect(() => {
    if (!active) return
    let cancelled = false
    let timer = null

    const tick = async () => {
      if (cancelled) return
      const expMs = getExpiryMs()
      if (!expMs) return
      if (expMs - Date.now() <= 0) {
        // Already lapsed (e.g. machine slept past expiry) — a refresh would be
        // rejected too, so sign out. Drafts survive in localStorage.
        onExpire()
        return
      }
      try {
        await refresh()
      } catch (err) {
        if (err?.status === 401) {
          onExpire()
          return
        }
        // Offline or server hiccup: current token is still good for now,
        // try again next tick.
      }
      if (!cancelled) timer = setTimeout(tick, REFRESH_INTERVAL_MS)
    }

    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [active, onExpire, getExpiryMs, refresh])

  return ''
}
