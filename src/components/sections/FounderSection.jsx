import { useState } from 'react'
import { useInView } from '../../hooks/useInView.js'
import { founderContent } from '../../config/sectionContent.js'
import { renderRich } from '../../lib/richtext.js'
import { CtaButton } from '../ui/CtaButton.jsx'
import { bgImage } from '../../lib/img.js'

export function FounderSection() {
  const { ref, inView } = useInView()
  const [videoPlaying, setVideoPlaying] = useState(false)
  const videoLabel = founderContent.videoLabel || "Watch Nico's Story"
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

        <div className={'founder-grid stagger ' + (inView ? 'in-view' : '')}>
          <div
            className={
              'founder-portrait card nailed ' +
              (founderContent.portrait ? 'has-portrait' : 'card-stitched') +
              (founderContent.video ? ' has-video' : '')
            }
            style={founderContent.portrait ? { backgroundImage: bgImage(founderContent.portrait) } : undefined}
          >
            <span className="nail-tl" />
            <span className="nail-br" />
            {founderContent.video && videoPlaying ? (
              <video
                className="founder-video"
                src={founderContent.video}
                poster={founderContent.portrait || undefined}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onEnded={() => setVideoPlaying(false)}
                onError={() => setVideoPlaying(false)}
              >
                Your browser does not support embedded video.
              </video>
            ) : founderContent.video ? (
              <button
                type="button"
                className="founder-video-trigger"
                onClick={() => setVideoPlaying(true)}
                aria-label={videoLabel}
              >
                <span className="founder-video-play" aria-hidden="true">▶</span>
                <span className="founder-video-label display">{videoLabel}</span>
              </button>
            ) : null}
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
          </div>

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
