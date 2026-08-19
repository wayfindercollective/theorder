/**
 * Hero video — Nico's "Who Am I" playable before any scroll (HERO_VIDEO flag
 * in design.js; see HERO_VIDEO_PLAN.md).
 *
 * Desktop (>=901px): idle, the horseman film is the play surface — the whole
 * right half is one button with the pill over the painting. Clicking it plays
 * the video INLINE in a framed tile centred over that half (the treatment the
 * founder-section card used to have); fullscreen is an option via the
 * player's own controls, never forced. ESC or the tile's X returns to idle.
 *
 * Mobile (<901px): a compact play bar between the verse line and the CTA,
 * opening the dark overlay player — again with fullscreen available from the
 * native controls rather than entered automatically (flip
 * MOBILE_NATIVE_FULLSCREEN below to restore straight-to-fullscreen).
 *
 * play() always runs inside the click/tap call stack so iOS permits sound.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { founderContent } from '../../config/sectionContent.js'
import { maxPreload, pickVideoSource } from '../../lib/video.js'

// Nico's call 2026-08-19: tapping play shows the player, it does not slam to
// fullscreen. Set true to make the mobile tap open the device's fullscreen
// player directly again (the native minimise control then exits fully).
const MOBILE_NATIVE_FULLSCREEN = false

const videoLabel = () => founderContent.videoLabel || "Watch Nico's Story"

function OverlayPlayer({ open, onClose, videoRef, videoSrc, preload }) {
  // Swipe to close (mobile): a mostly-vertical drag dismisses the overlay.
  // Horizontal drags stay with the player (scrubbing), taps are unaffected.
  const touchRef = useRef(null)
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchMove = (e) => {
    const s = touchRef.current
    if (!s) return
    const t = e.touches[0]
    const dy = t.clientY - s.y
    const dx = t.clientX - s.x
    if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      touchRef.current = null
      onClose()
    }
  }
  const onTouchEnd = () => { touchRef.current = null }

  // Lock page scroll behind the overlay; ESC closes it (but never while the
  // native fullscreen entered from the controls is active — ESC belongs to
  // the browser there).
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose()
    }
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
    <div
      className={'hero-video-overlay' + (open ? ' open' : '')}
      role="dialog"
      aria-modal="true"
      aria-label={videoLabel()}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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

// `nativeFullscreen`: the tap goes STRAIGHT to the device's own fullscreen
// player, and leaving it by the native minimise control closes the whole
// thing, same as the X. The CSS overlay stays as the fallback for browsers
// where the fullscreen request is refused.
function useOverlayPlayer(preload, nativeFullscreen = false) {
  const [open, setOpen] = useState(false)
  const videoRef = useRef(null)
  const [videoSrc] = useState(() => pickVideoSource(founderContent.video, founderContent.videoMobile))

  const show = () => {
    const el = videoRef.current
    // Synchronous play() within the user gesture: iOS then permits sound.
    // The overlay video is hidden this instant; unhiding follows in the same
    // render pass.
    el?.play()?.catch(() => {})
    if (nativeFullscreen && el) {
      try {
        if (el.webkitEnterFullscreen) el.webkitEnterFullscreen() // iOS Safari
        else if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
      } catch { /* overlay fallback below */ }
    }
    setOpen(true)
  }
  const close = () => {
    const el = videoRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    try {
      if (document.fullscreenElement) document.exitFullscreen()?.catch?.(() => {})
      else if (el?.webkitDisplayingFullscreen && el.webkitExitFullscreen) el.webkitExitFullscreen()
    } catch { /* noop */ }
    setOpen(false)
    // Drop focus from the trigger so no focus ring lingers on the huge
    // click surface after ESC.
    try { document.activeElement?.blur() } catch { /* noop */ }
  }

  // Only when fullscreen was AUTO-entered: leaving it (minimise, iOS "Done",
  // Android back) exits the video entirely, same as the X. When fullscreen is
  // the visitor's own choice via the controls, leaving it just returns to the
  // overlay.
  useEffect(() => {
    if (!open || !nativeFullscreen) return
    const el = videoRef.current
    const onFsChange = () => { if (!document.fullscreenElement) close() }
    const onWebkitEnd = () => close()
    document.addEventListener('fullscreenchange', onFsChange)
    el?.addEventListener('webkitendfullscreen', onWebkitEnd)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      el?.removeEventListener('webkitendfullscreen', onWebkitEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nativeFullscreen])

  return {
    show,
    overlay: (
      <OverlayPlayer open={open} onClose={close} videoRef={videoRef} videoSrc={videoSrc} preload={preload} />
    ),
  }
}

// Desktop: idle = the horseman is the button; playing = a framed tile over
// the right half with the video inline. Fullscreen only via the controls.
export function HeroVideoTrigger() {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  const [videoSrc] = useState(() => pickVideoSource(founderContent.video, founderContent.videoMobile))
  const [preload] = useState(maxPreload)
  // The tile takes the footage's OWN aspect ratio once metadata arrives, so
  // the frame hugs the video exactly — no black bars around it.
  const [ratio, setRatio] = useState(null)
  // Not mounted on phones: the bar takes over there.
  const [isDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches
  )

  // ESC stops inline playback and returns to the pill — unless the visitor is
  // in the fullscreen they chose via the controls, where ESC is the browser's.
  useEffect(() => {
    if (!playing) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) stop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing])

  if (!founderContent.video || !isDesktop) return null

  const start = () => {
    // play() inside the click's call stack; the tile unhides in this render.
    videoRef.current?.play()?.catch(() => {})
    setPlaying(true)
  }
  function stop() {
    const el = videoRef.current
    if (el) {
      el.pause()
      el.currentTime = 0
    }
    setPlaying(false)
    try { document.activeElement?.blur() } catch { /* noop */ }
  }

  return (
    <>
      {!playing && (
        <button type="button" className="hero-video-film-btn" onClick={start} aria-label={videoLabel()}>
          <span className="hero-video-pill">
            <span className="founder-video-play" aria-hidden="true">▶</span>
            <span className="founder-video-label display">{videoLabel()}</span>
          </span>
        </button>
      )}
      <div className="hero-video-slot" hidden={!playing}>
        <div
          className="hero-video-tile card nailed"
          style={ratio ? { '--tile-ratio': ratio } : undefined}
        >
          <span className="nail-tl" />
          <span className="nail-br" />
          <video
            ref={videoRef}
            className="hero-video-tile-video"
            src={videoSrc}
            controls
            playsInline
            preload={preload}
            onEnded={stop}
            onLoadedMetadata={(e) => {
              const { videoWidth: w, videoHeight: h } = e.target
              if (w > 0 && h > 0) setRatio((w / h).toFixed(4))
            }}
          >
            Your browser does not support embedded video.
          </video>
          <button type="button" className="hero-video-tile-close" onClick={stop} aria-label="Close video">
            ✕
          </button>
        </div>
      </div>
    </>
  )
}

// Mobile: compact play bar in the hero content column.
export function HeroVideoBar() {
  const { show, overlay } = useOverlayPlayer('none', MOBILE_NATIVE_FULLSCREEN)
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
