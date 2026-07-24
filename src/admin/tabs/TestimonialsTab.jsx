/**
 * TestimonialsTab — the full editor for the Testimonials section.
 *
 * Everything about a testimonial lives here: the section's own copy, and the
 * cards themselves — add, remove, reorder, and swap between a video clip and a
 * written quote. (The Sections tab used to carry four hard-coded card slots,
 * which meant a fifth testimonial needed a developer.)
 *
 * Card shape is unchanged, so existing cards keep working untouched:
 *
 *   { type, video, poster, title, quote, attribution }
 *
 * `type` ('video' | 'quote') is the only addition. It says which half of the
 * card the site should render, so switching a card to a written quote doesn't
 * throw away the clip it had — flip back and it's still there. Cards saved
 * before this existed have no `type`; those fall back to "video if it has one",
 * exactly what the site did before.
 *
 * Clips upload STRAIGHT to Vercel Blob (see adminApi.uploadVideo) — they are
 * far too big to pass through a serverless function. Poster frames are grabbed
 * from the clip in the browser and uploaded down the normal image path, because
 * a tile with no poster is a black rectangle until it scrolls into view.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  deleteVideo,
  humanizeError,
  listVideos,
  uploadImage,
  uploadVideo,
} from '../adminApi.js'
import { ImagePickerModal } from '../ImagePickerModal.jsx'
import { posterFromFile, posterFromUrl } from '../videoPoster.js'
import { videoLibraryFrom, freshVideoUploads, videoUploadLabel } from '../../lib/videoLibrary.js'
import { RichText } from '../../components/ui/RichText.jsx'

// Past this a clip is the slowest thing on the page — the bundled ones are
// 6–17 MB AFTER compression, so this is a nudge, not a wall.
const BIG_CLIP_BYTES = 25 * 1024 * 1024

const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/x-m4v'

const EMPTY_CARD = { type: 'video', video: '', poster: '', title: '', quote: '', attribution: '' }

// A card with no `type` predates this editor: it's a video card if it has a
// clip. Matches how the public section has always decided.
const cardType = (c) => c?.type || (c?.video ? 'video' : 'quote')

function bytes(n) {
  if (!n) return ''
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function moveItem(arr, from, to) {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

// The name shown in the card's own header, so a long list stays scannable.
function cardName(card) {
  if (cardType(card) === 'video') return card.title?.trim() || 'New video testimonial'
  const q = card.quote?.trim()
  if (!q) return 'New written testimonial'
  return q.length > 60 ? `“${q.slice(0, 60)}…”` : `“${q}”`
}

/* ── Clip picker ─────────────────────────────────────────────────────────── */

