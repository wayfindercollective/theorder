/**
 * Picker overlay for a slide.
 *
 *  mode="image"      → pick a picture to place ON the slide: The Order's
 *                      presentation library (bundled with the site) plus
 *                      everything ever uploaded through /admin — or upload a
 *                      new one from this computer right here.
 *  mode="background" → choose which painting the slide sits on (the same
 *                      cycle the decks already draw from).
 *
 * onPick receives a src URL (image mode) or a cycle index (background mode).
 */
import { useEffect, useRef, useState } from 'react'
import { SITE_IMAGES, PRES_LIBRARY } from './siteImages.js'
import { listLibraryImages, uploadImage, humanizeError } from './presentationsApi.js'

// Browsers can't display HEIC (the iPhone default) — catch it before upload.
const DISPLAYABLE = /\.(jpe?g|png|webp|gif|avif)$/i

// Shrink big photos in the browser before uploading: a phone camera JPEG is
// 3–12 MB and 4000+px, which the API rejects past 8 MB and which would slow
// every deck load. Slides never need more than ~1920px. Falls back to the
// original file untouched if anything about decoding/encoding fails.
async function downscaleForSlide(file) {
  const isJpegish = /^image\/(jpe?g|webp)$/i.test(file.type)
  const isPng = /^image\/png$/i.test(file.type)
  if (!isJpegish && !isPng) return file
  if (file.size < 900 * 1024) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height))
    if (scale === 1 && isPng) return file // small-dimension PNG: recompressing rarely helps
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bmp.width * scale))
    canvas.height = Math.max(1, Math.round(bmp.height * scale))
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    // PNGs keep their format (transparency); photos re-encode as JPEG.
    const type = isPng ? 'image/png' : 'image/jpeg'
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.85))
    if (!blob || blob.size >= file.size) return file
    const name = isPng ? file.name : (file.name || 'image').replace(/\.\w+$/, '') + '.jpg'
    return new File([blob], name, { type })
  } catch {
    return file
  }
}

export function ImagePicker({ mode, onPick, onClose }) {
  const [uploads, setUploads] = useState(null) // null = loading
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (mode !== 'image') return
    let cancelled = false
    listLibraryImages()
      .then((imgs) => { if (!cancelled) setUploads(imgs) })
      .catch((e) => { if (!cancelled) { setUploads([]); setError(humanizeError(e)) } })
    return () => { cancelled = true }
  }, [mode])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [onClose])

  const pickFile = async (file) => {
    if (!file) return
    if (!DISPLAYABLE.test(file.name || '') && !/^image\/(jpe?g|png|webp|gif|avif)$/i.test(file.type || '')) {
      setError('That format won’t show in a browser — please use a JPG or PNG (HEIC photos need converting first).')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { url } = await uploadImage(await downscaleForSlide(file))
      onPick(url)
    } catch (e) {
      setError(humanizeError(e))
      setBusy(false)
    }
  }

  const uploadName = (it) => {
    const raw = (it.pathname || '').replace(/^images\//, '').replace(/^\d+-/, '')
    return raw || 'image'
  }

  return (
    <div className="pres-picker-overlay" onClick={onClose}>
      <div className="pres-picker" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <header className="pres-picker-head">
          <h3>{mode === 'background' ? 'Choose the background painting' : 'Add a picture'}</h3>
          {mode === 'image' && (
            <button type="button" className="pres-btn pres-btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? 'Uploading…' : '⬆ Upload from this computer'}
            </button>
          )}
          <button type="button" className="pres-btn pres-btn-ghost" onClick={onClose} title="Close">✕</button>
        </header>
        {error && <p className="pres-picker-error">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }}
        />

        <div className="pres-picker-body">
          {mode === 'background' ? (
            <div className="pres-picker-grid">
              {SITE_IMAGES.map((img, i) => (
                <button key={img.key} type="button" className="pres-picker-item" onClick={() => onPick(i)}>
                  <img src={img.src} alt="" loading="lazy" />
                  <span>{img.key.replace(/^pres-/, '')}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <p className="pres-picker-label">The Order library</p>
              <div className="pres-picker-grid">
                {PRES_LIBRARY.map((it) => (
                  <button key={it.src} type="button" className="pres-picker-item" onClick={() => onPick(it.src)}>
                    <img src={it.src} alt="" loading="lazy" />
                    <span>{it.label}</span>
                  </button>
                ))}
              </div>
              <p className="pres-picker-label">Uploaded images (shared with the website)</p>
              {uploads === null ? (
                <p className="pres-picker-empty">Loading…</p>
              ) : uploads.length === 0 ? (
                <p className="pres-picker-empty">Nothing uploaded yet — use “Upload from this computer” above.</p>
              ) : (
                <div className="pres-picker-grid">
                  {uploads.map((it) => (
                    <button key={it.url} type="button" className="pres-picker-item" onClick={() => onPick(it.url)}>
                      <img src={it.url} alt="" loading="lazy" />
                      <span>{uploadName(it)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
