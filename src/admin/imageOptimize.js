/**
 * Client-side image optimization before upload.
 *
 * Draws the image to a canvas, downscales so the longest edge ≤ MAX_EDGE,
 * and re-encodes as WebP at QUALITY. A 6 MB phone JPEG typically becomes
 * 200–400 KB and stays visibly indistinguishable on the site.
 *
 * Passes SVG and small files through unchanged (no benefit, possible
 * fidelity loss). Falls back to the original file on any failure.
 */

const MAX_EDGE = 2200
const QUALITY = 0.85
const SKIP_BELOW_BYTES = 200 * 1024 // already small — don't bother

function shouldSkip(file) {
  if (!file) return true
  if (file.type === 'image/svg+xml') return true
  if (file.size <= SKIP_BELOW_BYTES) return true
  if (!/^image\//.test(file.type)) return true
  return false
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
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

export async function optimizeImage(file) {
  if (shouldSkip(file)) return file

  try {
    const img = await loadImage(file)
    const longestEdge = Math.max(img.naturalWidth, img.naturalHeight)
    const scale = longestEdge > MAX_EDGE ? MAX_EDGE / longestEdge : 1
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await canvasToBlob(canvas, 'image/webp', QUALITY)
    // Reject if the encode somehow made it larger (rare, happens on
    // small re-encodes of already-compressed input).
    if (blob.size >= file.size) return file

    const baseName = (file.name || 'upload').replace(/\.[^.]+$/, '')
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
  } catch {
    return file
  }
}
