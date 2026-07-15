/**
 * The deck editor: a vertical scroll of 16:9 stages (hero first, then editable
 * slides), a toolbar (title / save / present / back / sign out), add-slide,
 * delete, and reorder (up/down buttons + drag handle). Autosaves a localStorage
 * draft on every change as a crash/expiry backstop; explicit Save pushes to Blob.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getDeck, saveDeck, humanizeError } from './presentationsApi.js'
import { blankCustomSlide, blankSlideForIndex } from './siteImages.js'
import { PresHero } from './PresHero.jsx'
import { Slide } from './Slide.jsx'
import { ImagePicker } from './ImagePicker.jsx'

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
  const [addPicker, setAddPicker] = useState(false)
  const deckRef = useRef(null)
  const dragIndex = useRef(null)
  // Bumped on every edit; lets save() detect edits that landed mid-request.
  const revRef = useRef(0)
  // When the last edit landed — autosave waits for typing to settle.
  const lastEditRef = useRef(0)
  const saveRef = useRef(null)

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
    lastEditRef.current = Date.now()
    setDeck((d) => (d ? fn(d) : d))
    setDirty(true)
    setSavedTick(false)
  }, [])

  // Autosave: once edits settle (15s idle), push to the server unprompted — a
  // forgotten Save can never cost more than the last few seconds of work. The
  // idle gate matters: adopting the server's sanitised copy mid-typing could
  // move the caret, so we only save when the keyboard has gone quiet.
  useEffect(() => {
    if (!dirty || saving) return
    const t = setInterval(() => {
      if (Date.now() - lastEditRef.current >= 15000) saveRef.current?.()
    }, 5000)
    return () => clearInterval(t)
  }, [dirty, saving])

  const onSlideChange = useCallback((sid, changes) =>
    update((d) => ({ ...d, slides: d.slides.map((s) => (s.id === sid ? { ...s, ...changes } : s)) })), [update])

  const onBoxChange = useCallback((sid, boxChanges) =>
    update((d) => ({ ...d, slides: d.slides.map((s) => (s.id === sid ? { ...s, box: { ...s.box, ...boxChanges } } : s)) })), [update])

  // Cycle position is read from the updater's own state (d.cursor), never the
  // closed-over deck — fast repeated adds can't reuse the same painting index.
  const addSlide = () => {
    const sid = newId()
    update((d) => ({
      ...d,
      cursor: d.cursor + 1,
      slides: [...d.slides, { ...blankSlideForIndex(d.cursor, newId), id: sid }],
    }))
    setScrollToId(sid)
  }

  // Insert a fresh slide (continuing the painting cycle, same as Add) directly
  // below an existing one — no more appending then walking it up the deck.
  const insertSlideBelow = (sid) => {
    const cid = newId()
    update((d) => {
      const i = d.slides.findIndex((s) => s.id === sid)
      if (i < 0) return d
      const arr = [...d.slides]
      arr.splice(i + 1, 0, { ...blankSlideForIndex(d.cursor, newId), id: cid })
      return { ...d, cursor: d.cursor + 1, slides: arr }
    })
    setScrollToId(cid)
  }

  // Add a slide on a hand-picked background: a painting-cycle index (number)
  // or a library image src (string). The cycle cursor is NOT advanced, so the
  // plain "+ Add slide" rotation continues exactly where it would have.
  const addSlideWithBackground = (val) => {
    setAddPicker(false)
    const slide = typeof val === 'number' ? blankSlideForIndex(val, newId) : blankCustomSlide(val, newId)
    update((d) => ({ ...d, slides: [...d.slides, slide] }))
    setScrollToId(slide.id)
  }

  const deleteSlide = (sid) => {
    if (!window.confirm('Delete this slide?')) return
    update((d) => ({ ...d, slides: d.slides.filter((s) => s.id !== sid) }))
  }

  // Deep-copy a slide (fresh ids throughout) and insert it right below.
  const duplicateSlide = (sid) => {
    const cid = newId()
    update((d) => {
      const i = d.slides.findIndex((s) => s.id === sid)
      if (i < 0) return d
      const src = d.slides[i]
      const copy = {
        ...src,
        id: cid,
        box: { ...src.box },
        extras: (src.extras || []).map((x) => ({ ...x, id: newId(), box: { ...x.box } })),
        images: (src.images || []).map((im) => ({ ...im, id: newId() })),
      }
      const arr = [...d.slides]
      arr.splice(i + 1, 0, copy)
      return { ...d, slides: arr }
    })
    setScrollToId(cid)
  }

  const reorder = (from, to) => update((d) => {
    if (to < 0 || to >= d.slides.length) return d
    const arr = [...d.slides]
    const [m] = arr.splice(from, 1)
    arr.splice(to, 0, m)
    return { ...d, slides: arr }
  })

  // Returns 'saved' (fully persisted, server copy adopted), 'partial' (edits
  // landed mid-request — still dirty by design), 'error', or 'busy'. The back
  // button uses this to know it is safe to close.
  const save = async () => {
    if (!deck || saving) return 'busy'
    if (!dirty) return 'saved'
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
        return 'saved'
      }
      // Edits arrived mid-save — keep them, adopt only the server-owned
      // metadata, and stay dirty so the next Save persists the newer state.
      setDeck((d) => (d ? { ...d, createdAt: saved.createdAt } : d))
      return 'partial'
    } catch (e) {
      setError(humanizeError(e))
      return 'error'
    } finally {
      setSaving(false)
    }
  }
  saveRef.current = save

  // Back saves first: close only once everything is persisted (or the user
  // explicitly accepts leaving with the localStorage draft as the backstop).
  const backSafely = async () => {
    if (!dirty) { onClose(); return }
    const r = await save()
    if (r === 'saved') { onClose(); return }
    if (r === 'error' && window.confirm(
      'Saving failed — leave anyway? Your changes stay on this device and will be offered next time you open this presentation.'
    )) onClose()
    // 'partial' / 'busy': stay in the editor — it is still dirty; try again.
  }

  // Ctrl/Cmd+S saves, same as the toolbar button.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        saveRef.current?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const enterPresent = () => {
    setPresent(true)
    try { document.documentElement.requestFullscreen?.() } catch { /* unsupported */ }
  }
  const exitPresent = () => {
    setPresent(false)
    try { if (document.fullscreenElement) document.exitFullscreen?.() } catch { /* noop */ }
  }

  // Present-mode keyboard: scroll between stages (←/→ included for clickers),
  // Escape to exit.
  useEffect(() => {
    if (!present) return
    const onKey = (e) => {
      const el = deckRef.current
      if (e.key === 'Escape') { exitPresent(); return }
      if (!el) return
      if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); el.scrollBy({ top: el.clientHeight, behavior: 'smooth' }) }
      if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); el.scrollBy({ top: -el.clientHeight, behavior: 'smooth' }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [present])

  // Browsers exit fullscreen on Escape WITHOUT delivering the keydown — sync
  // present mode to the real fullscreen state so the editor never strands
  // chrome-less. (If fullscreen never engaged, no event fires; presenting in a
  // plain window is unaffected.)
  useEffect(() => {
    if (!present) return
    const onFsChange = () => { if (!document.fullscreenElement) setPresent(false) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
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
          <button type="button" className="pres-btn pres-btn-ghost" onClick={backSafely} title="Back to presentations (saves first)">←</button>
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
              onDuplicate={() => duplicateSlide(slide.id)}
              onInsertBelow={() => insertSlideBelow(slide.id)}
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
            <div className="pres-add-wrap">
              <button type="button" className="pres-add-btn" onClick={addSlide}>+ Add slide</button>
              <button type="button" className="pres-add-btn pres-add-btn-alt" onClick={() => setAddPicker(true)}>
                + Add slide — pick its background…
              </button>
              <p className="pres-add-hint">
                “Add slide” continues the painting cycle. “Pick its background” starts the new slide on any painting or library image instead.
              </p>
            </div>
            {addPicker && (
              <ImagePicker mode="background" onPick={addSlideWithBackground} onClose={() => setAddPicker(false)} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
