/**
 * LibraryTab — grid view of every image in Vercel Blob's `images/` prefix.
 *
 * Click an image to copy its URL. "Delete" removes it from storage.
 * (Doesn't unbind references from sections.json — that's caller-side.)
 */

import { useCallback, useEffect, useState } from 'react'
import { deleteImage, listImages } from '../adminApi.js'
import { humanizeError } from '../adminApi.js'

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

export function LibraryTab({ sections }) {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

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
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const inUse = useCallback((url) => {
    // Walk sections.json and check if `url` appears anywhere as a string value.
    // Cheap deep-string search — good enough to warn before delete.
    const json = JSON.stringify(sections || {})
    return json.includes(url)
  }, [sections])

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied((c) => (c === url ? '' : c)), 1200)
    } catch {
      window.prompt('Copy this URL:', url)
    }
  }

  const onDelete = async (img) => {
    if (inUse(img.url)) {
      const ok = window.confirm(
        'This image is referenced somewhere on the site. Delete anyway? (You should replace those references first to avoid broken images.)'
      )
      if (!ok) return
    } else {
      const ok = window.confirm('Delete this image from storage? This cannot be undone.')
      if (!ok) return
    }
    try {
      await deleteImage(img.url)
      setImages((xs) => xs.filter((x) => x.url !== img.url))
    } catch (err) {
      setError(humanizeError(err))
    }
  }

  return (
    <div className="admin-tab-pane">
      <div className="library-head">
        <p className="restraint admin-tab-intro">
          Every image you have uploaded. Click an image to copy its URL.
          {images.length > 0 && <> · {images.length} total</>}
        </p>
        <button type="button" className="btn btn-ghost" onClick={refresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <p className="qs-error">{error}</p>}

      {!loading && images.length === 0 && (
        <p className="restraint admin-image-empty">No uploads yet. Use the Images tab to upload your first one.</p>
      )}

      <div className="library-grid">
        {images.map((img) => {
          const used = inUse(img.url)
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
                  {used ? <span className="library-used">in use</span> : <span className="library-unused">unused</span>}
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
    </div>
  )
}
