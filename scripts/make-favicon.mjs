/**
 * make-favicon.mjs — build the browser-tab icons from the hero logo.
 *
 * The hero renders the painted templar mark (public/images/logo-mark.png, the
 * same file Header / Closing / Footer fall back to), so the tab icon is cut
 * from that exact artwork rather than the older vector approximation in
 * public/logo-mark.svg.
 *
 * The mark is portrait (roughly 1:2), so it is trimmed to its content bounds
 * and centred on a transparent square — at 16px the gold shield outline and
 * red cross are what carry the recognition. The Apple touch icon is the one
 * exception: iOS flattens transparency to white, so it gets the site's own
 * near-black (--ink, #0a0908) behind it.
 *
 * Run:    npm run make:favicon
 * Output: public/favicon.ico  (16/32/48)
 *         public/favicon-16.png, favicon-32.png
 *         public/apple-touch-icon.png  (180, dark backing)
 *         public/icon-192.png  (the large size Google's crawler prefers)
 */

import sharp from 'sharp'
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const PUBLIC = join(ROOT, 'public')

const SRC = join(PUBLIC, 'images', 'logo-mark.png')
const INK = { r: 10, g: 9, b: 8, alpha: 1 } // --ink, matches <meta name="theme-color">
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 }

/**
 * Centre the trimmed mark on a square canvas. `pad` is the breathing room on
 * each edge as a fraction of the canvas — near zero for the tiny sizes, where
 * every pixel of the mark counts, and generous for the Apple icon, which iOS
 * rounds off at the corners.
 */
async function square(mark, size, { background = CLEAR, pad = 0.06 } = {}) {
  const inner = Math.max(1, Math.round(size * (1 - pad * 2)))
  const scaled = await sharp(mark)
    .resize(inner, inner, { fit: 'contain', background: CLEAR })
    .toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: scaled, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
}

/**
 * Multi-resolution .ico holding PNG-encoded entries — the form every browser
 * from IE11 on reads, and what Google's crawler looks for at /favicon.ico.
 */
function buildIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(entries.length, 4)

  const dir = Buffer.alloc(16 * entries.length)
  let offset = header.length + dir.length
  entries.forEach(({ size, data }, i) => {
    const at = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, at + 0) // width  (0 means 256)
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1) // height
    dir.writeUInt16LE(1, at + 4) // colour planes
    dir.writeUInt16LE(32, at + 6) // bits per pixel
    dir.writeUInt32LE(data.length, at + 8)
    dir.writeUInt32LE(offset, at + 12)
    offset += data.length
  })

  return Buffer.concat([header, dir, ...entries.map((e) => e.data)])
}

async function main() {
  const mark = await sharp(SRC).trim({ threshold: 1 }).png().toBuffer()
  const { width, height } = await sharp(mark).metadata()

  const png16 = await square(mark, 16, { pad: 0.02 })
  const png32 = await square(mark, 32, { pad: 0.03 })
  const png48 = await square(mark, 48, { pad: 0.04 })
  const png180 = await square(mark, 180, { background: INK, pad: 0.12 })
  const png192 = await square(mark, 192)

  writeFileSync(join(PUBLIC, 'favicon.ico'), buildIco([
    { size: 16, data: png16 },
    { size: 32, data: png32 },
    { size: 48, data: png48 },
  ]))
  writeFileSync(join(PUBLIC, 'favicon-16.png'), png16)
  writeFileSync(join(PUBLIC, 'favicon-32.png'), png32)
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), png180)
  writeFileSync(join(PUBLIC, 'icon-192.png'), png192)

  console.log(`✓ favicon set from logo-mark.png  (mark trimmed to ${width}×${height})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
