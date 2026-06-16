/**
 * Shared session-expiry hook — extracted from AdminApp so both the admin editor
 * and the presentations builder warn before the JWT lapses and sign out when it
 * does. Returns a warning string ('' when none). `active` gates the timers;
 * `onExpire` is called once the token is past expiry.
 */
import { useEffect, useRef, useState } from 'react'
import { getTokenExpiryMs as adminTokenExpiryMs } from '../admin/adminApi.js'

const EXPIRY_WARN_MS = 5 * 60 * 1000
const WARN_MSG = 'Your session expires in under 5 minutes — save now and sign in again to extend.'

// `getExpiryMs` lets each area read its OWN token's expiry (admin vs presentations).
export function useSessionExpiry(active, onExpire, getExpiryMs = adminTokenExpiryMs) {
  const [warning, setWarning] = useState('')
  const warnRef = useRef(null)
  const expiryRef = useRef(null)

  useEffect(() => {
    clearTimeout(warnRef.current)
    clearTimeout(expiryRef.current)
    setWarning('')
    if (!active) return

    const expMs = getExpiryMs()
    if (!expMs) return
    const untilExp = expMs - Date.now()
    if (untilExp <= 0) {
      onExpire()
      return
    }

    const untilWarn = untilExp - EXPIRY_WARN_MS
    if (untilWarn > 0) {
      warnRef.current = setTimeout(() => setWarning(WARN_MSG), untilWarn)
    } else {
      setWarning(WARN_MSG)
    }
    expiryRef.current = setTimeout(() => {
      setWarning('')
      onExpire()
    }, untilExp)

    return () => {
      clearTimeout(warnRef.current)
      clearTimeout(expiryRef.current)
    }
  }, [active, onExpire, getExpiryMs])

  return warning
}
