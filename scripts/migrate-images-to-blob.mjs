/**
 * One-time migration: lift every file in /public/images/ into Vercel Blob
 * and rewrite content/sections.json to reference the new blob URLs.
 *
 * Run from the repo root:
 *
 *   $env:BLOB_READ_WRITE_TOKEN = "<your blob token>"
 *   node scripts/migrate-images-to-blob.mjs
 *
 * The token must be a Vercel Blob *read/write* token for a PUBLIC store.
 * Find it: Vercel → Storage → <your blob store> → .env.local panel → copy
 * the value of BLOB_READ_WRITE_TOKEN.
 *
 * After running:
 *   1. Inspect the diff:  git diff content/sections.json
 *   2. Commit + push      git add content/sections.json ; git commit -m "..."
 *   3. Verify the site still renders (live images now load from blob)
 *   4. Optionally delete public/images/ — nothing references it anymore
 *
 * Re-running is safe: each file lands at a stable blob path (no timestamp
 * suffix), so a second run overwrites in place. URLs stay identical.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { resolve, join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const IMAGES_DIR = join(ROOT, 'public', 'images')
const SECTIONS_PATH = join(ROOT, 'content', 'sections.json')

const TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN ||
  process.env.IMAGES_BLOB_READ_WRITE_TOKEN

if (!TOKEN) {
  console.error('ERROR: Set BLOB_READ_WRITE_TOKEN (or IMAGES_BLOB_READ_WRITE_TOKEN) before running.')
  console.error('       Copy it from Vercel → Storage → your blob store → .env.local')
  process.exit(1)
}

const CONTENT_TYPE = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
}

async function main() {
  const { put } = await import('@vercel/blob')

  const files = (await readdir(IMAGES_DIR)).filter((f) => CONTENT_TYPE[extname(f).toLowerCase()])
  if (files.length === 0) {
    console.log('No image files found in', IMAGES_DIR)
    return
  }
  console.log(`Found ${files.length} image(s) to migrate.\n`)

  /** Map of "/images/foo.jpg" → "https://blob…/images/foo.jpg" */
  const urlMap = new Map()

  for (const name of files) {
    const filePath = join(IMAGES_DIR, name)
    const buf = await readFile(filePath)
    const ext = extname(name).toLowerCase()
    const contentType = CONTENT_TYPE[ext]
    const blobPath = `images/${basename(name)}`

    process.stdout.write(`  ↑  ${name} (${(buf.length / 1024).toFixed(0)} KB) … `)
    const blob = await put(blobPath, buf, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      token: TOKEN,
    })
    console.log('done →', blob.url)
    urlMap.set(`/images/${name}`, blob.url)
  }

  // Now rewrite sections.json. We do a string-level swap because the JSON has
  // these references in many places (image, frames[].src, etc.) and a deep
  // walk would duplicate that surface for no gain.
  const sectionsRaw = await readFile(SECTIONS_PATH, 'utf-8')
  let updated = sectionsRaw
  let replacements = 0
  for (const [oldPath, newUrl] of urlMap) {
    // Wrap in JSON-quoted form so we only match values, not partial paths.
    const needle = JSON.stringify(oldPath)
    const replacement = JSON.stringify(newUrl)
    const parts = updated.split(needle)
    if (parts.length > 1) {
      replacements += parts.length - 1
      updated = parts.join(replacement)
    }
  }

  if (replacements > 0) {
    await writeFile(SECTIONS_PATH, updated, 'utf-8')
    console.log(`\n✓ Rewrote ${replacements} reference(s) in content/sections.json`)
  } else {
    console.log('\nℹ sections.json had no /images/ references to rewrite.')
  }

  console.log('\nNext steps:')
  console.log('  git diff content/sections.json    # inspect the rewrite')
  console.log('  git add content/sections.json')
  console.log('  git commit -m "migrate static images to Vercel Blob"')
  console.log('  git push')
  console.log('\nAfter you confirm the live site still renders, you can delete public/images/.')
}

main().catch((err) => {
  console.error('\nMigration failed:', err?.message || err)
  process.exit(1)
})
