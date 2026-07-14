/**
 * The shared image library — ONE source of truth for every image picker:
 * the /admin Library and Images tabs, and the presentations builder's
 * picture + background pickers all read from here.
 *
 * Three bundled groups ship with the site; the fourth is whatever has been
 * uploaded to Vercel Blob through any of those pickers (listed at runtime
 * via /api/admin/images — the same store everywhere):
 *
 *   WEBSITE_IMAGES — every image the live site uses right now. Read from the
 *     bundled sections.json, so a CMS image swap flows into every picker on
 *     the next deploy.
 *   PRES_PAINTINGS — the six presentation-only paintings appended to the deck
 *     background cycle (hard-coded by design, decoupled from the CMS — see
 *     src/presentations/siteImages.js).
 *   PRES_PHOTOS — Nico's own photos and marks, bundled with the site under
 *     /images/pres-library/.
 */
import data from '../../content/sections.json'

const site = (src, label) => (src && typeof src === 'string' ? { src, label } : null)

// Labels mirror the section names the admin Images tab uses, so the same
// picture is called the same thing everywhere. Takes a sections object so the
// admin can pass its live draft; everything else uses the bundled snapshot.
export function websiteImagesFrom(d) {
  return [
    site(d?.heroFilm?.frames?.[0]?.src, 'Hero — background'),
    site(d?.truth?.image, 'The Truth'),
    site(d?.code?.image, 'Who We Are'),
    site(d?.principles?.image, 'The Principles'),
    site(d?.become?.image, "We're Offering You"),
    site(d?.evidence?.image, 'Testimonials'),
    site(d?.founder?.portrait, 'Nico — framed portrait'),
    site(d?.founder?.image, 'Who Am I'),
    site(d?.faq?.image, 'Questions a Serious Man Asks'),
    site(d?.howWeOperate?.image, 'How We Operate'),
    site(d?.application?.image, 'Application'),
    site(d?.closing?.image, 'Closing'),
    site(d?.considered?.image, 'Who Is Considered'),
    site('/images/logo-mark.png', 'The Order mark'),
    site(d?.meta?.shareImage, 'Link-preview image'),
  ]
    .filter(Boolean)
    // the CMS can bind one painting to two sections — show it once
    .filter((it, i, arr) => arr.findIndex((o) => o.src === it.src) === i)
}

export const WEBSITE_IMAGES = websiteImagesFrom(data)

export const PRES_PAINTINGS = [
  { src: '/images/pres-soldier.jpg', label: 'Soldier at rest' },
  { src: '/images/pres-squad.jpg', label: 'The squad' },
  { src: '/images/pres-base.jpg', label: 'The base' },
  { src: '/images/pres-dog.jpg', label: 'Dog handler' },
  { src: '/images/pres-blade.jpg', label: 'The blade' },
  { src: '/images/pres-sentinel.jpg', label: 'The sentinel' },
]

export const PRES_PHOTOS = [
  { src: '/images/pres-library/true-gentleman.jpg', label: 'The True Gentleman' },
  { src: '/images/pres-library/regiment-afghanistan-oil.jpg', label: 'The Regiment — Afghanistan' },
  { src: '/images/pres-library/brotherhood-oil.jpg', label: 'Brotherhood' },
  { src: '/images/pres-library/black-triumph-oil.jpg', label: 'The Black Triumph' },
  { src: '/images/pres-library/mountain-valley-oil.jpg', label: 'Mountain valley' },
  { src: '/images/pres-library/egypt-relief-oil.jpg', label: 'Egyptian temple relief' },
  { src: '/images/pres-library/desert-pyramid-oil.jpg', label: 'Desert pyramid' },
  { src: '/images/pres-library/bible-rosary-oil.jpg', label: 'Bible & rosary' },
  { src: '/images/pres-library/order-logo-aged.png', label: 'The Order logo (aged)' },
  { src: '/images/pres-library/order-emblem-oil.jpg', label: 'The Order emblem (oil)' },
]

export const BUNDLED_IMAGES = [...WEBSITE_IMAGES, ...PRES_PAINTINGS, ...PRES_PHOTOS]

// A CMS image swap binds a Blob URL straight into sections.json — that upload
// is then already shown under "On the website"; don't list it twice. Pass a
// custom bundled list to dedupe against the admin's live draft instead.
export function freshUploads(uploads, bundled = BUNDLED_IMAGES) {
  const srcs = new Set(bundled.map((it) => it.src))
  return (uploads || []).filter((u) => !srcs.has(u.url))
}

// Human name for an upload: strip the images/ prefix and the timestamp.
export function uploadLabel(upload) {
  const raw = (upload?.pathname || '').replace(/^images\//, '').replace(/^\d+-/, '')
  return raw || 'image'
}
