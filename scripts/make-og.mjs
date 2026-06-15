/**
 * make-og.mjs — build the link-preview (Open Graph) share image.
 *
 * Composites the templar shield mark onto the horseman painting, kept in the
 * painting's native portrait shape (no vertical crop, so the horse's head
 * stays in frame). Slack/iMessage/WhatsApp show the tall image as-is.
 *
 * No wordmark, no verse, no CTA — just the painting + the shield in the
 * upper-left, with a soft darken so the gold/red mark reads against the sky.
 *
 * Sources:
 *   public/images/hero-horseman.jpg   (background painting, portrait)
 *   public/images/logo-mark.png       (shield + cross, transparent)
 *
 * Run:    node scripts/make-og.mjs
 * Output: public/images/og-share.jpg
 */

import sharp from 'sharp'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const IMG = join(ROOT, 'public', 'images')

const BG = join(IMG, 'hero-horseman.jpg')
const MARK = join(IMG, 'logo-mark.png')
const OUT = join(IMG, 'og-share.jpg')

const W = 1200 // output width; height follows the painting's portrait ratio

async function main() {
  // Whole painting scaled to width — no crop, so nothing (incl. the horse's
  // head) is cut off. Pulled a touch darker for the dark-oil-painting feel.
  const background = await sharp(BG)
    .resize({ width: W })
    .modulate({ brightness: 0.92 })
    .toBuffer()
  const { height: H } = await sharp(background).metadata()

  // Shield in the upper-left, over the sky, clear of the horse and rider.
  const MARK_HEIGHT = Math.round(H * 0.3) // ≈ 30% of canvas height
  const MARK_LEFT = Math.round(W * 0.06)
  const MARK_TOP = Math.round(H * 0.05)

  const mark = await sharp(MARK)
    .resize({ height: MARK_HEIGHT })
    .toBuffer()
  const markMeta = await sharp(mark).metadata()

  // Soft radial darken centred on the shield so the gold border + red cross
  // separate cleanly from the golden sky.
  const cx = ((MARK_LEFT + markMeta.width / 2) / W) * 100
  const cy = ((MARK_TOP + markMeta.height / 2) / H) * 100
  const scrim = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="${cx.toFixed(1)}%" cy="${cy.toFixed(1)}%" r="40%">
          <stop offset="0%" stop-color="rgba(0,0,0,0.45)"/>
          <stop offset="55%" stop-color="rgba(0,0,0,0.22)"/>
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
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(OUT)

  const out = await sharp(OUT).metadata()
  console.log(`✓ og-share.jpg  (${out.width}×${out.height})  shield ${markMeta.width}×${markMeta.height}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
