/**
 * The testimonial clip library — what the "choose a clip you already have"
 * picker offers, alongside anything uploaded to Vercel Blob.
 *
 * Two sources, in this order:
 *
 *   BUNDLED_CLIPS — the clips that ship inside the repo under
 *     /public/testimonials. Listed explicitly so a clip stays re-addable after
 *     the card that used it is deleted (the file is still deployed; only the
 *     reference went away).
 *   the live cards — every clip the testimonials currently point at, named by
 *     its caption. Covers uploaded clips already bound to a card, and keeps
 *     names in step with whatever the CMS says today.
 *
 * Mirrors src/lib/imageLibrary.js — same shape, same idea, different medium.
 */
import data from '../../content/sections.json'

// Name a clip by the part of its caption before the em dash: captions read
// "Tony Litster — Entrepreneur, coach and…", and the picker only has room for
// the person.
function captionName(title) {
  const t = String(title || '').split('—')[0].trim()
  return t || 'Testimonial'
}

export const BUNDLED_CLIPS = [
  { src: '/testimonials/Tony.mp4',           poster: '/testimonials/Tony-poster.jpg',           label: 'Tony Litster' },
  { src: '/testimonials/testimonial-2.mp4',  poster: '/testimonials/testimonial-2-poster.jpg',  label: 'Alexander Merutka' },
  { src: '/testimonials/testimonial-3.mp4',  poster: '/testimonials/testimonial-3-poster.jpg',  label: 'Callum Nosworthy' },
  { src: '/testimonials/testimonial-4.mp4',  poster: '/testimonials/testimonial-4-poster.jpg',  label: 'Tommy Johnstone' },
]

// Clips referenced by a sections object (pass the admin's live draft, or leave
// it out for the snapshot bundled with the site).
export function cardClipsFrom(d = data) {
  return (d?.evidence?.cards || [])
    .filter((c) => c?.video && typeof c.video === 'string')
    .map((c) => ({ src: c.video, poster: c.poster || '', label: captionName(c.title) }))
}

/**
 * Everything pickable that isn't a fresh Blob upload: bundled clips first
 * (stable, always there), then anything else the cards point at. Deduped by
 * src — the first entry wins, so a bundled clip keeps its bundled poster.
 */
export function videoLibraryFrom(d) {
  return [...BUNDLED_CLIPS, ...cardClipsFrom(d), ...cardClipsFrom(data)]
    .filter((it, i, arr) => arr.findIndex((o) => o.src === it.src) === i)
}

// An upload already bound to a card is shown under the library group above —
// don't list it twice in the picker.
export function freshVideoUploads(uploads, known) {
  const srcs = new Set((known || []).map((it) => it.src))
  return (uploads || []).filter((u) => !srcs.has(u.url))
}

// Human name for an upload: strip the videos/ prefix and the timestamp.
export function videoUploadLabel(upload) {
  const raw = (upload?.pathname || '').replace(/^videos\//, '').replace(/^\d+-/, '')
  return raw || 'clip'
}
