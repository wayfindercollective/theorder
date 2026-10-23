// Writes public/testimonials/cards.json from the Testimonials section in
// content/sections.json, so book.theorder.global (a Website Builder site) can
// show exactly the same video testimonials without its own copy. Runs before
// every build; the file is generated, never committed.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = 'https://www.theorder.global'
const abs = (u) => (!u ? '' : /^https?:\/\//.test(u) ? u : ORIGIN + (u.startsWith('/') ? u : '/' + u))

const sections = JSON.parse(readFileSync(join(root, 'content', 'sections.json'), 'utf8'))
const cards = (sections?.evidence?.cards || [])
  .filter((c) => c && typeof c.video === 'string' && c.video && (c.type || 'video') === 'video')
  .map((c) => ({ video: abs(c.video), poster: abs(c.poster), title: String(c.title || '') }))

const out = join(root, 'public', 'testimonials', 'cards.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(cards, null, 2) + '\n')
console.log(`testimonial feed: ${cards.length} video cards -> public/testimonials/cards.json`)
