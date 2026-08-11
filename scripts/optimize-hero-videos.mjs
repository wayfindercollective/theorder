/**
 * optimize-hero-videos.mjs — two renditions per hero clip, desktop + mobile.
 *
 * The two clips Nico speaks to camera in — the Who Am I story and the
 * post-questionnaire CTA — shipped as single 15 MB and 21 MB files at ~2–2.7
 * Mbps. Both are handheld outdoor footage, which is grainy and therefore
 * expensive to encode: raising CRF alone barely moved them, so each pass
 * denoises first (hqdn3d) and the bitrate falls out of that.
 *
 * Each clip becomes TWO files rather than one, because the players are small:
 * the qualified-screen frame is min(100%, 420px) and the founder portrait is
 * a 3/4 card, so a 9:16 clip letterboxes to roughly 315 CSS px on desktop and
 * ~220 on a phone. 720p already exceeds what a retina desktop resolves there;
 * 540p covers phones. The components pick between them at mount via
 * src/lib/video.js — `<source media>` is ignored for <video>, so the choice
 * cannot be made in markup.
 *
 * Both renditions are written with +faststart (moov atom first) so playback
 * can begin from the opening bytes instead of waiting on a trailing index.
 *
 * Originals move to asset-sources/video-web-originals/ so they stop deploying.
 * (The true camera masters already live in the asset-sources video-import
 * folders.) Update sections.json `video` / `videoMobile` to the emitted names.
 *
 * Needs ffmpeg: uses $FFMPEG_PATH if set, else `ffmpeg` on PATH.
 *
 *   node scripts/optimize-hero-videos.mjs [--force]
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(root, 'public', 'videos')
const ORIGINALS = path.join(root, 'asset-sources', 'video-web-originals')
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'

// The clips this script owns, by base name. Testimonial tiles are handled by
// optimize-videos.mjs — different folder, single rendition, poster frames.
const CLIPS = ['who-am-i', 'post-questionnaire-cta']

// Moderate denoise: strong enough to take the grain out of the handheld
// footage (the whole reason these files were so large), gentle enough that it
// reads as flattering skin rather than smeared. Verified frame-by-frame
// against the originals at display scale before these numbers were fixed.
const DENOISE = 'hqdn3d=4:3:6:6'

// CRF is per-rendition: the 720p file is downscaled again at display time, so
// it tolerates more compression than its pixel count suggests.
const RENDITIONS = [
  { suffix: '720', vf: DENOISE, crf: '31', profile: 'high', level: '4.0', audio: '96k' },
  { suffix: '540', vf: `${DENOISE},scale=540:960:flags=lanczos`, crf: '30', profile: 'main', level: '3.1', audio: '80k' },
]

function ff(args) {
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
}

fs.mkdirSync(ORIGINALS, { recursive: true })
let before = 0
// Keyed by rendition: a visitor downloads one of these, never the sum of both,
// so totalling every emitted file would badly understate the saving.
const after = {}

for (const name of CLIPS) {
  const live = path.join(DIR, `${name}.mp4`)
  const keep = path.join(ORIGINALS, `${name}-ORIGINAL-web.mp4`)

  // Idempotence, same contract as optimize-videos.mjs: once the original is in
  // asset-sources the renditions exist, so skip. A forced re-run always encodes
  // from the preserved original, never from a rendition (no generational loss).
  const hasOriginal = fs.existsSync(keep)
  if (hasOriginal && process.argv[2] !== '--force') {
    console.log(`skip ${name} (already optimized — pass --force to redo from the original)`)
    continue
  }
  const input = hasOriginal ? keep : live
  if (!fs.existsSync(input)) {
    console.log(`skip ${name} (no source found)`)
    continue
  }

  const srcBytes = fs.statSync(input).size
  before += srcBytes
  const sizes = []
  const perVisitor = {}

  for (const r of RENDITIONS) {
    const out = path.join(DIR, `${name}-${r.suffix}.mp4`)
    ff([
      '-i', input,
      '-vf', r.vf,
      '-c:v', 'libx264', '-profile:v', r.profile, '-level', r.level,
      '-pix_fmt', 'yuv420p', '-crf', r.crf, '-preset', 'slower',
      // Keyframe every 2s at 30fps, fixed: makes seeking responsive and keeps
      // the two renditions structurally comparable.
      '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
      '-c:a', 'aac', '-b:a', r.audio, '-ac', '2',
      '-movflags', '+faststart',
      out,
    ])
    const bytes = fs.statSync(out).size
    after[r.suffix] = (after[r.suffix] || 0) + bytes
    perVisitor[r.suffix] = bytes
    sizes.push(`${r.suffix}p ${(bytes / 1048576).toFixed(1)} MB`)
  }

  // Only now retire the single-rendition original out of public/.
  if (!hasOriginal) fs.renameSync(live, keep)
  else if (fs.existsSync(live)) fs.rmSync(live)

  const cut = (b) => `${(100 - (b / srcBytes) * 100).toFixed(0)}%`
  console.log(
    `${name.padEnd(24)} ${(srcBytes / 1048576).toFixed(1)} MB → ${sizes.join(' + ')}` +
    `   (−${cut(perVisitor['720'])} desktop, −${cut(perVisitor['540'])} mobile)`
  )
}

if (before) {
  const mb = (b) => (b / 1048576).toFixed(1)
  console.log('-'.repeat(70))
  // Per rendition, because that is what one visitor actually downloads.
  for (const suffix of Object.keys(after)) {
    const pct = (100 - (after[suffix] / before) * 100).toFixed(0)
    console.log(`${suffix}p visitors: ${mb(before)} MB → ${mb(after[suffix])} MB  (${pct}% less over the wire)`)
  }
  console.log('Point sections.json `video` at -720.mp4 and `videoMobile` at -540.mp4.')
}
