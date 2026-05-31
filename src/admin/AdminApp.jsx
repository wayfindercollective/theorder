/**
 * Admin app entry — switches between Login and Editor based on token presence.
 * Owns: token state, content load, save state, session-expiry timer.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearToken,
  fetchContent,
  getToken,
  getTokenExpiryMs,
  humanizeError,
  login as apiLogin,
  saveContent,
} from './adminApi.js'
import { AdminLogin } from './AdminLogin.jsx'
import { AdminEditor } from './AdminEditor.jsx'

const EXPIRY_WARN_MS = 5 * 60 * 1000

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)
  const [expiryWarning, setExpiryWarning] = useState('')
  const warnTimerRef = useRef(null)
  const expiryTimerRef = useRef(null)

  const signOut = useCallback(() => {
    clearToken()
    setAuthed(false)
    setContent(null)
  }, [])

  // Schedule session-expiry warning + auto-redirect based on JWT exp.
  useEffect(() => {
    clearTimeout(warnTimerRef.current)
    clearTimeout(expiryTimerRef.current)
    setExpiryWarning('')
    if (!authed) return

    const expMs = getTokenExpiryMs()
    if (!expMs) return
    const now = Date.now()
    const untilExp = expMs - now
    if (untilExp <= 0) {
      signOut()
      return
    }

    const untilWarn = untilExp - EXPIRY_WARN_MS
    if (untilWarn > 0) {
      warnTimerRef.current = setTimeout(() => {
        setExpiryWarning('Your session expires in under 5 minutes — save now and sign in again to extend.')
      }, untilWarn)
    } else {
      // Already inside the warn window
      setExpiryWarning('Your session expires in under 5 minutes — save now and sign in again to extend.')
    }
    expiryTimerRef.current = setTimeout(() => {
      setExpiryWarning('')
      signOut()
    }, untilExp)

    return () => {
      clearTimeout(warnTimerRef.current)
      clearTimeout(expiryTimerRef.current)
    }
  }, [authed, signOut])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const c = await fetchContent()
      setContent(c)
    } catch (err) {
      const raw = err?.message || 'load failed'
      setError(humanizeError(err))
      if (err?.status === 401 || /401|invalid|missing|expired/i.test(raw)) {
        signOut()
      }
    } finally {
      setLoading(false)
    }
  }, [signOut])

  useEffect(() => {
    if (authed) load()
  }, [authed, load])

  const onLogin = useCallback(async (password) => {
    setError('')
    setLoading(true)
    try {
      await apiLogin(password)
      setAuthed(true)
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const onSave = useCallback(async (next) => {
    setError('')
    setLoading(true)
    try {
      await saveContent(next)
      setContent(next)
      return { ok: true }
    } catch (err) {
      const human = humanizeError(err)
      setError(human)
      if (err?.status === 401) signOut()
      return { ok: false, error: human }
    } finally {
      setLoading(false)
    }
  }, [signOut])

  if (!authed) {
    return <AdminLogin onLogin={onLogin} loading={loading} error={error} />
  }

  return (
    <>
      {expiryWarning && (
        <div className="admin-expiry-banner">{expiryWarning}</div>
      )}
      <AdminEditor
        content={content}
        loading={loading}
        error={error}
        onSave={onSave}
        onLogout={signOut}
      />
    </>
  )
}
