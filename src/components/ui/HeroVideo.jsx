/**
 * Hero video — Nico's "Who Am I" playable before any scroll (HERO_VIDEO flag,
 * previewing at /preview; see HERO_VIDEO_PLAN.md).
 *
 * Desktop (>=901px): the horseman film itself is the play surface — the whole
 * right half of the split hero is one button with a play glyph and label over
 * the painting. No framed card (a fixed-frame poster letterboxed the footage).
 *
 * Mobile (<901px): a compact play bar between the verse line and the CTA.
 *
 * Both open the same fullscreen overlay player. play() runs inside the
 * click/tap call stack so iOS permits sound; the overlay's video fetches
 * nothing until then (desktop warms metadata via maxPreload).
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { founderContent } from '../../config/sectionContent.js'
import { maxPreload, pickVideoSource } from '../../lib/video.js'

const videoLabel = () => founderContent.videoLabel || "Watch Nico's Story"

function OverlayPlayer({ open, onClose, videoRef, videoSrc, preload }) {
  // Lock page scroll behind the fullscreen overlay; ESC closes it.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Shown/hidden via the `open` class (not `hidden`) so the player can zoom
  // in and fade like a YouTube fullscreen transition; `visibility` in the CSS
  // keeps the closed overlay out of the way and the a11y tree.
  return createPortal(
    <div className={'hero-video-overlay' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-label={videoLabel()}>
      <button type="button" className="hero-video-overlay-close" onClick={onClose} aria-label="Close video">
        ✕
      </button>
      {/* No poster: the portrait flashing up before the first frame loaded
          read as a glitch. Black ground until the footage arrives. The
          portrait image itself stays in the site and the admin library. */}
      <video
        ref={videoRef}
        src={videoSrc}
        controls
        playsInline
        preload={preload}
        onEnded={onClose}
      >
        Your browser does not support embedded video.
      </video>
    </div>,
    document.body
  )
}

function useOverlayPlayer(preload) {
  const [open, setOpen] = useState(false)
  const videoRef = useRef(null)
  const [videoSrc] = useState(() => pickVideoSource(founderContent.video, founderContent.videoMobile))

  const show = () => {
    // Synchronous play() within the user gesture: iOS then permits sound.
    // The overlay video is hidden this instant; unhiding follows in the same
    // render pass.
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
    // Drop focus from the trigger so no focus ring lingers on the huge
    // click surface after ESC.
    try { document.activeElement?.blur() } catch { /* noop */ }
  }

  return {
    show,
    overlay: (
      <OverlayPlayer open={open} onClose={close} videoRef={videoRef} videoSrc={videoSrc} preload={preload} />
    ),
  }
}

// Desktop: the horseman IS the button. Covers the film's geometry (right 56%).
export function HeroVideoTrigger() {
  const [preload] = useState(maxPreload)
  const { show, overlay } = useOverlayPlayer(preload)
  // Not mounted on phones: the bar takes over there, and this keeps exactly
  // one openable overlay per breakpoint.
  const [isDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches
  )
  if (!founderContent.video || !isDesktop) return null
  return (
    <>
      <button type="button" className="hero-video-film-btn" onClick={show} aria-label={videoLabel()}>
        <span className="hero-video-pill">
          <span className="founder-video-play" aria-hidden="true">▶</span>
          <span className="founder-video-label display">{videoLabel()}</span>
        </span>
      </button>
      {overlay}
    </>
  )
}

// Mobile: compact play bar in the hero content column.
export function HeroVideoBar() {
  const { show, overlay } = useOverlayPlayer('none')
  if (!founderContent.video) return null
  return (
    <>
      <button type="button" className="hero-video-bar hero-video-pill" onClick={show}>
        <span className="founder-video-play" aria-hidden="true">▶</span>
        <span className="founder-video-label display">{videoLabel()}</span>
      </button>
      {overlay}
    </>
  )
}
