/**
 * process-uploads.mjs — one-shot: rename ChatGPT-uploaded PNGs into panel-*.jpg
 *
 * The user saves AI-generated panel images into public/images/ with the default
 * ChatGPT filename ("ChatGPT Image May 28, 2026, 11_56_07 PM.png"). This script
 * matches each one by upload timestamp, resizes to 1600px wide for web, converts
 * to JPG at q86, saves as the panel-*.jpg name the site expects, then deletes
 * the original.
 *
 * Run:  node scripts/process-uploads.mjs
 *
 * If you regenerate any panel and save it as a new ChatGPT timestamp file, re-run
 * — this script picks up any ChatGPT-prefixed PNGs in public/images/.
 *
 * The mapping table below assumes the panels were generated in the order I gave you:
 * window, running, iron, cold, brothers, journal, spar, sauna, library, rest.
 * If the timestamp order doesn't match the panel order, tweak the mapping or
 * pass --interactive to be prompted per file. (For now: hardcoded mapping.)
 */

import sharp from 'sharp'
import { readdir, rename, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const IMG_DIR = join(here, '..', 'public', 'images')

// Mapping by visual inspection of the user's specific uploads.
// Earliest timestamp → empty bedroom, latest → man at window.
const TIMESTAMP_TO_PANEL = [
  { contains: '11_54_20', panel: 'rest' },
  { contains: '11_54_35', panel: 'library' },
  { contains: '11_54_45', panel: 'sauna' },
  { contains: '11_55_03', panel: 'spar' },
  { contains: '11_55_12', panel: 'journal' },
  { contains: '11_55_24', panel: 'brothers' },
  { contains: '11_55_35', panel: 'cold' },
  { contains: '11_55_46', panel: 'iron' },
  { contains: '11_55_58', panel: 'running' },
  { contains: '11_56_07', panel: 'window' },
]

async function main() {
  const files = await readdir(IMG_DIR)
  const chatgptFiles = files.filter((f) => f.startsWith('ChatGPT Image'))
  if (chatgptFiles.length === 0) {
    console.log('no ChatGPT uploads found in public/images/.')
    return
  }
  console.log(`found ${chatgptFiles.length} ChatGPT uploads.`)

  for (const file of chatgptFiles) {
    const match = TIMESTAMP_TO_PANEL.find((m) => file.includes(m.contains))
    if (!match) {
      console.warn(`  ⚠ no panel mapping for: ${file}`)
      continue
    }
    const src = join(IMG_DIR, file)
    const out = join(IMG_DIR, `panel-${match.panel}.jpg`)
    await sharp(src)
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(out)
    await unlink(src)
    console.log(`  ✓ ${file.slice(0, 38)}…  →  panel-${match.panel}.jpg`)
  }

  console.log('done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
