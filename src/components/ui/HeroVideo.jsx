/**
 * Hero video — Nico's "Who Am I" playable before any scroll (HERO_VIDEO flag,
 * previewing at /preview; see HERO_VIDEO_PLAN.md).
 *
 * Desktop (>=901px): a framed click-to-play card centred over the right half
 * of the split hero, same card treatment and video mechanics as the founder
 * section. Rendered as a sibling layer of .hero-content (z2, above film z0 and
 * vignette z1); `isolation` keeps the card's internal stacking self-contained.
 *
 * Mobile (<901px): the 100vh hero has no room for a card, so a compact play
 * bar sits between the verse line and the CTA and opens a fullscreen overlay
 * player. play() runs inside the tap's call stack so iOS allows sound, and the
 * overlay's video preloads nothing until that tap.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { founderContent } from '../../config/sectionContent.js'
import { bgImage } from '../../lib/img.js'
import { maxPreload, pickVideoSource } from '../../lib/video.js'

export function HeroVideoCard() {
  const [started, setStarted] = useState(false)
  const videoRef = useRef(null)
  const [videoSrc] = useState(() => pickVideoSource(founderContent.video, founderContent.videoMobile))
  const [preload] = useState(maxPreload)
  // Mounted only when the desktop layout actually applies: a display:none
  // video still fetches, and phones use the overlay instead.
  const [isDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches
  )

  if (!founderContent.video || !isDesktop) return null
  const label = founderContent.videoLabel || "Watch Nico's Story"

  const start = () => {
    setStarted(true)
    videoRef.current?.play()?.catch(() => {})
  }

  return (
    <div className="hero-video-slot">
      <div
        className={
          'hero-video-card founder-portrait card nailed has-video' +
          (founderContent.portrait ? ' has-portrait' : '')
        }
        style={founderContent.portrait ? { backgroundImage: bgImage(founderContent.portrait) } : undefined}
      >
        <span className="nail-tl" />
        <span className="nail-br" />
        <video
          ref={videoRef}
          className="founder-video"
          src={videoSrc}
          poster={founderContent.portrait || undefined}
          controls={started}
          playsInline
          preload={preload}
          onPlay={() => setStarted(true)}
          onEnded={() => {
            if (videoRef.current) videoRef.current.currentTime = 0
            setStarted(false)
          }}
          onError={() => setStarted(false)}
        >
          Your browser does not support embedded video.
        </video>
        {!started && (
          <button type="button" className="founder-video-trigger" onClick={start} aria-label={label}>
            <span className="founder-video-play" aria-hidden="true">▶</span>
            <span className="founder-video-label display">{label}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export function HeroVideoBar() {
  const [open, setOpen] = useState(false)
  const videoRef = useRef(null)
  const [videoSrc] = useState(() => pickVideoSource(founderContent.video, founderContent.videoMobile))

  // Lock page scroll behind the fullscreen overlay.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!founderContent.video) return null
  const label = founderContent.videoLabel || "Watch Nico's Story"

  const openOverlay = () => {
    // Synchronous play() within the tap gesture: iOS then permits sound.
    // The overlay video is still hidden this instant; unhiding follows in
    // the same render pass.
    videoRef.current?.play()?.catch(() => {})
    setOpen(true)
  }

  const close = () => {
    const el = videoRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    setOpen(false)
  }

  return (
    <>
      <button type="button" className="hero-video-bar" onClick={openOverlay}>
        <span className="founder-video-play" aria-hidden="true">▶</span>
        <span className="founder-video-label display">{label}</span>
      </button>
      {createPortal(
        <div className="hero-video-overlay" hidden={!open} role="dialog" aria-modal="true" aria-label={label}>
          <button type="button" className="hero-video-overlay-close" onClick={close} aria-label="Close video">
            ✕
          </button>
          <video
            ref={videoRef}
            src={videoSrc}
            poster={founderContent.portrait || undefined}
            controls
            playsInline
            preload="none"
            onEnded={close}
          >
            Your browser does not support embedded video.
          </video>
        </div>,
        document.body
      )}
    </>
  )
}
