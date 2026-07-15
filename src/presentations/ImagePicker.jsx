/**
 * Picker overlay for a slide. Both modes draw on the SAME shared library
 * (src/lib/imageLibrary.js): every image on the live website, the
 * presentation-only paintings, Nico's photo library, and everything ever
 * uploaded through /admin or here — and both modes can upload a new image
 * from this computer.
 *
 *  mode="image"      → pick a picture to place ON the slide. onPick(src).
 *  mode="background" → choose what the slide sits on: one of the painting
 *                      cycle's slots (onPick(index) — keeps the slide's
 *                      per-painting grade + crop), or any library image as a
 *                      custom background (onPick(src)).
 */
import { useEffect, useRef, useState } from 'react'
import { SITE_IMAGES } from './siteImages.js'
import { WEBSITE_IMAGES, PRES_PAINTINGS, PRES_PHOTOS, freshUploads, uploadLabel } from '../lib/imageLibrary.js'
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

// The cycle's srcs — library images already in the cycle aren't repeated in
// the "custom background" group (picking the cycle slot keeps its grade).
const CYCLE_SRCS = new Set(SITE_IMAGES.map((img) => img.src))
const LIBRARY_EXTRAS = [...PRES_PHOTOS, ...WEBSITE_IMAGES, ...PRES_PAINTINGS]
  .filter((it) => !CYCLE_SRCS.has(it.src))

function PickerGroup({ title, items, onPick }) {
  if (!items.length) return null
  return (
    <>
      <p className="pres-picker-label">{title}</p>
      <div className="pres-picker-grid">
        {items.map((it) => (
          <button key={it.key ?? it.src} type="button" className="pres-picker-item" onClick={() => onPick(it.value ?? it.src)}>
            <img src={it.src} alt="" loading="lazy" />
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </>
  )
}

export function ImagePicker({ mode, onPick, onClose }) {
  const [uploads, setUploads] = useState(null) // null = loading
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    listLibraryImages()
      .then((imgs) => { if (!cancelled) setUploads(freshUploads(imgs)) })
      .catch((e) => { if (!cancelled) { setUploads([]); setError(humanizeError(e)) } })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    window.addEventListener('keydown', h, true)
    return () => window.removeEventListener('keydown', h, true)
  }, [onClose])

  // Uploading from either mode lands in the shared library and is applied
  // immediately: placed on the slide (image) or set as the background.
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

  const uploadItems = (uploads || []).map((it) => ({ src: it.url, label: uploadLabel(it) }))

  return (
    <div className="pres-picker-overlay" onClick={onClose}>
      <div className="pres-picker" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <header className="pres-picker-head">
          <h3>{mode === 'background' ? 'Choose the background' : 'Add a picture'}</h3>
          <button type="button" className="pres-btn pres-btn-primary" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Uploading…' : '⬆ Upload from this computer'}
          </button>
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
            <>
              <PickerGroup
                title="The painting cycle (what new slides rotate through)"
                items={SITE_IMAGES.map((img, i) => ({ key: img.key, src: img.src, label: img.label || img.key.replace(/^pres-/, ''), value: i }))}
                onPick={onPick}
              />
              <PickerGroup title="From the shared library" items={LIBRARY_EXTRAS} onPick={onPick} />
              <PickerGroup title="Uploaded images" items={uploadItems} onPick={onPick} />
              {uploads === null && <p className="pres-picker-empty">Loading uploads…</p>}
            </>
          ) : (
            <>
              <PickerGroup title="Nico’s photo library" items={PRES_PHOTOS} onPick={onPick} />
              <PickerGroup title="On the website" items={WEBSITE_IMAGES} onPick={onPick} />
              <PickerGroup title="Presentation paintings" items={PRES_PAINTINGS} onPick={onPick} />
              {uploads === null ? (
                <p className="pres-picker-empty">Loading uploads…</p>
              ) : uploadItems.length === 0 ? (
                <>
                  <p className="pres-picker-label">Uploaded images</p>
                  <p className="pres-picker-empty">Nothing uploaded yet — use “Upload from this computer” above.</p>
                </>
              ) : (
                <PickerGroup title="Uploaded images" items={uploadItems} onPick={onPick} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
