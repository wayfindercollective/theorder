import { useEffect, useState } from 'react'
import {
  brandContent,
  footerContent,
  qualifiedScreenContent,
} from '../../config/sectionContent.js'
import { track } from '../../lib/analytics.js'

function instagramDetails() {
  const url = qualifiedScreenContent.instagramUrl || footerContent.instagram || ''
  const fallbackHandle = url ? url.replace(/\/+$/, '').split('/').pop() : 'theorder.global'
  const rawHandle = qualifiedScreenContent.instagramHandle || fallbackHandle
  return { url, handle: rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}` }
}

/**
 * The successful result of the local questionnaire filter. There is
 * deliberately no booking link here. The applicant must first contact Nico on
 * Instagram; Nico sends the private /booking URL himself if they should move
 * forward.
 */
export function QualifiedScreen() {
  const [stage, setStage] = useState(0)
  const { url, handle } = instagramDetails()

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
        {qualifiedScreenContent.heading || 'Your Application Has Been Submitted'}
      </h2>
      <p className={'final-sub final-sub--gilded' + (stage >= 2 ? ' in' : '')}>
        {qualifiedScreenContent.sub || 'You have passed the first stage.'}
      </p>

      <div className={'qualified-next' + (stage >= 3 ? ' in' : '')}>
        {qualifiedScreenContent.video ? (
          <video
            className="qualified-video"
            src={qualifiedScreenContent.video}
            poster={qualifiedScreenContent.poster || undefined}
            controls
            playsInline
            preload="metadata"
          >
            Your browser does not support embedded video.
          </video>
        ) : (
          <div className="qualified-video qualified-video--placeholder" role="img" aria-label="Video from Nico coming soon">
            <span className="qualified-video-mark" aria-hidden="true">▶</span>
            <span>Video from Nico to be added</span>
          </div>
        )}

        <p className="qualified-message">
          {qualifiedScreenContent.message ||
            'Watch Nico\'s message, then send him a video DM introducing yourself and explaining why you are ready to go all in.'}
        </p>
        <p className="qualified-note">
          {qualifiedScreenContent.note ||
            'If you are the right fit, Nico will reply with the private link to book your enquiry interview.'}
        </p>

        {url && (
          <a
            className="btn btn-primary qualified-instagram"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('instagram_handoff_clicked', { handle })}
          >
            Message {handle} on Instagram
          </a>
        )}
      </div>
    </div>
  )
}
