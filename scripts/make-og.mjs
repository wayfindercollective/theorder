/**
 * make-og.mjs — build the link-preview (Open Graph) share image.
 *
 * Composites the templar shield mark onto the horseman painting, kept in the
 * painting's native portrait shape (no vertical crop, so the horse's head
 * stays in frame). Slack/iMessage/WhatsApp show the tall image as-is.
 *
 * The shield sits in the upper-left over the sky, with the "THE ORDER"
 * wordmark centred directly beneath it (sharing the shield's vertical axis).
 * The wordmark is drawn from the real Cinzel Medium outlines (the site's
 * display face) so it matches the on-site style, with a soft shadow + a
 * radial darken so the mark + text read against the golden sky.
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

const W = 1200 // output width; height follows the painting's portrait ratio
const WORDMARK = 'THE ORDER'
const PARCHMENT = '#e8e0d0' // matches --parchment, the site's heading colour
const LETTER_SPACING = 0.06 // em (site uses 0.04; opened up slightly for small previews)

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
  // Whole painting scaled to width — no crop, so nothing (incl. the horse's
  // head) is cut off. Pulled a touch darker for the dark-oil-painting feel.
  const background = await sharp(BG)
    .resize({ width: W })
    .modulate({ brightness: 0.92 })
    .toBuffer()
  const { height: H } = await sharp(background).metadata()

  // Shield anchored in the upper-left, over the sky.
  const MARK_HEIGHT = Math.round(H * 0.4) // ≈ 40% of canvas height
  const MARK_LEFT = Math.round(W * 0.06)
  const MARK_TOP = Math.round(H * 0.05)

  const mark = await sharp(MARK)
    .resize({ height: MARK_HEIGHT })
    .toBuffer()
  const markMeta = await sharp(mark).metadata()

  const shieldCx = MARK_LEFT + markMeta.width / 2
  const shieldBottom = MARK_TOP + markMeta.height

  // Wordmark, centred under the shield on the same vertical axis. With the
  // shield pinned in the corner, the widest the centred text can be is set by
  // its left edge reaching the canvas — so size it to that limit (max fit).
  const EDGE_MARGIN = Math.round(W * 0.0085)
  const TEXT_W = Math.round(2 * (shieldCx - EDGE_MARGIN))
  const GAP = Math.round(H * 0.018)
  const textBuf = await sharp(await renderWordmark({ fill: PARCHMENT }))
    .resize({ width: TEXT_W })
    .toBuffer()
  const shadowBuf = await sharp(await renderWordmark({ fill: '#000000', blur: 7 }))
    .resize({ width: TEXT_W })
    .toBuffer()
  const textH = (await sharp(textBuf).metadata()).height
  const textLeft = Math.round(shieldCx - TEXT_W / 2)
  const textTop = shieldBottom + GAP

  // Soft radial darken centred on the shield+wordmark group so it separates
  // cleanly from the golden sky.
  const groupMidY = (MARK_TOP + (textTop + textH)) / 2
  const cx = (shieldCx / W) * 100
  const cy = (groupMidY / H) * 100
  const scrim = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="${cx.toFixed(1)}%" cy="${cy.toFixed(1)}%" r="46%">
          <stop offset="0%" stop-color="rgba(0,0,0,0.5)"/>
          <stop offset="55%" stop-color="rgba(0,0,0,0.24)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
    </svg>`,
  )

  await sharp(background)
    .composite([
      { input: scrim, top: 0, left: 0 },
      { input: mark, top: MARK_TOP, left: MARK_LEFT },
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
