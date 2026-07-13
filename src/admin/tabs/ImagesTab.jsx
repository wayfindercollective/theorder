/**
 * ImagesTab — bind images to each section slot.
 *
 * Each slot row: thumbnail + Upload + Pick from library.
 * Upload goes to Vercel Blob; "Pick" opens a modal that lists existing
 * uploads so we can reuse them instead of re-uploading.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { humanizeError, listImages, uploadImage } from '../adminApi.js'
import { websiteImagesFrom, PRES_PAINTINGS, PRES_PHOTOS, freshUploads, uploadLabel } from '../../lib/imageLibrary.js'

const IMAGE_SLOTS = [
  { key: ['hero', '__heroFilm__'], label: 'Hero — background image', heroFilm: true },
  { key: ['truth', 'image'],       label: 'The Truth — landscape (full-bleed)' },
  { key: ['code', 'image'],        label: 'Who We Are — background painting' },
  { key: ['principles', 'image'],  label: 'The Principles — background painting' },
  { key: ['become', 'image'],      label: "We're Offering You — background painting" },
  { key: ['evidence', 'image'],    label: 'Testimonials — background painting' },
  { key: ['founder', 'portrait'],  label: 'Who Am I — portrait photo (the framed photo of Nico)' },
  { key: ['founder', 'image'],     label: 'Who Am I — background painting' },
  { key: ['faq', 'image'],         label: 'Questions a Serious Man Asks — background painting' },
  { key: ['howWeOperate', 'image'],label: 'How We Operate — background painting' },
  { key: ['application', 'image'], label: 'Application — background painting' },
  { key: ['closing', 'image'],     label: 'Closing — background painting' },
  { key: ['considered', 'image'],  label: 'Who Is Considered (hidden section)' },
  { key: ['meta', 'shareImage'],   label: 'Link preview — share image (shown when the link is shared in messages / social)' },
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

function PickerModal({ open, sections, onPick, onClose }) {
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

  // The full shared library: uploads first (the usual pick for a swap), then
  // everything bundled with the site. Same set the presentations pickers show.
  const websiteImages = websiteImagesFrom(sections)
  const groups = [
    { title: 'Uploads', items: freshUploads(images, websiteImages).map((im) => ({ src: im.url, label: uploadLabel(im) })) },
    { title: 'On the website', items: websiteImages },
    { title: 'Presentation paintings', items: PRES_PAINTINGS },
    { title: 'Nico’s photo library', items: PRES_PHOTOS },
  ]

  return (
    <div className="library-modal-backdrop" onClick={onClose}>
      <div className="library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="library-modal-head">
          <span className="display">Pick from library</span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        {loading && <p className="restraint">Loading…</p>}
        {error && <p className="qs-error">{error}</p>}
        {groups.map((group) => (
          <section key={group.title} className="library-group">
            <h3 className="library-group-title">{group.title}</h3>
            {group.title === 'Uploads' && !loading && group.items.length === 0 ? (
              <p className="restraint admin-image-empty">No uploads yet.</p>
            ) : (
              <div className="library-grid library-grid-modal">
                {group.items.map((it) => (
                  <button
                    key={it.src}
                    type="button"
                    className="library-pick-item"
                    onClick={() => { onPick(it.src); onClose() }}
                    title={it.label}
                  >
                    <span className="library-thumb"><img src={it.src} alt="" loading="lazy" /></span>
                    <span className="library-pick-label">{it.label}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
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
      <PickerModal open={pickerOpen} sections={sections} onPick={writeUrl} onClose={() => setPickerOpen(false)} />
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
