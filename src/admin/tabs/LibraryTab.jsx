/**
 * LibraryTab — the shared image library, in four groups:
 *
 *   On the website          — every image the site uses right now (follows the
 *                             draft you're editing, read-only here)
 *   Presentation paintings  — the six deck-only paintings
 *   Nico's photo library    — his photos + marks bundled with the site
 *   Uploads                 — everything in Vercel Blob; upload more right here,
 *                             delete what's no longer needed
 *
 * The same four groups feed every image picker — the Images tab's
 * "Pick from library" and both pickers in the presentations builder.
 * Click any image to copy its URL.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deleteImage, listImages, listPresentationImageRefs, uploadImage, humanizeError } from '../adminApi.js'
import { websiteImagesFrom, PRES_PAINTINGS, PRES_PHOTOS, freshUploads } from '../../lib/imageLibrary.js'

function bytes(n) {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function shortDate(s) {
  if (!s) return ''
  try { return new Date(s).toLocaleDateString() } catch { return s }
}

export function LibraryTab({ sections, savedSections }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  // null = still checking, 'error' = could not check, Map = url → [deck titles]
  const [deckRefs, setDeckRefs] = useState(null)
  const fileRef = useRef(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { images } = await listImages()
      setImages(images || [])
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setLoading(false)
    }
    // Deck usage refreshes alongside the list; delete stays blocked until it
    // resolves so a failed check can never let a deck-used image be deleted.
    setDeckRefs(null)
    try { setDeckRefs(await listPresentationImageRefs()) }
    catch { setDeckRefs('error') }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Deep-string search across BOTH the draft being edited and the saved live
  // content — an image removed in the draft but not yet saved is still live.
  const draftJson = useMemo(() => JSON.stringify(sections || {}), [sections])
  const savedJson = useMemo(() => JSON.stringify(savedSections || {}), [savedSections])
  const inUse = useCallback(
    (url) => draftJson.includes(url) || savedJson.includes(url),
    [draftJson, savedJson],
  )
  const decksUsing = useCallback(
    (url) => (deckRefs instanceof Map ? deckRefs.get(url) || [] : []),
    [deckRefs],
  )

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied((c) => (c === url ? '' : c)), 1200)
    } catch {
      window.prompt('Copy this URL:', url)
    }
  }

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setError('')
    let failed = ''
    for (const f of files) {
      try { await uploadImage(f) } catch (err) { failed = humanizeError(err) }
    }
    if (failed) setError(failed)
    await refresh()
    setBusy(false)
  }

  // Deleting a referenced image would leave broken pictures on the live site
  // or inside saved presentations, so it is BLOCKED (not just warned) until
  // every reference is replaced. Fails closed while deck usage is unknown.
  const onDelete = async (img) => {
    const siteUse = inUse(img.url)
    const deckTitles = decksUsing(img.url)
    if (siteUse || deckTitles.length) {
      const where = [
        siteUse ? 'the website (see “On the website” above)' : '',
        deckTitles.length
          ? `presentation${deckTitles.length > 1 ? 's' : ''}: “${deckTitles.join('”, “')}”`
          : '',
      ].filter(Boolean).join(' and by ')
      window.alert(`This image can’t be deleted — it is used by ${where}. Replace it there first, then delete it here.`)
      return
    }
    if (!(deckRefs instanceof Map)) {
      window.alert(
        deckRefs === 'error'
          ? 'Deleting is unavailable right now — presentation usage could not be checked. Press Refresh to retry.'
          : 'Still checking whether any presentation uses this image — try again in a moment.'
      )
      return
    }
    if (!window.confirm('Delete this image from storage? This cannot be undone.')) return
    try {
      await deleteImage(img.url)
      setImages((xs) => xs.filter((x) => x.url !== img.url))
    } catch (err) {
      setError(humanizeError(err))
    }
  }

  const websiteImages = websiteImagesFrom(sections)
  const bundledGroups = [
    { title: 'On the website', items: websiteImages },
    { title: 'Presentation paintings', items: PRES_PAINTINGS },
    { title: 'Nico’s photo library', items: PRES_PHOTOS },
  ]
  // Uploads bound into a section already appear under "On the website".
  const uploads = freshUploads(images, websiteImages)

  return (
    <div className="admin-tab-pane">
      <div className="library-head">
        <p className="restraint admin-tab-intro">
          The shared image library. Everything here — the website’s images, the presentation
          paintings and photos, and your uploads — appears in every image picker (website
          sections and presentation slides alike). Click an image to copy its URL.
        </p>
        <div className="library-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={onFiles}
          />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : '⬆ Upload images'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={refresh} disabled={loading || busy}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p className="qs-error">{error}</p>}

      {bundledGroups.map((group) => (
        <section key={group.title} className="library-group">
          <h3 className="library-group-title">{group.title}</h3>
          <div className="library-grid">
            {group.items.map((it) => (
              <div key={it.src} className="library-card">
                <button
                  type="button"
                  className="library-thumb"
                  onClick={() => copyUrl(it.src)}
                  title="Click to copy URL"
                >
                  <img src={it.src} alt="" loading="lazy" />
                </button>
                <div className="library-meta">
                  <div className="library-meta-line">
                    <span className="library-label">{it.label}</span>
                    {copied === it.src && <span className="library-copied">copied</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="library-group">
        <h3 className="library-group-title">
          Uploads{uploads.length > 0 && <> · {uploads.length}</>}
        </h3>
        {!loading && uploads.length === 0 && (
          <p className="restraint admin-image-empty">No uploads yet — use “Upload images” above.</p>
        )}
        <div className="library-grid">
          {uploads.map((img) => {
            const siteUse = inUse(img.url)
            const deckUse = decksUsing(img.url).length > 0
            const used = siteUse || deckUse
            return (
              <div key={img.url} className={'library-card' + (used ? ' is-used' : '')}>
                <button
                  type="button"
                  className="library-thumb"
                  onClick={() => copyUrl(img.url)}
                  title="Click to copy URL"
                >
                  <img src={img.url} alt="" loading="lazy" />
                </button>
                <div className="library-meta">
                  <div className="library-meta-line">
                    <span>{bytes(img.size)}</span>
                    <span>{shortDate(img.uploadedAt)}</span>
                  </div>
                  <div className="library-meta-line">
                    {siteUse
                      ? <span className="library-used">in use — site</span>
                      : deckUse
                        ? <span className="library-used">in use — presentation</span>
                        : <span className="library-unused">unused</span>}
                    {copied === img.url && <span className="library-copied">copied</span>}
                  </div>
                  <button type="button" className="btn btn-ghost library-delete" onClick={() => onDelete(img)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
