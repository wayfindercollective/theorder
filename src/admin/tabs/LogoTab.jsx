/**
 * LogoTab — replace the brand mark.
 *
 * v1 keeps the SVG sigil as the default. Uploading a custom logo writes the
 * URL into sections.brand.logo, which the Sigil component reads at render.
 * (Sigil component change to actually consume this is wired in a later pass.)
 */

import { useRef, useState } from 'react'
import { uploadImage } from '../adminApi.js'

function setAt(obj, path, value) {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const next = { ...(obj || {}) }
  next[head] = setAt(next[head], rest, value)
  return next
}

export function LogoTab({ sections, onChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const current = sections?.brand?.logo
  const pick = () => fileRef.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const { url } = await uploadImage(file)
      onChange((cur) => setAt(cur, ['brand', 'logo'], url))
    } catch (err) {
      setError(err?.message || 'upload failed')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  const clearLogo = () => {
    onChange((cur) => setAt(cur, ['brand', 'logo'], null))
  }

  return (
    <div className="admin-tab-pane">
      <p className="restraint admin-tab-intro">
        The default is the shield + cross + sword SVG. Upload a custom logo to replace it
        across the site (header, footer, post-submit screen). Transparent PNG works best.
      </p>

      <div className="admin-image-row">
        <div className="admin-image-thumb admin-image-thumb-logo">
          {current ? (
            <img src={current} alt="" />
          ) : (
            <span className="restraint admin-image-empty">— default sigil —</span>
          )}
        </div>
        <div className="admin-image-meta">
          <span className="display admin-image-label">Brand mark</span>
          <code className="admin-image-src">{current || '(SVG sigil)'}</code>
          {error && <span className="qs-error">{error}</span>}
        </div>
        <div className="admin-image-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={onFile}
            style={{ display: 'none' }}
          />
          <button className="btn btn-ghost" type="button" onClick={pick} disabled={busy}>
            {busy ? 'Uploading…' : current ? 'Replace' : 'Upload'}
          </button>
          {current && (
            <button className="btn btn-ghost" type="button" onClick={clearLogo} disabled={busy}>
              Revert to default
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
