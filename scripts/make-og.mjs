/**
 * make-og.mjs — build the link-preview (Open Graph) share image.
 *
 * Mirrors the site hero: a squarer crop of the horseman painting (shield over
 * the sky, horse to the lower-right), the templar shield centred, and the
 * "THE ORDER" wordmark large + centred beneath it, overlapping the horse a
 * little — matching the on-site lockup proportions.
 *
 * The wordmark is drawn from the real Cinzel Medium outlines (the site's
 * display face) with a soft shadow; an edge vignette + bottom scrim add depth
 * and keep the mark + text readable.
 *
 * Sources:
 *   public/images/hero-horseman.jpg   (background painting, portrait)
 *   public/images/logo-mark.png       (shield + cross, transparent)
 *   assets/fonts/Cinzel-Medium.ttf    (display face, weight 500)
 *
 * Run:    node scripts/make-og.mjs
 * Output: public/images/og-share.jpg
 */

import sharp from 'sharp'
import opentype from 'opentype.js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const IMG = join(ROOT, 'public', 'images')

const BG = join(IMG, 'hero-horseman.jpg')
const MARK = join(IMG, 'logo-mark.png')
const FONT = join(ROOT, 'assets', 'fonts', 'Cinzel-Medium.ttf')
const OUT = join(IMG, 'og-share.jpg')

// --- canvas (squarish, like the hero crop) ---
const W = 1200
const H = 1024
// How much of the painting's excess height to trim from the TOP (0 = top-
// aligned/maximum sky, 0.5 = centred). Low value drops the horse so the shield
// sits over clear sky.
const CROP_TOP_BIAS = 0.14
// Shift the whole lockup (shield + wordmark) off-centre. Negative = left.
const LATERAL_SHIFT_FRAC = -0.045

// --- shield (over the sky) ---
const SHIELD_H_FRAC = 0.34 // shield height ÷ canvas height
const SHIELD_CENTER_Y_FRAC = 0.31 // vertical centre of the shield

// --- wordmark (overlapping the horse) ---
const WORDMARK = 'THE ORDER'
const TEXT_W_FRAC = 0.52 // wordmark width ÷ canvas width
const TEXT_CENTER_Y_FRAC = 0.6 // vertical centre of the wordmark
const PARCHMENT = '#e8e0d0' // matches --parchment, the site's heading colour
const LETTER_SPACING = 0.06 // em (site uses 0.04; opened up slightly for previews)

const fontBuf = readFileSync(FONT)
const font = opentype.parse(fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength))

/**
 * Render the wordmark to a transparent PNG buffer from the font's outlines.
 * `blur` (px, in the high-res render space) > 0 produces a soft shadow copy.
 * The big render is downscaled later, so this stays crisp.
 */
async function renderWordmark({ fill, blur = 0 }) {
  const SIZE = 240 // high-res render; downscaled when composited
  const path = font.getPath(WORDMARK, 0, 0, SIZE, { kerning: true, letterSpacing: LETTER_SPACING })
  const bb = path.getBoundingBox()
  const pad = Math.ceil(SIZE * 0.18) // headroom for the blur
  const w = Math.ceil(bb.x2 - bb.x1) + pad * 2
  const h = Math.ceil(bb.y2 - bb.y1) + pad * 2
  const filter = blur > 0
    ? `<filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${blur}"/></filter>`
    : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ` +
    `viewBox="${bb.x1 - pad} ${bb.y1 - pad} ${w} ${h}">` +
    `<defs>${filter}</defs>` +
    `<path d="${path.toPathData(2)}" fill="${fill}"${blur > 0 ? ' filter="url(#s)"' : ''}/>` +
    `</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function main() {
  // Painting scaled to width, then cropped to the squarer canvas with a top
  // bias so the horse drops low and the shield gets clear sky above. Slight
  // darken for the oil feel.
  const scaled = await sharp(BG).resize({ width: W }).toBuffer()
  const scaledH = (await sharp(scaled).metadata()).height
  const cropTop = Math.round((scaledH - H) * CROP_TOP_BIAS)
  const background = await sharp(scaled)
    .extract({ left: 0, top: cropTop, width: W, height: H })
    .modulate({ brightness: 0.95 })
    .toBuffer()

  // Shield, centred horizontally, in the upper sky.
  const mark = await sharp(MARK)
    .resize({ height: Math.round(H * SHIELD_H_FRAC) })
    .toBuffer()
  const markMeta = await sharp(mark).metadata()
  const shift = Math.round(W * LATERAL_SHIFT_FRAC)
  const markLeft = Math.round((W - markMeta.width) / 2) + shift
  const markTop = Math.round(H * SHIELD_CENTER_Y_FRAC - markMeta.height / 2)

  // Wordmark, centred on the same axis, large enough to overlap the horse.
  const TEXT_W = Math.round(W * TEXT_W_FRAC)
  const textBuf = await sharp(await renderWordmark({ fill: PARCHMENT })).resize({ width: TEXT_W }).toBuffer()
  const shadowBuf = await sharp(await renderWordmark({ fill: '#000000', blur: 7 })).resize({ width: TEXT_W }).toBuffer()
  const textH = (await sharp(textBuf).metadata()).height
  const textLeft = Math.round((W - TEXT_W) / 2) + shift
  const textTop = Math.round(H * TEXT_CENTER_Y_FRAC - textH / 2)

  // Edge vignette (darker toward the corners) + a bottom scrim so the wordmark
  // reads over the lighter sky / textured paint.
  const overlay = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="vig" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="58%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.55)"/>
        </radialGradient>
        <linearGradient id="bot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="52%" stop-color="rgba(0,0,0,0)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.42)"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#vig)"/>
      <rect width="${W}" height="${H}" fill="url(#bot)"/>
    </svg>`,
  )

  await sharp(background)
    .composite([
      { input: overlay, top: 0, left: 0 },
      { input: mark, top: markTop, left: markLeft },
      { input: shadowBuf, top: textTop + 2, left: textLeft },
      { input: textBuf, top: textTop, left: textLeft },
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(OUT)

  const out = await sharp(OUT).metadata()
  console.log(`✓ og-share.jpg  (${out.width}×${out.height})  shield ${markMeta.width}×${markMeta.height}  wordmark ${TEXT_W}×${textH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
