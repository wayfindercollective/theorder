import { useRef, useState } from 'react'
import { useInView } from '../../hooks/useInView.js'
import { founderContent } from '../../config/sectionContent.js'
import { renderRich } from '../../lib/richtext.js'
import { CtaButton } from '../ui/CtaButton.jsx'
import { bgImage } from '../../lib/img.js'
import { maxPreload, pickVideoSource } from '../../lib/video.js'
import { HERO_VIDEO } from '../../config/design.js'

export function FounderSection() {
  const { ref, inView } = useInView()
  const [videoStarted, setVideoStarted] = useState(false)
  const videoRef = useRef(null)
  const [videoSrc] = useState(() => pickVideoSource(founderContent.video, founderContent.videoMobile))
  const [preload] = useState(maxPreload)
  const videoLabel = founderContent.videoLabel || "Watch Nico's Story"

  const startVideo = () => {
    const el = videoRef.current
    if (!el) return
    setVideoStarted(true)
    // Rejects if the visitor navigates away or interrupts the start. The native
    // controls are showing by then, so it just sits paused and one tap resumes.
    el.play()?.catch(() => {})
  }
  return (
    <section className="section section-founder" ref={ref}>
      {founderContent.image && (
        <div
          className="section-bg-image"
          style={{ backgroundImage: bgImage(founderContent.image) }}
          aria-hidden="true"
        />
      )}
      <div className="shell">
        <div className={'reveal founder-head ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {founderContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading" dangerouslySetInnerHTML={renderRich(founderContent.heading)} />
          <div className="section-divider" style={{ margin: '2rem auto 3.5rem' }} />
        </div>

        {/* With the video promoted to the hero (HERO_VIDEO), the portrait
            card is redundant mid-page — the text takes the full section. */}
        <div className={'founder-grid ' + (HERO_VIDEO ? 'founder-grid--solo ' : '') + 'stagger ' + (inView ? 'in-view' : '')}>
          {!HERO_VIDEO && <div
            className={
              'founder-portrait card nailed ' +
              (founderContent.portrait ? 'has-portrait' : 'card-stitched') +
              (founderContent.video ? ' has-video' : '')
            }
            style={founderContent.portrait ? { backgroundImage: bgImage(founderContent.portrait) } : undefined}
          >
            <span className="nail-tl" />
            <span className="nail-br" />
            {founderContent.video && (
              <video
                ref={videoRef}
                className="founder-video"
                src={videoSrc}
                poster={founderContent.portrait || undefined}
                controls={videoStarted}
                playsInline
                /* Unlike the qualified screen, this player is one section of a
                   long page most visitors scroll past — buffering it on load
                   would spend megabytes on a clip they never open. Hold at
                   `none` until the section comes into view (`once: true`, so it
                   latches), then buffer ahead of the press. */
                preload={inView ? preload : 'none'}
                onPlay={() => setVideoStarted(true)}
                onEnded={() => {
                  if (videoRef.current) videoRef.current.currentTime = 0
                  setVideoStarted(false)
                }}
                onError={() => setVideoStarted(false)}
              >
                Your browser does not support embedded video.
              </video>
            )}
            {founderContent.video && !videoStarted && (
              <button
                type="button"
                className="founder-video-trigger"
                onClick={startVideo}
                aria-label={videoLabel}
              >
                <span className="founder-video-play" aria-hidden="true">▶</span>
                <span className="founder-video-label display">{videoLabel}</span>
              </button>
            )}
            {!founderContent.portrait && (
              <div className="founder-portrait-inner">
                <span className="restraint founder-portrait-mark">
                  {founderContent.placeholderMark}
                </span>
              </div>
            )}
            {founderContent.templated && !founderContent.portrait && (
              <span className="template-flag">{founderContent.templatedLabel || 'TEMPLATED'}</span>
            )}
          </div>}

          <div className="founder-text">
            {founderContent.paragraphs.map((p, i) => (
              <p key={i} className="founder-p" dangerouslySetInnerHTML={renderRich(p)} />
            ))}
            <p className="founder-signature display">{founderContent.signature}</p>
          </div>
        </div>

        <CtaButton location="afterFounder" className={'reveal ' + (inView ? 'in-view' : '')} />
      </div>
    </section>
  )
}
