/**
 * make-og.mjs — build the link-preview (Open Graph) share image.
 *
 * Composites the templar shield mark onto the horseman painting at the
 * standard 1200×630 landscape ratio that link scrapers (Slack, iMessage,
 * WhatsApp, Facebook, LinkedIn, X "summary_large_image") expect.
 *
 * No wordmark, no verse, no CTA — just the painting + the shield, centred,
 * with a soft central darken so the gold/red mark reads against the sky.
 *
 * Sources:
 *   public/images/hero-horseman.jpg   (background painting)
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

const W = 1200
const H = 630
const MARK_HEIGHT = Math.round(H * 0.64) // shield ≈ 64% of canvas height

async function main() {
  // Background painting scaled to cover the landscape canvas, centred so the
  // pyramid + rearing horse stay balanced left-to-right. Pulled a touch
  // darker for the brand's dark-oil-painting feel.
  const background = await sharp(BG)
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.9 })
    .toBuffer()

  // Soft radial darken centred behind the mark so the gold border + red
  // cross separate cleanly from the golden sky.
  const scrim = Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="g" cx="50%" cy="48%" r="62%">
          <stop offset="0%" stop-color="rgba(0,0,0,0.42)"/>
          <stop offset="55%" stop-color="rgba(0,0,0,0.22)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
    </svg>`,
  )

  // Shield, resized to target height (sharp keeps the aspect ratio).
  const mark = await sharp(MARK)
    .resize({ height: MARK_HEIGHT })
    .toBuffer()
  const markMeta = await sharp(mark).metadata()

  await sharp(background)
    .composite([
      { input: scrim, top: 0, left: 0 },
      {
        input: mark,
        top: Math.round((H - markMeta.height) / 2),
        left: Math.round((W - markMeta.width) / 2),
      },
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
