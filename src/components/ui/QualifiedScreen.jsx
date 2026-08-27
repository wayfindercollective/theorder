import { useEffect, useRef, useState } from 'react'
import {
  brandContent,
  footerContent,
  qualifiedScreenContent,
} from '../../config/sectionContent.js'
import { track } from '../../lib/analytics.js'
import { bgImage, siteLogo } from '../../lib/img.js'
import { maxPreload, pickVideoSource } from '../../lib/video.js'

function instagramDetails() {
  const url = qualifiedScreenContent.instagramUrl || footerContent.instagram || ''
  const fallbackHandle = url ? url.replace(/\/+$/, '').split('/').pop() : 'theorder.global'
  const rawHandle = qualifiedScreenContent.instagramHandle || fallbackHandle
  return { url, handle: rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}` }
}

// This screen exists to get Nico's message watched — there is nothing else to
// do on it — so the video is mounted with the rest of the page and buffers
// during the reveal animation rather than waiting for the press.
//
// `inView` comes from the section around it. In the normal flow it is already
// true (they just answered the last question here), so buffering starts at
// once. It matters on a reload: the questionnaire result is restored from
// sessionStorage, so this screen remounts at the very bottom of a homepage
// that opens at the top, and without the gate it would pull the whole clip
// down before the applicant had scrolled anywhere near it.

/**
 * The successful result of the local questionnaire filter. There is
 * deliberately no booking link here. The applicant must first contact Nico on
 * Instagram; Nico sends the private /application URL himself if they should move
 * forward.
 */
export function QualifiedScreen({ inView = true }) {
  const [stage, setStage] = useState(0)
  const [videoStarted, setVideoStarted] = useState(false)
  const [ratio, setRatio] = useState(null)
  const videoRef = useRef(null)
  const [videoSrc] = useState(() => pickVideoSource(
    qualifiedScreenContent.video,
    qualifiedScreenContent.videoMobile,
  ))
  const [preload] = useState(maxPreload)
  const { url, handle } = instagramDetails()
  const videoLabel = qualifiedScreenContent.videoLabel || "Watch Nico's Message"
  const message = qualifiedScreenContent.message ??
    "Watch Nico's video, then take the next step."
  const note = qualifiedScreenContent.note ?? ''

  useEffect(() => {
    const first = setTimeout(() => setStage(1), 350)
    const second = setTimeout(() => setStage(2), 950)
    const third = setTimeout(() => setStage(3), 1450)
    return () => {
      clearTimeout(first)
      clearTimeout(second)
      clearTimeout(third)
    }
  }, [])

  const startVideo = () => {
    const el = videoRef.current
    if (!el) return
    setVideoStarted(true)
    track('qualified_video_started')
    // Rejects if the applicant navigates away or interrupts the start. Not
    // worth surfacing: the native controls are showing by then, so the video
    // sits there paused and one tap resumes it.
    el.play()?.catch(() => {})
  }

  return (
    <div className="final-screen qualified-screen">
      <div className={'final-mark' + (stage >= 1 ? ' in' : '')}>
        <img
          className="logo-mark final-logo"
          src={siteLogo(brandContent?.logo)}
          alt="The Order"
        />
      </div>

      <h2 className={'final-heading display' + (stage >= 2 ? ' in' : '')}>
        {qualifiedScreenContent.heading || 'Congratulations'}
      </h2>
      <p className={'final-sub final-sub--gilded' + (stage >= 2 ? ' in' : '')}>
        {qualifiedScreenContent.sub || 'You have passed the first stage.'}
      </p>

      <div className={'qualified-next' + (stage >= 3 ? ' in' : '')}>
        {qualifiedScreenContent.video ? (
          <div
            className="qualified-video qualified-video-frame"
            style={{
              ...(qualifiedScreenContent.poster
                ? { backgroundImage: bgImage(qualifiedScreenContent.poster) }
                : {}),
              // The frame hugs the footage: its ratio comes from the clip's own
              // dimensions once metadata loads (default upright 9:16 in CSS).
              ...(ratio ? { '--qual-ratio': ratio } : {}),
            }}
          >
            <video
              ref={videoRef}
              className="qualified-video-player"
              src={videoSrc}
              poster={qualifiedScreenContent.poster || undefined}
              controls={videoStarted}
              playsInline
              preload={inView ? preload : 'none'}
              /* Covers the case where the browser starts it some other way —
                 a native control, or a resumed session — so the button never
                 sits on top of a playing video. */
              onPlay={() => setVideoStarted(true)}
              /* Rewind so a replay opens on the first frame rather than the
                 last one, and bring the branded trigger back over it. */
              onEnded={() => {
                if (videoRef.current) videoRef.current.currentTime = 0
                setVideoStarted(false)
              }}
              onError={() => setVideoStarted(false)}
              onLoadedMetadata={(e) => {
                const { videoWidth: w, videoHeight: h } = e.target
                if (w > 0 && h > 0) setRatio((w / h).toFixed(4))
              }}
            >
              Your browser does not support embedded video.
            </video>
            {!videoStarted && (
              <button
                type="button"
                className="founder-video-trigger qualified-video-trigger"
                aria-label={videoLabel}
                onClick={startVideo}
              >
                <span className="founder-video-play" aria-hidden="true">▶</span>
                <span className="founder-video-label display">{videoLabel}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="qualified-video qualified-video--placeholder" role="img" aria-label="Video from Nico coming soon">
            <span className="qualified-video-mark" aria-hidden="true">▶</span>
            <span>Video from Nico to be added</span>
          </div>
        )}

        {message && <p className="qualified-message">{message}</p>}
        {note && <p className="qualified-note">{note}</p>}

        {url && (
          <a
            className="btn btn-primary qualified-instagram"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('instagram_handoff_clicked', { handle })}
          >
            {qualifiedScreenContent.button || `Message ${handle}`}
          </a>
        )}
      </div>
    </div>
  )
}
