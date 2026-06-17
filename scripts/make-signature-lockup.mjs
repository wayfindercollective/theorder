/**
 * Build horizontal "crest + THE ORDER" lockup PNGs for the email signature.
 *
 * Two transparent variants are produced (rendered at 2x for retina; the
 * signature displays them at half size):
 *   - signature-lockup.png       DARK wordmark, for light/white backgrounds
 *   - signature-lockup-dark.png  CREAM wordmark, for dark/black backgrounds
 *
 *   node scripts/make-signature-lockup.mjs
 */
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FONT = path.join(root, 'assets/fonts/Cinzel-Medium.ttf')
const CREST = path.join(root, 'public/images/logo-mark.png')

const DPI = 460              // controls wordmark size
const LETTER_SPACING = 3200  // pango units between glyphs
const GAP = 30               // space between crest and wordmark @2x

async function buildLockup(wordColor, outName) {
  // 1 — wordmark rendered from the real Cinzel font (size driven by DPI)
  const word = await sharp({
    text: {
      text: `<span foreground="${wordColor}" letter_spacing="${LETTER_SPACING}">THE ORDER</span>`,
      font: 'Cinzel',
      fontfile: FONT,
      rgba: true,
      dpi: DPI,
    },
  }).png().toBuffer({ resolveWithObject: true })

  // 2 — crest sized to balance the wordmark (crest is tall+narrow)
  const crestH = Math.round(word.info.height * 1.9)
  const crest = await sharp(CREST).resize({ height: crestH }).png().toBuffer({ resolveWithObject: true })

  const cW = crest.info.width
  const cH = crest.info.height
  const wW = word.info.width
  const wH = word.info.height

  const canvasW = cW + GAP + wW
  const canvasH = Math.max(cH, wH)
  const out = path.join(root, 'public/images', outName)

  await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: crest.data, left: 0, top: Math.round((canvasH - cH) / 2) },
      { input: word.data, left: cW + GAP, top: Math.round((canvasH - wH) / 2) },
    ])
    .png()
    .toFile(out)

  console.log(`${outName}: ${canvasW}x${canvasH} (display ${Math.round(canvasW / 2)}x${Math.round(canvasH / 2)})`)
}

await buildLockup('#1a1a1a', 'signature-lockup.png')       // dark wordmark → light bg
await buildLockup('#ece4d1', 'signature-lockup-dark.png')  // cream wordmark → dark bg
