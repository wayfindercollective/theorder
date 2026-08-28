/**
 * Compress a video in the browser, before it is uploaded.
 *
 * WHY THIS EXISTS. Clips used to go to Blob exactly as they came off a phone.
 * The tab warned when one was large, but only after the upload had finished,
 * and a 76 MB testimonial duly went live — on a rail where every tile fetches
 * its clip. The ffmpeg script in scripts/ can only fix files that live in the
 * repo, so anything added through /admin escaped it entirely. Compressing here
 * is the only point in the flow that catches every clip, whoever adds it.
 *
 * HOW. The clip is played through a hidden <video>, each frame is drawn to a
 * canvas at the target size, and the canvas stream plus the element's audio are
 * recorded with MediaRecorder. Drawing through a canvas also bakes in the
 * rotation matrix phones attach, so sideways clips come out upright.
 *
 * Recording is driven by playback, so a pass takes about as long as the clip
 * runs — hence `onProgress`. Renditions are produced in ONE pass: several
 * canvases and recorders share the same playing element, so asking for 720p and
 * 540p costs the same wall-clock as asking for one.
 *
 * MP4 ONLY, DELIBERATELY. MediaRecorder will happily hand back WebM, which iOS
 * Safari will not play — uploading that would trade a slow testimonial for an
 * invisible one. If this browser cannot record MP4, `canTranscode()` is false
 * and the caller blocks the upload instead of shipping something unplayable.
 */

import { finalizeRecordedMp4 } from './mp4Duration.js'

// Short edge, matching scripts/optimize-hero-videos.mjs. Portrait phone video
// becomes 720x1280; landscape becomes 1280x720.
export const RENDITION_720 = 720
export const RENDITION_540 = 540

// Under this, a clip is already light enough that a re-encode would cost
// quality and the admin's time for no real gain.
const SKIP_BELOW_BYTES = 10 * 1024 * 1024
const SKIP_BELOW_SHORT_EDGE = 900

const FPS = 30
const AUDIO_BPS = 96_000
// Chosen to land near the ffmpeg output for the same material (~1.4 Mbps at
// 720x1280). Scaled by pixel count so 540p asks for proportionally less.
const BITS_PER_PIXEL_PER_SECOND = 0.0575

const MP4_TYPES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
]

function supportedMp4Type() {
  if (typeof MediaRecorder === 'undefined') return null
  return MP4_TYPES.find((t) => {
    try { return MediaRecorder.isTypeSupported(t) } catch { return false }
  }) || null
}

/** Whether this browser can produce an MP4 we would be willing to publish. */
export function canTranscode() {
  if (typeof window === 'undefined') return false
  if (typeof HTMLCanvasElement === 'undefined') return false
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function') return false
  if (typeof (window.AudioContext || window.webkitAudioContext) !== 'function') return false
  return !!supportedMp4Type()
}

/** Even dimensions only — H.264 chroma subsampling requires them. */
function targetSize(width, height, shortEdge) {
  const short = Math.min(width, height)
  const scale = short > shortEdge ? shortEdge / short : 1
  const even = (n) => Math.max(2, Math.round(n * scale / 2) * 2)
  return { width: even(width), height: even(height) }
}

function loadVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'auto'
    v.playsInline = true
    // Not `muted`: the audio has to reach the WebAudio graph to be recorded.
    // Nothing is connected to the speakers, so this stays silent regardless.
    v.src = url
    const done = (fn, arg) => { v.removeEventListener('loadedmetadata', ok); v.removeEventListener('error', bad); fn(arg) }
    const ok = () => done(resolve, { video: v, url })
    const bad = () => { URL.revokeObjectURL(url); done(reject, new Error('This file could not be read as a video.')) }
    v.addEventListener('loadedmetadata', ok)
    v.addEventListener('error', bad)
    v.load()
  })
}

function isMp4File(file) {
  return file.type === 'video/mp4' || /\.mp4$/i.test(file.name || '')
}

