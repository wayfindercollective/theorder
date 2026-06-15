import { useEffect, useRef, useState } from 'react'
import { useInView } from '../../hooks/useInView.js'
import { evidenceContent } from '../../config/sectionContent.js'
import { SectionPainting } from '../ui/SectionPainting.jsx'

/**
 * A video testimonial. It autoplays muted on a loop so it visibly reads as a
 * clip (not a still). Clicking the centre play button restarts it from the top
 * with sound and hands over to the native controls.
 */
function EvidenceVideo({ src, title }) {
  const videoRef = useRef(null)
  const [activated, setActivated] = useState(false)

  // Ensure the muted preview actually starts (some browsers ignore the
  // `muted` attribute set via React on first render).
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
  }, [])

  const activate = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = false
    v.loop = false
    v.currentTime = 0
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
    setActivated(true)
  }

  return (
    <article className="evidence-card evidence-card-video">
      <video
        ref={videoRef}
        className="evidence-video"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={activated}
      />
      {!activated && (
        <button
          type="button"
          className="evidence-video-play"
          onClick={activate}
          aria-label="Play with sound"
        >
          <span className="evidence-video-play-ring">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
      {title?.trim() && <p className="evidence-video-title">{title}</p>}
    </article>
  )
}

export function EvidenceSection() {
  const { ref, inView } = useInView()
  const cards = (evidenceContent.cards || []).filter(
    (c) => c.video || (c.quote && c.quote.trim()),
  )
  return (
    <section className="section section-evidence" ref={ref}>
      <SectionPainting image={evidenceContent.image} />
      <div className="shell">
        <div className={'reveal evidence-head ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {evidenceContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading">{evidenceContent.heading}</h2>
          {evidenceContent.intro?.trim() && (
            <p className="restraint evidence-intro">{evidenceContent.intro}</p>
          )}
          <div className="section-divider" style={{ margin: '2rem auto 3.5rem' }} />
        </div>

        <div className={'evidence-grid stagger ' + (inView ? 'in-view' : '')}>
          {cards.map((c, i) =>
            c.video ? (
              <EvidenceVideo key={i} src={c.video} title={c.title} />
            ) : (
              <article key={i} className="evidence-card card card-stitched">
                <span className="evidence-mark display engraved">"</span>
                <p className="evidence-quote">{c.quote}</p>
                <p className="evidence-attr restraint">{c.attribution}</p>
              </article>
            ),
          )}
        </div>
      </div>
    </section>
  )
}