function VideoPickerModal({ open, sections, onPick, onClose }) {
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    setError('')
    listVideos()
      .then((r) => setUploads(r.videos || []))
      .catch((err) => setError(humanizeError(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (open) refresh() }, [open, refresh])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const known = videoLibraryFrom(sections)
  const fresh = freshVideoUploads(uploads, known)
  // A clip still referenced anywhere in the draft must not be deletable — the
  // same fail-closed rule the image library uses.
  const draftJson = JSON.stringify(sections || {})

  const removeUpload = async (video) => {
    if (draftJson.includes(video.url)) {
      window.alert('This clip can’t be deleted — a testimonial still uses it. Remove that testimonial first.')
      return
    }
    if (!window.confirm('Delete this clip from storage? This cannot be undone.')) return
    try {
      await deleteVideo(video.url)
      setUploads((xs) => xs.filter((x) => x.url !== video.url))
    } catch (err) {
      setError(humanizeError(err))
    }
  }

  return (
    <div className="library-modal-backdrop" onClick={onClose}>
      <div className="library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="library-modal-head">
          <span className="display">Choose a clip</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        {error && <p className="qs-error">{error}</p>}

        <section className="library-group">
          <h3 className="library-group-title">On the website</h3>
          <div className="library-grid library-grid-modal">
            {known.map((it) => (
              <button
                key={it.src}
                type="button"
                className="library-pick-item"
                onClick={() => { onPick(it); onClose() }}
                title={it.label}
              >
                <span className="tm-pick-thumb">
                  <video src={it.src} poster={it.poster || undefined} preload="metadata" muted playsInline />
                </span>
                <span className="library-pick-label">{it.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="library-group">
          <h3 className="library-group-title">Uploaded clips{fresh.length > 0 && <> · {fresh.length}</>}</h3>
          {loading && <p className="restraint">Loading…</p>}
          {!loading && fresh.length === 0 && (
            <p className="restraint admin-image-empty">
              Nothing here yet — “Upload a clip” on a testimonial puts it in this list.
            </p>
          )}
          <div className="library-grid library-grid-modal">
            {fresh.map((v) => (
              <div key={v.url} className="tm-pick-upload">
                <button
                  type="button"
                  className="library-pick-item"
                  onClick={() => { onPick({ src: v.url, poster: '', label: videoUploadLabel(v) }); onClose() }}
                  title={videoUploadLabel(v)}
                >
                  <span className="tm-pick-thumb">
                    <video src={v.url} preload="metadata" muted playsInline />
                  </span>
                  <span className="library-pick-label">{videoUploadLabel(v)}</span>
                </button>
                <div className="library-meta-line">
                  <span>{bytes(v.size)}</span>
                  <button type="button" className="btn btn-ghost library-delete" onClick={() => removeUpload(v)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

/* ── One testimonial ─────────────────────────────────────────────────────── */

function TestimonialCard({ card, index, total, sections, onPatch, onMove, onRemove }) {
  const fileRef = useRef(null)
  const posterFileRef = useRef(null)
  const [busy, setBusy] = useState('')      // '' | 'video' | 'poster'
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [clipPickerOpen, setClipPickerOpen] = useState(false)
  const [posterPickerOpen, setPosterPickerOpen] = useState(false)

  const type = cardType(card)
  const isVideo = type === 'video'

  const set = (key, value) => onPatch({ [key]: value })

  // Poster capture is best-effort everywhere it's used: a missing poster is a
  // slower-looking tile, never a broken one, so a failure only ever leaves a
  // note asking for a still by hand.
  const capturePoster = async (source, { fromFile }) => {
    const posterFile = fromFile ? await posterFromFile(source) : await posterFromUrl(source)
    if (!posterFile) return null
    const { url } = await uploadImage(posterFile)
    return url
  }

  const onVideoFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy('video')
    setError('')
    setNote('')
    setProgress(0)
    try {
      // Grab the poster BEFORE the upload: reading the local file is instant
      // and can't fail on CORS the way reading it back from Blob might.
      let posterUrl = null
      try { posterUrl = await capturePoster(file, { fromFile: true }) } catch { posterUrl = null }

      const { url } = await uploadVideo(file, setProgress)
      onPatch({ video: url, type: 'video', ...(posterUrl ? { poster: posterUrl } : {}) })

      const warnings = []
      if (!posterUrl) warnings.push('a still couldn’t be captured from this clip — add a poster image below')
      if (file.size > BIG_CLIP_BYTES) {
        warnings.push(`this clip is ${bytes(file.size)} — large clips slow the page down, so ask Nathan to compress it`)
      }
      setNote(warnings.length ? `Uploaded, but ${warnings.join('; ')}.` : 'Uploaded — poster frame captured automatically.')
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy('')
      setProgress(0)
    }
  }

  const onPosterFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy('poster')
    setError('')
    setNote('')
    try {
      const { url } = await uploadImage(file)
      set('poster', url)
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy('')
    }
  }

  const grabFrame = async () => {
    if (!card.video) return
    setBusy('poster')
    setError('')
    setNote('')
    try {
      const url = await capturePoster(card.video, { fromFile: false })
      if (url) {
        set('poster', url)
        setNote('Poster captured from the clip.')
      } else {
        setError('Could not read a frame from that clip. Upload a still instead.')
      }
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy('')
    }
  }

  const pickClip = (clip) => {
    // Picking a bundled clip brings its poster along, but never clobbers a
    // poster already chosen for this card.
    onPatch({ video: clip.src, type: 'video', ...(clip.poster && !card.poster ? { poster: clip.poster } : {}) })
  }

  const locked = !!busy

  return (
    <section className="admin-section-block">
      <div className="admin-q-header">
        <h2 className="admin-section-title display">
          {index + 1} — {cardName(card)}
        </h2>
        <div className="admin-q-toolbar">
          <button
            type="button" className="admin-mini-btn" title="Move up" aria-label="Move testimonial up"
            onClick={() => onMove(-1)} disabled={index === 0 || locked}
          >↑</button>
          <button
            type="button" className="admin-mini-btn" title="Move down" aria-label="Move testimonial down"
            onClick={() => onMove(1)} disabled={index >= total - 1 || locked}
          >↓</button>
          <button
            type="button" className="admin-mini-btn admin-mini-danger" title="Remove testimonial" aria-label="Remove testimonial"
            onClick={onRemove} disabled={locked}
          >✕</button>
        </div>
      </div>

      <div className="tm-type" role="group" aria-label="Testimonial kind">
        <button
          type="button"
          className={'tm-type-btn' + (isVideo ? ' is-active' : '')}
          onClick={() => set('type', 'video')}
        >Video clip</button>
        <button
          type="button"
          className={'tm-type-btn' + (!isVideo ? ' is-active' : '')}
          onClick={() => set('type', 'quote')}
        >Written quote</button>
      </div>

      {isVideo ? (
        <div className="tm-body">
          <div className="tm-preview">
            {card.video ? (
              <video src={card.video} poster={card.poster || undefined} controls preload="none" />
            ) : (
              <span className="restraint admin-image-empty">— no clip yet —</span>
            )}
          </div>

          <div className="admin-fields">
            <div className="admin-field">
              <span className="admin-field-label">Clip</span>
              <div className="tm-actions">
                <input
                  ref={fileRef}
                  type="file"
                  accept={VIDEO_ACCEPT}
                  hidden
                  onChange={onVideoFile}
                />
                <button
                  type="button" className="btn btn-ghost"
                  onClick={() => fileRef.current?.click()} disabled={locked}
                >
                  {busy === 'video'
                    ? `Uploading ${progress}%…`
                    : card.video ? 'Replace clip' : 'Upload a clip'}
                </button>
                <button
                  type="button" className="btn btn-ghost"
                  onClick={() => setClipPickerOpen(true)} disabled={locked}
                >
                  Choose existing
                </button>
              </div>
              {busy === 'video' && (
                <div className="tm-progress"><span style={{ width: `${progress}%` }} /></div>
              )}
              <input
                className="input-field admin-image-src-input"
                type="text"
                value={card.video ?? ''}
                placeholder="/testimonials/name.mp4"
                onChange={(e) => set('video', e.target.value)}
              />
              <span className="admin-field-hint">
                MP4 works everywhere. Uploading also captures the still frame below automatically.
                You can paste a path here instead if the clip is already on the site.
              </span>
            </div>

            <div className="admin-field">
              <span className="admin-field-label">Still frame (poster)</span>
              <div className="tm-actions">
                <div className="tm-poster-thumb">
                  {card.poster
                    ? <img src={card.poster} alt="" />
                    : <span className="restraint admin-image-empty">none</span>}
                </div>
                <input
                  ref={posterFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={onPosterFile}
                />
                <button
                  type="button" className="btn btn-ghost"
                  onClick={() => posterFileRef.current?.click()} disabled={locked}
                >
                  {busy === 'poster' ? 'Working…' : 'Upload'}
                </button>
                <button
                  type="button" className="btn btn-ghost"
                  onClick={grabFrame} disabled={locked || !card.video}
                >
                  Grab from clip
                </button>
                <button
                  type="button" className="btn btn-ghost"
                  onClick={() => setPosterPickerOpen(true)} disabled={locked}
                >
                  Pick from library
                </button>
              </div>
              <input
                className="input-field admin-image-src-input"
                type="text"
                value={card.poster ?? ''}
                placeholder="/testimonials/name-poster.jpg"
                onChange={(e) => set('poster', e.target.value)}
              />
              <span className="admin-field-hint">
                What the tile shows before the clip loads. Without it the tile is black until
                the visitor scrolls to it.
              </span>
            </div>

            <label className="admin-field">
              <span className="admin-field-label">Caption</span>
              <input
                className="input-field"
                type="text"
                value={card.title ?? ''}
                placeholder="Tony Litster — Entrepreneur, coach and real estate developer"
                onChange={(e) => set('title', e.target.value)}
              />
              <span className="admin-field-hint">
                Shown under the clip. Name first, then what they do. Leave blank to hide.
              </span>
            </label>
          </div>
        </div>
      ) : (
        <div className="admin-fields">
          <label className="admin-field">
            <span className="admin-field-label">Quote</span>
            <textarea
              className="input-field admin-textarea"
              rows={4}
              value={card.quote ?? ''}
              onChange={(e) => set('quote', e.target.value)}
            />
            <span className="admin-field-hint">What he said, in his words. No quote marks needed — the card draws its own.</span>
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Name</span>
            <input
              className="input-field"
              type="text"
              value={card.attribution ?? ''}
              placeholder="— James, Selection 2025"
              onChange={(e) => set('attribution', e.target.value)}
            />
          </label>
        </div>
      )}

      {error && <p className="qs-error">{error}</p>}
      {!error && note && <p className="admin-field-hint tm-note">{note}</p>}
      {isVideo && !card.video && (
        <p className="admin-field-hint tm-warn">
          ⚠ This testimonial has no clip yet, so it will NOT appear on the site until one is added.
        </p>
      )}
      {isVideo && card.video && !card.poster && (
        <p className="admin-field-hint tm-warn">
          ⚠ No still frame — the tile will be black until the visitor scrolls to it. Use “Grab from clip”.
        </p>
      )}
      {!isVideo && !card.quote?.trim() && (
        <p className="admin-field-hint tm-warn">
          ⚠ This testimonial has no quote yet, so it will NOT appear on the site.
        </p>
      )}

      <VideoPickerModal
        open={clipPickerOpen}
        sections={sections}
        onPick={pickClip}
        onClose={() => setClipPickerOpen(false)}
      />
      <ImagePickerModal
        open={posterPickerOpen}
        sections={sections}
        onPick={(src) => set('poster', src)}
        onClose={() => setPosterPickerOpen(false)}
      />
    </section>
  )
}

/* ── The tab ─────────────────────────────────────────────────────────────── */

export function TestimonialsTab({ sections, onChange }) {
  const evidence = sections?.evidence || {}
  const cards = evidence.cards || []

  const updateEvidence = useCallback((patch) => {
    onChange((cur) => ({ ...cur, evidence: { ...(cur.evidence || {}), ...patch } }))
  }, [onChange])

  const updateCards = useCallback((fn) => {
    onChange((cur) => ({
      ...cur,
      evidence: { ...(cur.evidence || {}), cards: fn(cur.evidence?.cards || []) },
    }))
  }, [onChange])

  const patchCard = (i, patch) =>
    updateCards((list) => list.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  const moveCard = (i, dir) => updateCards((list) => moveItem(list, i, i + dir))

  const removeCard = (i) => {
    if (!window.confirm(`Remove testimonial ${i + 1} — ${cardName(cards[i] || {})}?\n\nThe clip itself stays in storage; only this card goes.`)) return
    updateCards((list) => list.filter((_, j) => j !== i))
  }

  const addCard = (type) => updateCards((list) => [...list, { ...EMPTY_CARD, type }])

  const live = cards.filter((c) =>
    cardType(c) === 'video' ? !!c.video : !!c.quote?.trim(),
  ).length

  return (
    <div className="admin-tab-pane">
      <p className="restraint admin-tab-intro">
        The testimonials that drift across the Testimonials section, in the order they appear.
        Add as many as you like, reorder them with the arrows, remove with ✕. A testimonial is
        either a video clip or a written quote. Nothing goes live until you press Save —
        then it takes about 30 seconds.
      </p>

      <section className="admin-section-block">
        <h2 className="admin-section-title display">Section heading</h2>
        <div className="admin-fields">
          <label className="admin-field">
            <span className="admin-field-label">Numeral / eyebrow</span>
            <input
              className="input-field"
              type="text"
              value={evidence.eyebrow ?? ''}
              onChange={(e) => updateEvidence({ eyebrow: e.target.value })}
            />
            <span className="admin-field-hint">Small numeral above the heading. e.g. IV</span>
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Heading</span>
            <RichText
              value={evidence.heading ?? ''}
              mode="inline"
              withLink
              onChange={(v) => updateEvidence({ heading: v })}
              className="admin-rich"
            />
            <span className="admin-field-hint">e.g. Testimonials</span>
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Intro line</span>
            <RichText
              value={evidence.intro ?? ''}
              mode="inline"
              withLink
              onChange={(v) => updateEvidence({ intro: v })}
              className="admin-rich"
            />
            <span className="admin-field-hint">Optional line under the heading. Leave blank to hide.</span>
          </label>
        </div>
        <p className="admin-field-hint">
          The painting behind this section is set under the Images tab.
        </p>
      </section>

      {cards.length === 0 && (
        <p className="restraint admin-image-empty">
          No testimonials yet — add one below. With none at all, the section is hidden on the site.
        </p>
      )}

      {cards.map((card, i) => (
        <TestimonialCard
          key={i}
          card={card}
          index={i}
          total={cards.length}
          sections={sections}
          onPatch={(patch) => patchCard(i, patch)}
          onMove={(dir) => moveCard(i, dir)}
          onRemove={() => removeCard(i)}
        />
      ))}

      <div className="admin-q-footer">
        <div className="tm-actions">
          <button type="button" className="admin-add-btn" onClick={() => addCard('video')}>
            + Add video testimonial
          </button>
          <button type="button" className="admin-add-btn" onClick={() => addCard('quote')}>
            + Add written testimonial
          </button>
        </div>
        <p className="admin-field-hint">
          {live} of {cards.length} {cards.length === 1 ? 'testimonial is' : 'testimonials are'} complete
          and will show on the site.
        </p>
      </div>
    </div>
  )
}
