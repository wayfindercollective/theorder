/**
 * Grab a poster frame out of a video, in the browser.
 *
 * Every testimonial tile renders `<video preload="none" poster="…">` — the clip
 * itself doesn't download until the tile nears the viewport, so WITHOUT a
 * poster a new testimonial is a black rectangle until it scrolls into view.
 * Asking a non-technical admin to export a still by hand guarantees that gets
 * skipped, so the Testimonials tab captures one automatically on upload.
 *
 * Capture from the local File whenever possible: an object URL is same-origin,
 * so the canvas stays untainted. A remote URL only works if the host sends CORS
 * headers (Vercel Blob does) — hence `crossOrigin`, and hence the null return
 * rather than a throw when a frame simply can't be read.
 */

// Far enough in to clear a fade-from-black intro, early enough to still be the
// speaker's opening frame.
const DEFAULT_SEEK_SECONDS = 1.2
const MAX_EDGE = 1280 // tiles render ~227 CSS px wide; 2× that is plenty
const QUALITY = 0.82
const TIMEOUT_MS = 15000

function loadVideo(src, { crossOrigin } = {}) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    if (crossOrigin) v.crossOrigin = 'anonymous'
    v.preload = 'auto'
    v.muted = true
    v.playsInline = true
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('timed out reading the video'))
    }, TIMEOUT_MS)
    const cleanup = () => {
      clearTimeout(timer)
      v.removeEventListener('loadeddata', onReady)
      v.removeEventListener('error', onError)
    }
    const onReady = () => { cleanup(); resolve(v) }
    const onError = () => { cleanup(); reject(new Error('could not read the video')) }
    v.addEventListener('loadeddata', onReady)
    v.addEventListener('error', onError)
    v.src = src
    v.load()
  })
}

function seek(video, time) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('timed out seeking')) }, TIMEOUT_MS)
    const cleanup = () => {
      clearTimeout(timer)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); reject(new Error('could not seek the video')) }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = time
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas toBlob returned null'))),
      type,
      quality,
    )
  })
}

async function frameFrom(src, { crossOrigin, name, at }) {
  const video = await loadVideo(src, { crossOrigin })
  try {
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    // Never seek past the end; on a very short clip take a quarter in.
    const target = duration > 0 ? Math.min(at ?? DEFAULT_SEEK_SECONDS, duration * 0.25) : 0
    if (target > 0) await seek(video, target)

    const w0 = video.videoWidth
    const h0 = video.videoHeight
    if (!w0 || !h0) throw new Error('the video has no picture')
    const scale = Math.max(w0, h0) > MAX_EDGE ? MAX_EDGE / Math.max(w0, h0) : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w0 * scale)
    canvas.height = Math.round(h0 * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas unavailable')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Tainted canvas (a remote clip with no CORS headers) throws here.
    const blob = await canvasToBlob(canvas, 'image/jpeg', QUALITY)
    const base = String(name || 'poster').replace(/\.[^.]+$/, '') || 'poster'
    return new File([blob], `${base}-poster.jpg`, { type: 'image/jpeg' })
  } finally {
    video.removeAttribute('src')
    video.load()
  }
}

/** Poster from a File the admin just picked. Returns a File, or null. */
export async function posterFromFile(file, opts = {}) {
  const url = URL.createObjectURL(file)
  try {
    return await frameFrom(url, { name: file.name, ...opts })
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Poster from a clip already on the site (a /public path or a Blob URL).
 * Returns a File, or null when the host won't allow the pixels to be read.
 */
export async function posterFromUrl(src, opts = {}) {
  const name = (src.split('/').pop() || 'poster').split('?')[0]
  const remote = /^https?:\/\//i.test(src) && !src.startsWith(window.location.origin)
  try {
    return await frameFrom(src, { crossOrigin: remote, name, ...opts })
  } catch {
    return null
  }
}
