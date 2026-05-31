/**
 * ImagesTab — bind images to each section slot.
 *
 * Each slot row: thumbnail + Upload + Pick from library.
 * Upload goes to Vercel Blob; "Pick" opens a modal that lists existing
 * uploads so we can reuse them instead of re-uploading.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { humanizeError, listImages, uploadImage } from '../adminApi.js'

const IMAGE_SLOTS = [
  { key: ['hero', '__heroFilm__'], label: 'Hero — film fallback frame', heroFilm: true },
  { key: ['truth', 'image'],       label: 'The Truth' },
  { key: ['code', 'image'],        label: 'The Code (optional)' },
  { key: ['become', 'image'],      label: 'What You Become (full-bleed)' },
  { key: ['considered', 'image'],  label: 'Who Is Considered' },
  { key: ['application', 'image'], label: 'Application (full-bleed)' },
  { key: ['founder', 'image'],     label: 'From the Founder (full-bleed)' },
  { key: ['faq', 'image'],         label: 'FAQ (optional)' },
]

function getAt(obj, path) {
  let cur = obj
  for (const k of path) { if (cur == null) return undefined; cur = cur[k] }
  return cur
}
function setAt(obj, path, value) {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const isArrayKey = typeof head === 'number'
  const next = isArrayKey ? (Array.isArray(obj) ? [...obj] : []) : { ...(obj || {}) }
  next[head] = setAt(next[head], rest, value)
  return next
}

function PickerModal({ open, onPick, onClose }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    listImages()
      .then((r) => setImages(r.images || []))
      .catch((err) => setError(humanizeError(err)))
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="library-modal-backdrop" onClick={onClose}>
      <div className="library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="library-modal-head">
          <span className="display">Pick from library</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        {loading && <p className="restraint">Loading…</p>}
        {error && <p className="qs-error">{error}</p>}
        {!loading && !error && images.length === 0 && (
          <p className="restraint admin-image-empty">No uploads yet.</p>
        )}
        <div className="library-grid library-grid-modal">
          {images.map((img) => (
            <button
              key={img.url}
              type="button"
              className="library-thumb"
              onClick={() => { onPick(img.url); onClose() }}
              title={img.pathname}
            >
              <img src={img.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ImageRow({ slot, sections, onChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  const currentSrc = slot.heroFilm
    ? getAt(sections, ['heroFilm', 'frames', 0, 'src'])
    : getAt(sections, slot.key)

  const writeUrl = useCallback((url) => {
    onChange((cur) => {
      if (slot.heroFilm) {
        return setAt(cur, ['heroFilm', 'frames'], [{ src: url }])
      }
      return setAt(cur, slot.key, url)
    })
  }, [onChange, slot])

  const pick = () => fileRef.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await uploadImage(file)
      writeUrl(url)
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="admin-image-row">
      <div className="admin-image-thumb">
        {currentSrc ? (
          <img src={currentSrc} alt="" />
        ) : (
          <span className="restraint admin-image-empty">— no image —</span>
        )}
      </div>
      <div className="admin-image-meta">
        <span className="display admin-image-label">{slot.label}</span>
        <code className="admin-image-src">{currentSrc || ''}</code>
        {error && <span className="qs-error">{error}</span>}
      </div>
      <div className="admin-image-actions">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onFile}
          style={{ display: 'none' }}
        />
        <button className="btn btn-ghost" type="button" onClick={pick} disabled={busy}>
          {busy ? 'Uploading…' : currentSrc ? 'Replace' : 'Upload'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => setPickerOpen(true)} disabled={busy}>
          Pick from library
        </button>
      </div>
      <PickerModal open={pickerOpen} onPick={writeUrl} onClose={() => setPickerOpen(false)} />
    </div>
  )
}

export function ImagesTab({ sections, onChange }) {
  return (
    <div className="admin-tab-pane">
      <p className="restraint admin-tab-intro">
        Upload a replacement image for any section, or pick one you already uploaded. Max 8 MB.
        JPG, PNG, or WebP. Phone photos are auto-shrunk before upload. After save, the new image
        goes live in ~30 seconds.
      </p>

      {IMAGE_SLOTS.map((slot) => (
        <ImageRow key={slot.label} slot={slot} sections={sections} onChange={onChange} />
      ))}
    </div>
  )
}
