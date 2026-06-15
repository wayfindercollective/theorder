/**
 * Admin app entry — switches between Login and Editor based on token presence.
 * Owns: token state, content load, save state, session-expiry timer.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  clearToken,
  fetchContent,
  getToken,
  humanizeError,
  login as apiLogin,
  saveContent,
} from './adminApi.js'
import { AdminLogin } from './AdminLogin.jsx'
import { AdminEditor } from './AdminEditor.jsx'
import { useSessionExpiry } from '../lib/useSessionExpiry.js'

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)

  const signOut = useCallback(() => {
    clearToken()
    setAuthed(false)
    setContent(null)
  }, [])

  // Session-expiry warning + auto sign-out, shared with the presentations app.
  const expiryWarning = useSessionExpiry(authed, signOut)

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
