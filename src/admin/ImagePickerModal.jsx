/**
 * "Pick from library" modal — the shared image picker.
 *
 * Lifted out of ImagesTab so the Testimonials tab picks poster frames from the
 * very same library, in the same groups, with one copy of the code.
 */

import { useEffect, useState } from 'react'
import { humanizeError, listImages } from './adminApi.js'
import { websiteImagesFrom, PRES_PAINTINGS, PRES_PHOTOS, freshUploads, uploadLabel } from '../lib/imageLibrary.js'

export function ImagePickerModal({ open, sections, onPick, onClose }) {
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
