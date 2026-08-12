/**
 * Upload control for the two clips Nico speaks to camera in — the Who Am I
 * story and the post-questionnaire message.
 *
 * These used to be bare URL boxes, which meant the desktop/mobile pair that
 * makes them load quickly (see src/lib/video.js) only existed because the
 * renditions had been produced by hand with ffmpeg and the paths typed in.
 * Replacing a clip through /admin would have written one URL, left the mobile
 * one pointing at the old clip, and quietly undone the work. This control
 * produces both renditions from one upload, so the wiring survives a re-upload.
 *
 * Both come out of a single compression pass — the transcoder drives several
 * canvases off one playback — so two renditions cost the same wait as one.
 */

import { useRef, useState } from 'react'
import { humanizeError, uploadVideo } from './adminApi.js'
import { canTranscode, transcodeVideo, RENDITION_540, RENDITION_720 } from './videoTranscode.js'

const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/x-m4v'

function bytes(n) {
  if (!n) return ''
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/**
 * @param {{ value: string, mobileValue: string, label: string, hint: string,
 *           onChange: (patch: { video: string, videoMobile: string }) => void }} props
 */
export function SectionVideoField({ value, mobileValue, label, hint, onChange }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState('')   // '' | 'compressing' | 'uploading'
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setNote('')
    setProgress(0)

    if (!canTranscode()) {
      setError(
        'This browser can’t compress video. Open /admin in Chrome, Edge or Safari, ' +
        'or ask Nathan to run the clip through the optimiser.'
      )
      return
    }

    try {
      setBusy('compressing')
      const result = await transcodeVideo(file, {
        renditions: [RENDITION_720, RENDITION_540],
        onProgress: setProgress,
      })

      // `skipped` means the clip was already small; there is then no 540
      // rendition to upload, so both fields point at the one file rather than
      // leaving the mobile field stale.
      const outputs = result.skipped ? [] : result.outputs
      setBusy('uploading')
      setProgress(0)

      if (!outputs.length) {
        const { url } = await uploadVideo(file, setProgress)
        onChange({ video: url, videoMobile: '' })
        setNote(`Uploaded ${bytes(file.size)} — already small enough to use as-is on both.`)
        return
      }

      const uploaded = {}
      for (const out of outputs) {
        // Sequential, not parallel: two big PUTs at once on a home connection
        // make both crawl and the progress bar meaningless.
        const { url } = await uploadVideo(out.file, setProgress)
        uploaded[out.shortEdge] = { url, size: out.file.size }
        setProgress(0)
      }
      onChange({
        video: uploaded[RENDITION_720]?.url || '',
        videoMobile: uploaded[RENDITION_540]?.url || '',
      })
      setNote(
        `Uploaded — ${bytes(file.size)} in, ` +
        `${bytes(uploaded[RENDITION_720]?.size)} for desktop and ` +
        `${bytes(uploaded[RENDITION_540]?.size)} for phones.`
      )
    } catch (err) {
      setError(humanizeError(err))
    } finally {
      setBusy('')
      setProgress(0)
    }
  }

  return (
    <div className="admin-field">
      <span className="admin-field-label">{label}</span>

      <div className="admin-image-row">
        <input
          ref={fileRef}
          type="file"
          accept={VIDEO_ACCEPT}
          style={{ display: 'none' }}
          onChange={onFile}
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileRef.current?.click()}
          disabled={!!busy}
        >
          {busy === 'compressing'
            ? `Compressing ${progress}%…`
            : busy === 'uploading'
              ? `Uploading ${progress}%…`
              : value ? 'Replace video' : 'Upload a video'}
        </button>
      </div>

      {!!busy && (
        <>
          <div className="tm-progress"><span style={{ width: `${progress}%` }} /></div>
          {busy === 'compressing' && (
            <p className="admin-field-hint">
              Making a desktop and a phone copy. This takes about as long as the clip
              plays — keep this tab open and in front.
            </p>
          )}
        </>
      )}

      <input
        className="input-field admin-image-src-input"
        type="text"
        value={value ?? ''}
        placeholder="/videos/clip-720.mp4"
        onChange={(e) => onChange({ video: e.target.value, videoMobile: mobileValue ?? '' })}
      />
      <span className="admin-field-hint">{hint}</span>

      <span className="admin-field-label" style={{ marginTop: '0.9rem' }}>Phone copy</span>
      <input
        className="input-field admin-image-src-input"
        type="text"
        value={mobileValue ?? ''}
        placeholder="/videos/clip-540.mp4"
        onChange={(e) => onChange({ video: value ?? '', videoMobile: e.target.value })}
      />
      <span className="admin-field-hint">
        Filled in automatically by the upload above. A smaller copy sent to phones so the
        video starts faster; leave blank to send everyone the same file.
      </span>

      {error && <p className="admin-field-hint tm-warn">{error}</p>}
      {note && !error && <p className="admin-field-hint">{note}</p>}
    </div>
  )
}
