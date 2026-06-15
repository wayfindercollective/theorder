/**
 * The presentations home: list saved decks, create a new one (a blank mirror of
 * the site), open / rename / delete. The list endpoint returns full decks, so
 * rename edits the in-hand object and re-saves without an extra round-trip.
 */
import { useEffect, useState } from 'react'
import { listDecks, deleteDeck, saveDeck, humanizeError } from './presentationsApi.js'
import { buildDefaultDeck } from './siteImages.js'

const newId = () => crypto.randomUUID()

function fmtDate(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString() } catch { return '' }
}

export function DeckManager({ onOpen, onNew, onSignOut }) {
  const [decks, setDecks] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setError('')
    try { setDecks(await listDecks()) }
    catch (e) { setError(humanizeError(e)); setDecks([]) }
  }
  useEffect(() => { load() }, [])

  const createNew = () => onNew(buildDefaultDeck(newId))

  const rename = async (deck) => {
    const t = window.prompt('Presentation title', deck.title)
    if (t == null) return
    setBusy(true)
    try { await saveDeck({ ...deck, title: t.trim() || deck.title }); await load() }
    catch (e) { setError(humanizeError(e)) }
    finally { setBusy(false) }
  }

  const remove = async (deck) => {
    if (!window.confirm(`Delete “${deck.title}”? This cannot be undone.`)) return
    setBusy(true)
    try { await deleteDeck(deck.id); await load() }
    catch (e) { setError(humanizeError(e)) }
    finally { setBusy(false) }
  }

  return (
    <div className="pres-manager">
      <header className="pres-toolbar">
        <div className="eyebrow"><span className="brass-rule" /> The Order Presentations <span className="brass-rule" /></div>
        <div className="pres-toolbar-right">
          <button type="button" className="pres-btn pres-btn-primary" onClick={createNew}>+ New presentation</button>
          <button type="button" className="pres-btn pres-btn-ghost" onClick={onSignOut} title="Sign out">⎋</button>
        </div>
      </header>

      <div className="pres-manager-body">
        {error && <p className="pres-manager-error qs-error">{error}</p>}

        {decks == null ? (
          <p className="restraint">Loading…</p>
        ) : decks.length === 0 ? (
          <div className="pres-empty">
            <p className="restraint">No presentations yet.</p>
            <button type="button" className="pres-btn pres-btn-primary" onClick={createNew}>Create your first</button>
          </div>
        ) : (
          <ul className="pres-deck-list">
            {decks.map((deck) => (
              <li key={deck.id} className="pres-deck-card">
                <button type="button" className="pres-deck-open" onClick={() => onOpen(deck.id)}>
                  <span className="pres-deck-title display">{deck.title}</span>
                  <span className="pres-deck-meta restraint">
                    {(deck.slides?.length ?? 0) + 1} pages · updated {fmtDate(deck.updatedAt)}
                  </span>
                </button>
                <div className="pres-deck-actions">
                  <button type="button" className="pres-btn pres-btn-ghost" disabled={busy} onClick={() => rename(deck)}>Rename</button>
                  <button type="button" className="pres-btn pres-btn-ghost pres-danger" disabled={busy} onClick={() => remove(deck)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
