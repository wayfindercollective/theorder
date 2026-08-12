/**
 * Variant landing pages — single source of truth.
 *
 * PLAIN ES ONLY — imported by the Vite client (sectionContent merge, admin
 * field filtering, utm reservation) AND the Vercel Node API (variant save
 * validation), like richtext.js. Must not import anything browser- or
 * server-only.
 *
 * A variant is a copy of the landing page at its own URL (/physical,
 * /financial) with independently edited TEXT. Everything else — every image,
 * video, poster, the testimonials, the form questions, the private
 * /application pages — stays shared with the main site. That rule is enforced
 * here: VARIANT_FIELDS is a whitelist, and every consumer (seeding, runtime
 * merge, admin visibility, server-side rebuild on save) is driven by it, so a
 * variant file can never carry an asset key no matter what a payload contains.
 */

// The variant pages that exist. Adding a future area = add its entry here and
// seed its file (npm run seed:variant -- <slug>); everything else follows.
export const VARIANT_PAGES = [
  { slug: 'physical', label: 'Physical' },
  { slug: 'financial', label: 'Financial' },
]

// All seven planned focus-area slugs, reserved in utm.js from day one so none
// of them is ever misread as a vanity campaign — flipping a path's attribution
// meaning mid-flight later is exactly the instability we want to avoid. The
// unbuilt ones simply render the main site until their page ships.
export const RESERVED_VARIANT_SLUGS = [
  'physical', 'financial', 'relationships', 'primal', 'mental', 'emotional', 'spiritual',
]

// Section key → the keys a variant may own. Exactly the non-video fields the
// Sections tab exposes for these sections. Array-valued keys (provocation,
// paragraphs, verses) hold text only, so they copy wholesale.
export const VARIANT_FIELDS = {
  hero:            ['eyebrow', 'headline', 'verseLine', 'cta', 'restraint', 'scrollLabel'],
  truth:           ['eyebrow', 'provocation'],
  code:            ['eyebrow', 'heading', 'intro', 'valuesLabel', 'values'],
  principles:      ['eyebrow'],
  become:          ['eyebrow', 'heading', 'offerings', 'offeringsSize', 'offeringsColumns', 'closing'],
  considered:      ['eyebrow', 'heading', 'for_', 'not'],
  faq:             ['eyebrow', 'heading', 'questions'],
  howWeOperate:    ['eyebrow', 'heading', 'paragraphs', 'pullQuote'],
  founder:         ['eyebrow', 'heading', 'placeholderMark', 'templatedLabel', 'videoLabel', 'paragraphs', 'signature'],
  closing:         ['wordmark', 'verses'],
  cta:             ['label'],
  application:     ['eyebrow', 'stepLabel', 'backButton'],
  qualifiedScreen: ['heading', 'sub', 'videoLabel', 'message', 'note', 'button'],
  // declineScreen stays SHARED: it is edited in the Application tab alongside
  // the questions and filter, and that whole flow is shared across pages.
}

// Coerce a whitelisted value to its text-only shape. Anything that doesn't fit
// (an object smuggled into a string field, a non-text verse) is dropped or
// reduced to its text keys — a variant file can only ever hold words.
function cleanValue(key, value) {
  if (value == null) return undefined
  if (key === 'verses') {
    if (!Array.isArray(value)) return undefined
    return value.map((v) => ({
      text: typeof v?.text === 'string' ? v.text : '',
      ref: typeof v?.ref === 'string' ? v.ref : '',
    }))
  }
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'string' ? v : v == null ? '' : String(v)))
  }
  if (typeof value === 'object') return undefined
  return typeof value === 'string' ? value : String(value)
}

/**
 * The whitelisted subset of a sections-shaped object. Used to seed a new
 * variant file from the live copy, and by the API to REBUILD what gets stored
 * on every save — merge first, then this — so nothing outside the whitelist
 * can persist regardless of what the payload or the existing file contained.
 */
export function pickVariantFields(sections) {
  const out = {}
  if (!sections || typeof sections !== 'object') return out
  for (const [sec, keys] of Object.entries(VARIANT_FIELDS)) {
    const src = sections[sec]
    if (!src || typeof src !== 'object') continue
    const dst = {}
    for (const key of keys) {
      const v = cleanValue(key, src[key])
      if (v !== undefined) dst[key] = v
    }
    if (Object.keys(dst).length) out[sec] = dst
  }
  return out
}

/**
 * Merge a variant over the base sections, per section: variant text wins where
 * present, everything else (all assets included) comes from base. Only
 * whitelisted keys are ever read from the variant side.
 */
export function mergeVariantSections(base, variant) {
  if (!variant || typeof variant !== 'object') return base
  const out = { ...base }
  for (const [sec, keys] of Object.entries(VARIANT_FIELDS)) {
    const over = variant[sec]
    if (!over || typeof over !== 'object') continue
    const merged = { ...(base?.[sec] || {}) }
    for (const key of keys) {
      const v = cleanValue(key, over[key])
      if (v !== undefined) merged[key] = v
    }
    out[sec] = merged
  }
  return out
}

/**
 * The variant slug for a pathname, or null. Only pages that actually exist
 * count — reserved-but-unbuilt slugs fall through to the main site.
 * Normalisation matches the vanity reader in utm.js (trim slashes, lowercase,
 * single segment only).
 */
export function variantSlugFromPath(pathname) {
  const seg = String(pathname || '/').replace(/^\/+|\/+$/g, '').toLowerCase()
  if (!seg || seg.indexOf('/') !== -1) return null
  return VARIANT_PAGES.some((p) => p.slug === seg) ? seg : null
}
