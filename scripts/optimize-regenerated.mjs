/**
 * One-off: copy the chosen regenerated images into clean, web-optimized JPGs.
 * Source files have spaces/commas in their names and the painting is ~17 MB —
 * both unfit for direct web serving. Run: node scripts/optimize-regenerated.mjs
 */
import sharp from 'sharp'
import path from 'path'

const SRC = 'public/images/regenerated images'
const OUT = 'public/images'

const JOBS = [
  { in: 'Cole_Thomas_The_Course_of_Empire_Destruction_1836.jpg', out: 'truth-destruction.jpg', w: 2400 },
  { in: 'ChatGPT Image Jun 5, 2026, 09_05_16 PM.png', out: 'whoweare-table.jpg',     w: 1920 },
  { in: 'ChatGPT Image Jun 5, 2026, 09_05_26 PM.png', out: 'hero-gladiator.jpg',     w: 1920 },
  { in: 'ChatGPT Image Jun 5, 2026, 09_05_05 PM.png', out: 'founder-window.jpg',     w: 1920 },
  { in: 'ChatGPT Image Jun 5, 2026, 09_04_43 PM.png', out: 'offerings-training.jpg', w: 1920 },
  { in: 'ChatGPT Image Jun 5, 2026, 09_03_37 PM.png', out: 'application-book.jpg',   w: 1920 },
]

for (const j of JOBS) {
  const inPath = path.join(SRC, j.in)
  const outPath = path.join(OUT, j.out)
  await sharp(inPath)
    .rotate()
    .resize({ width: j.w, withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true })
    .toFile(outPath)
  const { size } = await sharp(outPath).metadata().then(() => import('fs')).then((fs) => fs.statSync(outPath))
  console.log(`${j.out.padEnd(24)}  ${(size / 1024).toFixed(0)} KB`)
}
console.log('done')
