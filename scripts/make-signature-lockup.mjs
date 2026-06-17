/**
 * Build the email-signature logo assets.
 *
 * Outputs (rendered at 2x for retina; the signature displays at half size):
 *   - signature-lockup.png       crest + DARK wordmark, transparent (light bg)
 *   - signature-lockup-dark.png  crest + CREAM wordmark, transparent (dark bg)
 *   - signature-badge.png        the cream lockup on a self-contained dark
 *                                rounded plate — carries its own background, so
 *                                it renders identically in every client and
 *                                never depends on the email keeping a bg colour.
 *
 *   node scripts/make-signature-lockup.mjs
 */
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FONT = path.join(root, 'assets/fonts/Cinzel-Medium.ttf')
const CREST = path.join(root, 'public/images/logo-mark.png')
const imgOut = (name) => path.join(root, 'public/images', name)

const DPI = 460              // controls wordmark size
const LETTER_SPACING = 3200  // pango units between glyphs
const GAP = 30               // space between crest and wordmark @2x

// Compose crest + wordmark onto a transparent canvas; returns the raw buffer.
async function composeLockup(wordColor) {
  const word = await sharp({
    text: {
      text: `<span foreground="${wordColor}" letter_spacing="${LETTER_SPACING}">THE ORDER</span>`,
      font: 'Cinzel',
      fontfile: FONT,
      rgba: true,
      dpi: DPI,
    },
  }).png().toBuffer({ resolveWithObject: true })

  const crestH = Math.round(word.info.height * 1.9)
  const crest = await sharp(CREST).resize({ height: crestH }).png().toBuffer({ resolveWithObject: true })

  const cW = crest.info.width
  const cH = crest.info.height
  const wW = word.info.width
  const wH = word.info.height
  const width = cW + GAP + wW
  const height = Math.max(cH, wH)

  const data = await sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: crest.data, left: 0, top: Math.round((height - cH) / 2) },
      { input: word.data, left: cW + GAP, top: Math.round((height - wH) / 2) },
    ])
    .png()
    .toBuffer()

  return { data, width, height }
}

async function writeTransparent(wordColor, name) {
  const lk = await composeLockup(wordColor)
  await sharp(lk.data).png().toFile(imgOut(name))
  console.log(`${name}: ${lk.width}x${lk.height} (display ${Math.round(lk.width / 2)}x${Math.round(lk.height / 2)})`)
}

// Cream lockup wrapped in a dark rounded plate that carries its own background.
async function writeBadge(name) {
  const lk = await composeLockup('#ece4d1')
  const PAD_X = 36, PAD_Y = 28, RADIUS = 20 // @2x
  const W = lk.width + PAD_X * 2
  const H = lk.height + PAD_Y * 2

  const plate = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<rect width="${W}" height="${H}" rx="${RADIUS}" ry="${RADIUS}" fill="#0a0908"/></svg>`
  )

  await sharp(plate)
    .composite([{ input: lk.data, left: PAD_X, top: PAD_Y }])
    .png()
    .toFile(imgOut(name))
  console.log(`${name}: ${W}x${H} (display ${Math.round(W / 2)}x${Math.round(H / 2)})`)
}

await writeTransparent('#1a1a1a', 'signature-lockup.png')
await writeTransparent('#ece4d1', 'signature-lockup-dark.png')
await writeBadge('signature-badge.png')
