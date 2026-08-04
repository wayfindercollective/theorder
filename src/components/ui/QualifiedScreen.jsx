import { useEffect, useState } from 'react'
import {
  brandContent,
  footerContent,
  qualifiedScreenContent,
} from '../../config/sectionContent.js'
import { track } from '../../lib/analytics.js'
import { bgImage } from '../../lib/img.js'

function instagramDetails() {
  const url = qualifiedScreenContent.instagramUrl || footerContent.instagram || ''
  const fallbackHandle = url ? url.replace(/\/+$/, '').split('/').pop() : 'theorder.global'
  const rawHandle = qualifiedScreenContent.instagramHandle || fallbackHandle
  return { url, handle: rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}` }
}

/**
 * The successful result of the local questionnaire filter. There is
 * deliberately no booking link here. The applicant must first contact Nico on
 * Instagram; Nico sends the private /application URL himself if they should move
 * forward.
 */
export function QualifiedScreen() {
  const [stage, setStage] = useState(0)
  const [videoPlaying, setVideoPlaying] = useState(false)
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

  return (
    <div className="final-screen qualified-screen">
      <div className={'final-mark' + (stage >= 1 ? ' in' : '')}>
        <img
          className="logo-mark final-logo"
          src={brandContent?.logo || '/images/logo-mark.png'}
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
            style={qualifiedScreenContent.poster
              ? { backgroundImage: bgImage(qualifiedScreenContent.poster) }
              : undefined}
          >
            {videoPlaying ? (
              <video
                className="qualified-video-player"
                src={qualifiedScreenContent.video}
                poster={qualifiedScreenContent.poster || undefined}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onEnded={() => setVideoPlaying(false)}
                onError={() => setVideoPlaying(false)}
              >
                Your browser does not support embedded video.
              </video>
            ) : (
              <button
                type="button"
                className="founder-video-trigger qualified-video-trigger"
                aria-label={videoLabel}
                onClick={() => {
                  setVideoPlaying(true)
                  track('qualified_video_started')
                }}
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