async function browserSafeMp4(blob, name, expectedDuration) {
  const finalised = await finalizeRecordedMp4(blob, expectedDuration)
  const base = (name || 'clip.mp4').replace(/\.[^.]+$/, '') || 'clip'
  return new File([finalised.blob], `${base}.mp4`, { type: 'video/mp4' })
}

/**
 * @param {File} file
 * @param {{ renditions?: number[], onProgress?: (pct:number)=>void }} opts
 * @returns {Promise<{ skipped: boolean, reason?: string, file?: File, width?: number, height?: number,
 *                     outputs: Array<{ shortEdge: number, file: File, width: number, height: number }> }>}
 *   `skipped` means no re-encode was needed; `file` is still the duration-checked
 *   MP4 that should be uploaded (it may carry repaired header metadata).
 */
export async function transcodeVideo(file, { renditions = [RENDITION_720], onProgress } = {}) {
  if (!canTranscode()) throw new Error('This browser cannot compress video.')

  const { video, url } = await loadVideo(file)
  const cleanupUrl = () => URL.revokeObjectURL(url)

  const srcW = video.videoWidth
  const srcH = video.videoHeight
  const duration = video.duration

  if (!srcW || !srcH) {
    cleanupUrl()
    throw new Error('This video has no picture track.')
  }
  // A live stream or a file with an unreadable header reports Infinity. It
  // cannot be checked for truncation, so it must not reach the public site.
  if (!Number.isFinite(duration) || duration <= 0) {
    cleanupUrl()
    throw new Error('This video does not report a reliable duration.')
  }
  if (
    file.size <= SKIP_BELOW_BYTES &&
    Math.min(srcW, srcH) <= SKIP_BELOW_SHORT_EDGE &&
    isMp4File(file)
  ) {
    try {
      // Small clips keep their encoded picture, but never bypass the structural
      // check. Fragmented MP4s get their full duration written into the header;
      // malformed/non-faststart files fall through and are rebuilt below.
      const safeFile = await browserSafeMp4(file, file.name, duration)
      cleanupUrl()
      return {
        skipped: true,
        reason: 'already-small',
        file: safeFile,
        width: srcW,
        height: srcH,
        outputs: [],
      }
    } catch {
      // Playback already proved this browser can read the source. Re-encoding
      // gives it a new MP4 structure which is finalised below.
    }
  }

  const mimeType = supportedMp4Type()
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const audioCtx = new AudioCtx()
  // Autoplay policy can hand back a suspended context; the caller is inside a
  // user gesture, so this is the moment it will actually resume.
  if (audioCtx.state === 'suspended') { try { await audioCtx.resume() } catch { /* recorded silent */ } }
  const audioDest = audioCtx.createMediaStreamDestination()
  let audioSource = null
  try {
    audioSource = audioCtx.createMediaElementSource(video)
    audioSource.connect(audioDest)
    // Intentionally NOT connected to audioCtx.destination — the admin should
    // not have to listen to the clip while it compresses.
  } catch {
    /* No audio track, or the element refused a source: record picture only. */
  }

  const jobs = renditions.map((shortEdge) => {
    const { width, height } = targetSize(srcW, srcH, shortEdge)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })
    // captureStream(0) emits a frame only when we ask, so the output carries
    // exactly the frames we drew. On a fixed rate the browser samples the
    // canvas on its own clock and a decode stall becomes a run of duplicated
    // frames padding the clip out.
    const stream = canvas.captureStream(0)
    audioDest.stream.getAudioTracks().forEach((t) => stream.addTrack(t.clone()))
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: Math.round(width * height * FPS * BITS_PER_PIXEL_PER_SECOND),
      audioBitsPerSecond: AUDIO_BPS,
    })
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
    return { shortEdge, width, height, canvas, ctx, stream, recorder, chunks }
  })

  const stopAll = () => {
    jobs.forEach((j) => { try { if (j.recorder.state !== 'inactive') j.recorder.stop() } catch { /* already stopped */ } })
  }
  const teardown = () => {
    try { video.pause() } catch { /* nothing playing */ }
    try { audioSource?.disconnect() } catch { /* not connected */ }
    try { audioCtx.close() } catch { /* already closed */ }
    cleanupUrl()
  }

  try {
    await new Promise((resolve, reject) => {
      let finished = 0
      let started = false
      const fail = (err) => { stopAll(); reject(err) }

      jobs.forEach((j) => {
        j.recorder.onstop = () => { if (++finished === jobs.length) resolve() }
        j.recorder.onerror = () => fail(new Error('The browser stopped compressing this video.'))
      })

      // Paint the current frame into every canvas and hand it to the encoders.
      const draw = (emit) => {
        jobs.forEach((j) => j.ctx.drawImage(video, 0, 0, j.width, j.height))
        if (emit && started) {
          jobs.forEach((j) => j.stream.getVideoTracks()[0]?.requestFrame?.())
        }
        onProgress?.(Math.min(99, Math.round((video.currentTime / duration) * 100)))
      }

      const nextFrame = (fn) => {
        if (typeof video.requestVideoFrameCallback === 'function') video.requestVideoFrameCallback(fn)
        else requestAnimationFrame(fn)
      }

      // Sampling is driven by a plain interval rather than by decoded-frame
      // callbacks. requestVideoFrameCallback is tied to the compositor and gets
      // throttled — measured at half rate in a headless window — which would
      // silently halve the frame rate of whatever Nico uploads. A timer samples
      // the playing element at a steady FPS no matter how the page is composited.
      let timer = 0
      const startPump = () => { timer = window.setInterval(() => { if (!video.ended && !video.paused) draw(true) }, 1000 / FPS) }
      const stopPump = () => { window.clearInterval(timer); timer = 0 }

      video.addEventListener('ended', () => {
        stopPump()
        draw(true)
        // Just enough for the final frame and audio tail to reach the encoder.
        // Longer than this and the clip ends on a frozen frame over silence.
        setTimeout(stopAll, 120)
      }, { once: true })
      video.addEventListener('error', () => fail(new Error('Playback failed while compressing this video.')), { once: true })

      // Order matters for lip sync. The audio track produces nothing until the
      // element is actually playing, but a canvas will happily emit frames
      // before then — starting the recorders first gives the video a lead of
      // blank frames that the audio never gets, and the whole clip plays out of
      // sync by that much. So: paint frame one, start playback, wait for a real
      // decoded frame, and only then start recording.
      draw(false)
      video.play().then(() => {
        nextFrame(() => {
          started = true
          // Do not request one-second data chunks. All output lives in memory
          // until upload anyway, and forcing chunks encourages extra fragments.
          // Browsers may still emit fMP4, so every result is finalised below.
          jobs.forEach((j) => j.recorder.start())
          draw(true)
          startPump()
        })
      }).catch(() => fail(new Error(
        'The browser blocked the playback needed to compress this video. Choose the file again.'
      )))
    })
  } finally {
    teardown()
  }

  const base = (file.name || 'clip.mp4').replace(/\.[^.]+$/, '')
  const outputs = await Promise.all(jobs.map(async (j) => {
    const blob = new Blob(j.chunks, { type: 'video/mp4' })
    const safeFile = await browserSafeMp4(blob, `${base}-${j.shortEdge}.mp4`, duration)
    return {
      shortEdge: j.shortEdge,
      width: j.width,
      height: j.height,
      file: safeFile,
    }
  }))

  if (outputs.some((o) => o.file.size === 0)) {
    throw new Error('Compression produced an empty file.')
  }
  // A re-encode that grew the file has done the opposite of its job. Only
  // meaningful for a single rendition; a multi-rendition ask is deliberate.
  if (outputs.length === 1 && outputs[0].file.size >= file.size) {
    if (isMp4File(file)) {
      try {
        const safeFile = await browserSafeMp4(file, file.name, duration)
        return {
          skipped: true,
          reason: 'no-saving',
          file: safeFile,
          width: srcW,
          height: srcH,
          outputs: [],
        }
      } catch {
        // The source is structurally unsafe, so prefer the larger verified
        // rendition to uploading it unchanged.
      }
    }
  }

  onProgress?.(100)
  return { skipped: false, width: srcW, height: srcH, outputs }
}
