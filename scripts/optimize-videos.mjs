/**
 * optimize-videos.mjs — compress the testimonial clips + emit poster frames.
 *
 * The raw phone/edit exports in public/testimonials/ were 10–30 MB EACH
 * (~78 MB total) and the evidence marquee loads every one, which was most of
 * the site's slow first load. This re-encodes each clip to H.264 with the
 * short side capped at 720px (tiles render at 227 CSS px; fullscreen playback
 * still looks clean), CRF 26, faststart for instant streaming — and captures a
 * poster JPEG at 2× tile width so the lazy `<video preload="none">` tiles have
 * a real frame before any video bytes download.
 *
 * Originals are moved to asset-sources/testimonials-originals/ first (kept out
 * of public/ so they never deploy again). Poster paths follow the
 * "<name>-poster.jpg" convention wired into sections.json evidence cards.
 *
 * Needs ffmpeg: uses $FFMPEG_PATH if set, else `ffmpeg` on PATH.
 *
 *   FFMPEG_PATH="C:\\path\\to\\ffmpeg.exe" node scripts/optimize-videos.mjs
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(root, 'public', 'testimonials')
const ORIGINALS = path.join(root, 'asset-sources', 'testimonials-originals')
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'

// Short side → 720 (landscape becomes ####x720, portrait 720x####); never
// upscale. Expressions are single-quoted for ffmpeg's filter parser (bare
// commas would read as filter separators).
const SCALE = "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'"

function ff(args) {
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
}

fs.mkdirSync(ORIGINALS, { recursive: true })
const clips = fs.readdirSync(DIR).filter((f) => /\.mp4$/i.test(f))
let before = 0
let after = 0

for (const f of clips) {
  const src = path.join(DIR, f)
  const keep = path.join(ORIGINALS, f)
  const tmp = path.join(DIR, f.replace(/\.mp4$/i, '.tmp.mp4'))
  const poster = path.join(DIR, f.replace(/\.mp4$/i, '-poster.jpg'))

  // Idempotence: once the original lives in asset-sources, the copy in
  // public/ is already the compressed derivative — skip unless forced.
  // A forced re-run ALWAYS encodes from the preserved original, never from
  // the derivative (no generational loss).
  const hasOriginal = fs.existsSync(keep)
  if (hasOriginal && process.argv[2] !== '--force') {
    console.log(`skip ${f} (already optimized — pass --force to redo from the original)`)
    continue
  }
  const input = hasOriginal ? keep : src

  const srcBytes = fs.statSync(input).size
  before += srcBytes

  ff([
    '-i', input,
    // fps=30: two of the sources are 60fps phone exports — pointless for a
    // talking head and roughly doubles the bitrate a given quality needs.
    '-vf', `${SCALE},fps=30`,
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '26', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '96k',
    tmp,
  ])
  // Poster: a frame from 1s in (skips black lead-ins), 2× tile width.
  ff(['-ss', '1', '-i', tmp, '-frames:v', '1', '-vf', "scale='min(454,iw)':-2", '-q:v', '4', poster])

  if (hasOriginal) fs.rmSync(src)   // replacing an older derivative
  else fs.renameSync(src, keep)     // first run: preserve the original
  fs.renameSync(tmp, src)
  const outBytes = fs.statSync(src).size
  after += outBytes
  console.log(`${f.padEnd(22)} ${(srcBytes / 1048576).toFixed(1)} MB → ${(outBytes / 1048576).toFixed(1)} MB  (+ poster)`)
}

if (before) {
  console.log('-'.repeat(60))
  console.log(`total ${(before / 1048576).toFixed(1)} MB → ${(after / 1048576).toFixed(1)} MB (${(100 - (after / before) * 100).toFixed(0)}% smaller)`)
}
