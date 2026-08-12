/**
 * The variant pages that exist in THIS build, derived from the bundled files —
 * client-side owner of the ONE import.meta.glob over content/variants/.
 * A page exists if and only if its JSON file does; there is no hardcoded list.
 *
 * `_`-prefixed files are internal, not pages: `_retired.json` is the
 * tombstone list of deleted page slugs, kept so old links to a removed page
 * are still never misread as vanity campaigns (see utm.js).
 */

import { pathToSlug } from './variantFields.js'

const modules = import.meta.glob('../../content/variants/*.json', { eager: true })

const KEY_PREFIX = '../../content/variants/'

function slugOfKey(key) {
  return key.slice(KEY_PREFIX.length).replace(/\.json$/, '')
}

const pages = {}
let retired = []
for (const [key, mod] of Object.entries(modules)) {
  const slug = slugOfKey(key)
  const data = mod?.default || mod
  if (slug === '_retired') {
    if (Array.isArray(data)) retired = data.filter((s) => typeof s === 'string')
  } else if (!slug.startsWith('_')) {
    pages[slug] = data
  }
}

// Sorted for stable chip order everywhere.
export const VARIANT_PAGE_SLUGS = Object.keys(pages).sort()

export const RETIRED_PAGE_SLUGS = retired

export function getVariantContent(slug) {
  return pages[slug] || null
}

// The slug of the page the given pathname serves, or null (no page = main site).
export function variantSlugFromPath(pathname) {
  const slug = pathToSlug(pathname)
  return slug && pages[slug] ? slug : null
}
