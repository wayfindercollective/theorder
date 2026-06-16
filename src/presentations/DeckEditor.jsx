/**
 * The deck editor: a vertical scroll of 16:9 stages (hero first, then editable
 * slides), a toolbar (title / save / present / back / sign out), add-slide,
 * delete, and reorder (up/down buttons + drag handle). Autosaves a localStorage
 * draft on every change as a crash/expiry backstop; explicit Save pushes to Blob.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getDeck, saveDeck, humanizeError } from './presentationsApi.js'
import { blankSlideForIndex } from './siteImages.js'
import { PresHero } from './PresHero.jsx'
import { Slide } from './Slide.jsx'

const newId = () => crypto.randomUUID()
// v2: rich-text drafts. The version suffix invalidates any stale pre-rich draft
// (plain-text era) so it can't be restored and rendered as HTML.
const draftKey = (id) => `pres_draft_v2_${id}`

// Compare two decks ignoring server-owned timestamps, to tell whether a saved
// localStorage draft holds genuinely unsaved edits versus the server copy.
const withoutMeta = (d) => {
  if (!d) return ''
  const { createdAt, updatedAt, ...rest } = d
  return JSON.stringify(rest)
}
const sameContent = (a, b) => withoutMeta(a) === withoutMeta(b)

export function DeckEditor({ deckId, newDeck, onClose, onSignOut }) {
  const [deck, setDeck] = useState(newDeck || null)
  const [loading, setLoading] = useState(!newDeck)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(!!newDeck)
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const [present, setPresent] = useState(false)
  const [scrollToId, setScrollToId] = useState(null)
  const deckRef = useRef(null)
  const dragIndex = useRef(null)
  // Bumped on every edit; lets save() detect edits that landed mid-request.
  const revRef = useRef(0)

  // Load an existing deck — and offer to restore a newer localStorage draft if
  // a previous session crashed/expired before saving.
  useEffect(() => {
    if (newDeck) return
    let cancelled = false
    setLoading(true)
    getDeck(deckId)
      .then((server) => {
        if (cancelled) return
        let chosen = server
        try {
          const raw = localStorage.getItem(draftKey(deckId))
          if (raw) {
            const draft = JSON.parse(raw)
            if (draft && !sameContent(draft, server)) {
              if (window.confirm('Restore unsaved changes from your last session on this presentation?')) {
                chosen = draft
              } else {
                localStorage.removeItem(draftKey(deckId))
              }
            }
          }
        } catch { /* ignore an unreadable draft */ }
        setDeck(chosen)
        setDirty(chosen !== server)
      })
      .catch((e) => { if (!cancelled) setError(humanizeError(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [deckId, newDeck])

  // Autosave a draft ONLY while there are unsaved edits; clear it once clean so
  // a saved deck never leaves a stale draft that could later be mistaken for
  // unsaved work (e.g. after the same deck is edited on another device).
  useEffect(() => {
    if (!deck) return
    try {
      if (dirty) localStorage.setItem(draftKey(deck.id), JSON.stringify(deck))
      else localStorage.removeItem(draftKey(deck.id))
    } catch { /* quota / unavailable */ }
  }, [deck, dirty])

  // Warn on navigate-away with unsaved edits.
  useEffect(() => {
    const h = (e) => { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  // After adding a slide, scroll it into view so the new page appears right in
  // front of the user (the Add button then sits one page below it).
  useEffect(() => {
    if (!scrollToId) return
    const el = deckRef.current?.querySelector(`[data-page-id="${scrollToId}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setScrollToId(null)
  }, [scrollToId])

  const update = useCallback((fn) => {
    revRef.current += 1
    setDeck((d) => (d ? fn(d) : d))
    setDirty(true)
    setSavedTick(false)
  }, [])

  const onSlideChange = useCallback((sid, changes) =>
    update((d) => ({ ...d, slides: d.slides.map((s) => (s.id === sid ? { ...s, ...changes } : s)) })), [update])

  const onBoxChange = useCallback((sid, boxChanges) =>
    update((d) => ({ ...d, slides: d.slides.map((s) => (s.id === sid ? { ...s, box: { ...s.box, ...boxChanges } } : s)) })), [update])

  const addSlide = () => {
    const slide = blankSlideForIndex(deck.cursor, newId)
    update((d) => ({ ...d, cursor: d.cursor + 1, slides: [...d.slides, slide] }))
    setScrollToId(slide.id)
  }

  const deleteSlide = (sid) => {
    if (!window.confirm('Delete this slide?')) return
    update((d) => ({ ...d, slides: d.slides.filter((s) => s.id !== sid) }))
  }

  const reorder = (from, to) => update((d) => {
    if (to < 0 || to >= d.slides.length) return d
    const arr = [...d.slides]
    const [m] = arr.splice(from, 1)
    arr.splice(to, 0, m)
    return { ...d, slides: arr }
  })

  const save = async () => {
    if (!deck || saving) return
    const revAtSave = revRef.current
    setSaving(true)
    setError('')
    try {
      const saved = await saveDeck(deck)
      if (revRef.current === revAtSave) {
        // No edits landed during the request — adopt the server copy wholesale.
        setDeck(saved)
        setDirty(false)
        setSavedTick(true)
        try { localStorage.removeItem(draftKey(saved.id)) } catch { /* noop */ }
      } else {
        // Edits arrived mid-save — keep them, adopt only the server-owned
        // metadata, and stay dirty so the next Save persists the newer state.
        setDeck((d) => (d ? { ...d, createdAt: saved.createdAt } : d))
      }
    } catch (e) {
      setError(humanizeError(e))
    } finally {
      setSaving(false)
    }
  }

  const enterPresent = () => {
    setPresent(true)
    try { document.documentElement.requestFullscreen?.() } catch { /* unsupported */ }
  }
  const exitPresent = () => {
    setPresent(false)
    try { if (document.fullscreenElement) document.exitFullscreen?.() } catch { /* noop */ }
  }

  // Present-mode keyboard: scroll between stages, Escape to exit.
  useEffect(() => {
    if (!present) return
    const onKey = (e) => {
      const el = deckRef.current
      if (e.key === 'Escape') { exitPresent(); return }
      if (!el) return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: 'smooth' }) }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [present])

  if (loading) {
    return <div className="admin-loading"><p className="restraint">Loading presentation…</p></div>
  }
  if (!deck) {
    return (
      <div className="admin-loading">
        <p className="restraint">{error || 'Could not load this presentation.'}</p>
        <button type="button" className="btn pres-btn" onClick={onClose}>← Back</button>
      </div>
    )
  }

  const saveLabel = saving ? 'Saving…' : dirty ? 'Save' : savedTick ? 'Saved ✓' : 'Saved'

  return (
    <div className={`pres-editor${present ? ' is-present' : ''}`}>
      {!present && (
        <header className="pres-toolbar">
          <button type="button" className="pres-btn pres-btn-ghost" onClick={onClose} title="Back to presentations">←</button>
          <input
            className="pres-title-input"
            value={deck.title}
            onChange={(e) => update((d) => ({ ...d, title: e.target.value }))}
            placeholder="Untitled Presentation"
            aria-label="Presentation title"
          />
          {error && <span className="pres-toolbar-error">{error}</span>}
          <div className="pres-toolbar-right">
            <button type="button" className="pres-btn" onClick={save} disabled={saving || !dirty}>{saveLabel}</button>
            <button type="button" className="pres-btn pres-btn-primary" onClick={enterPresent}>Present</button>
            <button type="button" className="pres-btn pres-btn-ghost" onClick={onSignOut} title="Sign out">⎋</button>
          </div>
        </header>
      )}

      {present && (
        <button type="button" className="pres-exit" onClick={exitPresent} title="Exit (Esc)">Exit ⤢</button>
      )}

      <div className="pres-deck" ref={deckRef}>
        <div className="pres-page"><PresHero /></div>

        {deck.slides.map((slide, i) => (
          <div
            key={slide.id}
            className="pres-page"
            data-page-id={slide.id}
            onDragOver={present ? undefined : (e) => e.preventDefault()}
            onDrop={present ? undefined : (e) => {
              e.preventDefault()
              const from = dragIndex.current
              dragIndex.current = null
              if (from != null && from !== i) reorder(from, i)
            }}
          >
            <Slide
              slide={slide}
              index={i}
              total={deck.slides.length}
              present={present}
              onChange={(changes) => onSlideChange(slide.id, changes)}
              onBoxChange={(boxChanges) => onBoxChange(slide.id, boxChanges)}
              onDelete={() => deleteSlide(slide.id)}
              onMove={(dir) => reorder(i, i + dir)}
              dragProps={{
                onDragStart: () => { dragIndex.current = i },
                onDragEnd: () => { dragIndex.current = null },
              }}
            />
          </div>
        ))}

        {!present && (
          <div className="pres-page pres-add-page">
            <button type="button" className="pres-add-btn" onClick={addSlide}>+ Add slide</button>
          </div>
        )}
      </div>
    </div>
  )
}
