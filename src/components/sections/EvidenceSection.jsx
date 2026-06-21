import { useEffect, useRef, useState } from 'react'
import { useInView } from '../../hooks/useInView.js'
import { evidenceContent } from '../../config/sectionContent.js'
import { SectionPainting } from '../ui/SectionPainting.jsx'
import { renderRich, richText } from '../../lib/richtext.js'

/**
 * A video testimonial. It autoplays muted on a loop so it visibly reads as a
 * clip (not a still). Clicking the centre play button restarts it from the top
 * with sound and hands over to the native controls.
 */
function EvidenceVideo({ src, title, onActivate }) {
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
    onActivate && onActivate()
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
  const trackRef = useRef(null)
  // pause the drift while the visitor is interacting (hover / touch) …
  const pausedRef = useRef(false)
  // … and once any clip is playing with sound, so it never scrolls away mid-watch
  const engagedRef = useRef(false)
  const cards = (evidenceContent.cards || []).filter(
    (c) => c.video || (c.quote && c.quote.trim()),
  )

  // Gentle continuous auto-scroll (ping-pongs between the ends). Does nothing
  // when the tiles all fit (no overflow) or when reduced-motion is requested.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const reduce =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    let raf
    let dir = 1
    const speed = 0.35 // px per frame ≈ a slow, calm drift
    const tick = () => {
      const max = track.scrollWidth - track.clientWidth
      if (max > 1 && !pausedRef.current && !engagedRef.current) {
        let next = track.scrollLeft + dir * speed
        if (next >= max) {
          next = max
          dir = -1
        } else if (next <= 0) {
          next = 0
          dir = 1
        }
        track.scrollLeft = next
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cards.length])

  const pause = () => {
    pausedRef.current = true
  }
  const resume = () => {
    pausedRef.current = false
  }
  // touch: let the swipe momentum settle before the drift takes back over
  const resumeSoon = () => {
    window.setTimeout(() => {
      pausedRef.current = false
    }, 1800)
  }

  return (
    <section className="section section-evidence" ref={ref}>
      <SectionPainting image={evidenceContent.image} />
      <div className="shell">
        <div className={'reveal evidence-head ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {evidenceContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading" dangerouslySetInnerHTML={renderRich(evidenceContent.heading)} />
          {richText(evidenceContent.intro) && (
            <p className="restraint evidence-intro" dangerouslySetInnerHTML={renderRich(evidenceContent.intro)} />
          )}
          <div className="section-divider" style={{ margin: '2rem auto 3.5rem' }} />
        </div>

        <div
          ref={trackRef}
          className={'evidence-grid evidence-carousel stagger ' + (inView ? 'in-view' : '')}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onTouchStart={pause}
          onTouchEnd={resumeSoon}
        >
          {cards.map((c, i) =>
            c.video ? (
              <EvidenceVideo
                key={i}
                src={c.video}
                title={c.title}
                onActivate={() => {
                  engagedRef.current = true
                }}
              />
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
