import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from '../../hooks/useInView.js'
import { evidenceContent } from '../../config/sectionContent.js'
import { SectionPainting } from '../ui/SectionPainting.jsx'
import { renderRich, richText } from '../../lib/richtext.js'

/**
 * A video testimonial. It autoplays muted on a loop so it visibly reads as a
 * clip (not a still). Clicking the centre play button restarts it from the top
 * with sound and hands over to the native controls.
 */
function EvidenceVideo({ src, title, onEngagedChange, ariaHidden }) {
  const videoRef = useRef(null)
  const engagedRef = useRef(false)
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

  // Once activated (playing with sound), report engagement so the marquee holds
  // still — but only while it's actually playing. Pausing or finishing the clip
  // releases the hold so the carousel carries on and the others stay reachable.
  useEffect(() => {
    if (!activated) return
    const v = videoRef.current
    if (!v) return
    const setEngaged = (val) => {
      if (val === engagedRef.current) return
      engagedRef.current = val
      onEngagedChange && onEngagedChange(val ? 1 : -1)
    }
    const update = () => setEngaged(!v.paused && !v.ended)
    v.addEventListener('play', update)
    v.addEventListener('playing', update)
    v.addEventListener('pause', update)
    v.addEventListener('ended', update)
    update()
    return () => {
      v.removeEventListener('play', update)
      v.removeEventListener('playing', update)
      v.removeEventListener('pause', update)
      v.removeEventListener('ended', update)
      setEngaged(false)
    }
  }, [activated, onEngagedChange])

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
    <article className="evidence-card evidence-card-video" aria-hidden={ariaHidden || undefined}>
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
          tabIndex={ariaHidden ? -1 : undefined}
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
  const railRef = useRef(null)
  const [paused, setPaused] = useState(false)
  // the rail holds still while the visitor hovers/touches it, or while a clip is
  // actively playing with sound; otherwise it drifts
  const hoveringRef = useRef(false)
  const engagedCountRef = useRef(0)
  const cards = (evidenceContent.cards || []).filter(
    (c) => c.video || (c.quote && c.quote.trim()),
  )

  // Seamless continuous marquee: the tiles are rendered twice (see `loop` below)
  // and the rail is translated by exactly one set width, looping forever. The
  // period is measured from the duplicate's offset (robust to trailing margins)
  // and the duration is derived from it so the speed is constant at any width.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const SPEED = 45 // px per second — a calm, continuous drift
    const apply = () => {
      const n = cards.length
      const tiles = rail.children
      if (tiles.length <= n) return
      const period = tiles[n].offsetLeft - tiles[0].offsetLeft
      if (period <= 0) return
      rail.style.setProperty('--evidence-period', period + 'px')
      rail.style.animationDuration = period / SPEED + 's'
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [cards.length])

  const recompute = useCallback(() => {
    setPaused(hoveringRef.current || engagedCountRef.current > 0)
  }, [])
  const handleEngaged = useCallback(
    (delta) => {
      engagedCountRef.current = Math.max(0, engagedCountRef.current + delta)
      recompute()
    },
    [recompute],
  )
  const pause = () => {
    hoveringRef.current = true
    recompute()
  }
  const resume = () => {
    hoveringRef.current = false
    recompute()
  }
  // touch: let the swipe/tap settle before the drift takes back over
  const resumeSoon = () => window.setTimeout(resume, 1800)

  // duplicate the set so the loop wraps with no visible gap
  const loop = cards.concat(cards)

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
          className="evidence-grid evidence-carousel"
          onMouseEnter={pause}
          onMouseLeave={resume}
          onTouchStart={pause}
          onTouchEnd={resumeSoon}
        >
          <div ref={railRef} className={'evidence-rail' + (paused ? ' is-paused' : '')}>
            {loop.map((c, i) => {
              const dup = i >= cards.length
              return c.video ? (
                <EvidenceVideo
                  key={i}
                  src={c.video}
                  title={c.title}
                  ariaHidden={dup}
                  onEngagedChange={handleEngaged}
                />
              ) : (
                <article key={i} className="evidence-card card card-stitched" aria-hidden={dup || undefined}>
                  <span className="evidence-mark display engraved">"</span>
                  <p className="evidence-quote">{c.quote}</p>
                  <p className="evidence-attr restraint">{c.attribution}</p>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
