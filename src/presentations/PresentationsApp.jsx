/**
 * Presentations app entry — auth gate (same admin password / JWT) then the deck
 * manager or editor. Lazy-loaded from App.jsx so the public site never ships it.
 */
import { useCallback, useState } from 'react'
import { getToken, clearToken, login as apiLogin, humanizeError } from '../admin/adminApi.js'
import { AdminLogin } from '../admin/AdminLogin.jsx'
import { useSessionExpiry } from '../lib/useSessionExpiry.js'
import { DeckManager } from './DeckManager.jsx'
import { DeckEditor } from './DeckEditor.jsx'
import './presentations.css'

export default function PresentationsApp() {
  const [authed, setAuthed] = useState(() => !!getToken())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState(null)   // existing deck id being edited
  const [draftNew, setDraftNew] = useState(null) // a brand-new unsaved deck

  const signOut = useCallback(() => {
    clearToken()
    setAuthed(false)
    setOpenId(null)
    setDraftNew(null)
  }, [])

  const expiryWarning = useSessionExpiry(authed, signOut)

  const onLogin = useCallback(async (password) => {
    setError('')
    setLoading(true)
    try { await apiLogin(password); setAuthed(true) }
    catch (e) { setError(humanizeError(e)) }
    finally { setLoading(false) }
  }, [])

  const closeEditor = useCallback(() => { setOpenId(null); setDraftNew(null) }, [])

  if (!authed) {
    return (
      <AdminLogin
        onLogin={onLogin}
        loading={loading}
        error={error}
        eyebrow="The Order Presentations"
        title="Enter to present."
      />
    )
  }

  const editing = openId || draftNew

  return (
    <>
      {expiryWarning && <div className="admin-expiry-banner">{expiryWarning}</div>}
      {editing ? (
        <DeckEditor deckId={openId} newDeck={draftNew} onClose={closeEditor} onSignOut={signOut} />
      ) : (
        <DeckManager onOpen={setOpenId} onNew={setDraftNew} onSignOut={signOut} />
      )}
    </>
  )
}
