/**
 * crop-saturday.mjs — cut brand source images into the assets the site uses.
 *
 * Sources expected at:
 *   public/images/saturday-source.jpg   (the 10-panel Saturday infographic)
 *   public/images/logo-source.jpg       (the multi-variant logo marketing sheet)
 *
 * Run:    npm run crop:saturday
 *
 * Coordinates are calibrated against the reference resolutions below and
 * auto-scaled to whatever the actual source resolutions are, so you can swap
 * a higher-res source in later without changing this file.
 *
 * Outputs to public/images/ :
 *   panel-window.jpg, panel-running.jpg, ... (10 Saturday panels)
 *   logo-shield.jpg       — shield-only mark for the header
 *   logo-lockup-dark.jpg  — shield + "THE ORDER" wordmark on dark, for the footer
 */

import sharp from 'sharp'
import { mkdir, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = join(here, '..')
const OUT_DIR = join(ROOT, 'public', 'images')

const SATURDAY_SOURCE = join(OUT_DIR, 'saturday-source.jpg')
const LOGO_SOURCE     = join(OUT_DIR, 'logo-source.jpg')

// ============================================================
// SATURDAY INFOGRAPHIC — 1186 × 2048 reference. 10 panels, 5 rows × 2 cols.
// ============================================================
const SATURDAY_REF = { w: 1186, h: 2048 }
const SATURDAY_PANELS = [
  { name: 'window',     x: 42,  y: 370,  w: 560, h: 295 },
  { name: 'running',    x: 605, y: 370,  w: 560, h: 295 },
  { name: 'iron',       x: 42,  y: 680,  w: 560, h: 295 },
  { name: 'cold',       x: 605, y: 680,  w: 560, h: 295 },
  { name: 'brothers',   x: 42,  y: 990,  w: 560, h: 295 },
  { name: 'journal',    x: 605, y: 990,  w: 560, h: 295 },
  { name: 'spar',       x: 42,  y: 1300, w: 560, h: 295 },
  { name: 'sauna',      x: 605, y: 1300, w: 560, h: 295 },
  { name: 'library',    x: 42,  y: 1610, w: 560, h: 295 },
  { name: 'rest',       x: 605, y: 1610, w: 560, h: 295 },
]

// ============================================================
// LOGO MARKETING SHEET — 1536 × 1024 reference.
// Multiple variants in a grid; we pull the two we need.
// ============================================================
const LOGO_REF = { w: 1536, h: 1024 }
const LOGO_CROPS = [
  // Top-right of the sheet — full vertical lockup (shield + "THE ORDER") on dark. For the footer.
  // Tightened in to avoid the white margin of the marketing sheet.
  { name: 'logo-vertical-dark',   x: 970, y: 40,  w: 525, h: 360 },
  // Top-right of the sheet — just the shield (cropped before the wordmark). For standalone use.
  { name: 'logo-shield',          x: 1110, y: 45, w: 380, h: 255 },
  // Bottom-left of the sheet — horizontal lockup (shield · "THE ORDER") on dark. For the header.
  { name: 'logo-horizontal-dark', x: 68,  y: 825, w: 412, h: 140 },
]

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

async function cropSet({ source, ref, crops, label }) {
  if (!(await exists(source))) {
    console.warn(`[${label}] missing source: ${source} — skipping`)
    return
  }
  const meta = await sharp(source).metadata()
  const sx = meta.width / ref.w
  const sy = meta.height / ref.h
  console.log(`[${label}] source ${meta.width}×${meta.height} — scale ${sx.toFixed(2)}, ${sy.toFixed(2)}`)
  for (const c of crops) {
    const left   = Math.round(c.x * sx)
    const top    = Math.round(c.y * sy)
    const width  = Math.round(c.w * sx)
    const height = Math.round(c.h * sy)
    const out = join(OUT_DIR, `${c.name.startsWith('logo-') ? c.name : 'panel-' + c.name}.jpg`)
    await sharp(source)
      .extract({ left, top, width, height })
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(out)
    const fname = out.split(/[\\/]/).pop()
    console.log(`  ✓ ${fname}  (${width}×${height})`)
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  await cropSet({
    source: SATURDAY_SOURCE,
    ref: SATURDAY_REF,
    crops: SATURDAY_PANELS,
    label: 'saturday',
  })

  await cropSet({
    source: LOGO_SOURCE,
    ref: LOGO_REF,
    crops: LOGO_CROPS,
    label: 'logo',
  })

  console.log(`\ndone. assets in public/images/.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
