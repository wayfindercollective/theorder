/**
 * Admin app entry — switches between Login and Editor based on token presence.
 * Owns: token state, content load, save state.
 */

import { useCallback, useEffect, useState } from 'react'
import { clearToken, fetchContent, getToken, saveContent, login as apiLogin } from './adminApi.js'
import { AdminLogin } from './AdminLogin.jsx'
import { AdminEditor } from './AdminEditor.jsx'

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const c = await fetchContent()
      setContent(c)
    } catch (err) {
      const msg = err?.message || 'load failed'
      setError(msg)
      if (/401|invalid|missing/i.test(msg)) {
        clearToken()
        setAuthed(false)
      }
    } finally {
      setLoading(false)
    }
  }, [])

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
      setError(err?.message || 'login failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const onLogout = useCallback(() => {
    clearToken()
    setAuthed(false)
    setContent(null)
  }, [])

  const onSave = useCallback(async (next) => {
    setError('')
    setLoading(true)
    try {
      await saveContent(next)
      setContent(next)
      return { ok: true }
    } catch (err) {
      const msg = err?.message || 'save failed'
      setError(msg)
      return { ok: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  if (!authed) {
    return <AdminLogin onLogin={onLogin} loading={loading} error={error} />
  }

  return (
    <AdminEditor
      content={content}
      loading={loading}
      error={error}
      onSave={onSave}
      onLogout={onLogout}
    />
  )
}
