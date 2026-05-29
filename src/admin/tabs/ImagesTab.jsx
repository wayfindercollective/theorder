/**
 * ImagesTab — replace section images via upload.
 *
 * Each section that has an `image` field gets a row: thumbnail + Upload button.
 * Uploads go to Vercel Blob via /api/admin/upload. The returned URL is written
 * into the section's image field.
 */

import { useRef, useState } from 'react'
import { uploadImage } from '../adminApi.js'

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

function ImageRow({ slot, sections, onChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const currentSrc = slot.heroFilm
    ? getAt(sections, ['heroFilm', 'frames', 0, 'src'])
    : getAt(sections, slot.key)

  const pick = () => fileRef.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await uploadImage(file)
      onChange((cur) => {
        if (slot.heroFilm) {
          return setAt(cur, ['heroFilm', 'frames'], [{ src: url }])
        }
        return setAt(cur, slot.key, url)
      })
    } catch (err) {
      setError(err?.message || 'upload failed')
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
      </div>
    </div>
  )
}

export function ImagesTab({ sections, onChange }) {
  return (
    <div className="admin-tab-pane">
      <p className="restraint admin-tab-intro">
        Upload a replacement image for any section. Max 8 MB. JPG, PNG, or WebP. After save,
        the new image goes live in ~30 seconds.
      </p>

      {IMAGE_SLOTS.map((slot) => (
        <ImageRow key={slot.label} slot={slot} sections={sections} onChange={onChange} />
      ))}
    </div>
  )
}
