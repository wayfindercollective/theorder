import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from '../../hooks/useInView.js'
import { evidenceContent } from '../../config/sectionContent.js'
import { SectionPainting } from '../ui/SectionPainting.jsx'
import { renderRich, richText } from '../../lib/richtext.js'

/**
 * A video testimonial. It plays muted on a loop while on screen so it visibly
 * reads as a clip (not a still). Clicking the centre play button restarts it
 * from the top with sound and hands over to the native controls.
 *
 * LAZY BY DESIGN: preload="none" + a poster frame means a tile costs one small
 * JPEG until it actually approaches the viewport — the silent preview only
 * starts (and only downloads the clip) when the tile is near-visible, and
 * pauses again off-screen. This section used to eager-load every clip on page
 * load, which was most of the site's slow first load.
 */
function EvidenceVideo({ src, poster, title, onEngagedChange, ariaHidden }) {
  const videoRef = useRef(null)
  const engagedRef = useRef(false)
  const [activated, setActivated] = useState(false)
  // whether this clip is actively playing with sound right now — drives whether
  // the play button shows (every card shows it except the one playing)
  const [playing, setPlaying] = useState(false)
  const [nearView, setNearView] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v || typeof IntersectionObserver === 'undefined') {
      setNearView(true) // ancient browser: fall back to eager behaviour
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => setNearView(entry.isIntersecting),
      { rootMargin: '200px' }
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])

  // Drive the muted preview from visibility. Once the visitor activates sound
  // the native controls own playback — stop steering it. (Set `muted` on the
  // element directly: some browsers ignore the attribute set via React.)
  useEffect(() => {
    const v = videoRef.current
    if (!v || activated) return
    if (nearView) {
      v.muted = true
      const p = v.play()
      if (p && p.catch) p.catch(() => {})
    } else {
      v.pause()
    }
  }, [nearView, activated])

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
    const update = () => {
      const isPlaying = !v.paused && !v.ended
      setPlaying(isPlaying)
      setEngaged(isPlaying)
    }
    // 'error'/'emptied' too: a mobile decode failure must never leave the
    // marquee permanently held (engaged stuck > 0 = rail frozen forever).
    const EVENTS = ['play', 'playing', 'pause', 'ended', 'error', 'emptied']
    EVENTS.forEach((e) => v.addEventListener(e, update))
    update()
    return () => {
      EVENTS.forEach((e) => v.removeEventListener(e, update))
      setPlaying(false)
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
        poster={poster || undefined}
        muted
        loop
        playsInline
        preload="none"
        controls={activated}
      />
      {!playing && (
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
  //
  // Reduced motion (which iOS Low Power Mode reports!) used to freeze the rail
  // entirely — that was Nico's "sometimes they don't scroll" bug. The drift is
  // the section's whole point, so under reduced motion it slows to a crawl
  // instead of stopping; the media query is watched live because Low Power
  // Mode toggles mid-session.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      const SPEED = mq.matches ? 16 : 45 // px per second
      const n = cards.length
      const tiles = rail.children
      if (tiles.length <= n) return
      const period = tiles[n].offsetLeft - tiles[0].offsetLeft
      if (period <= 0) return
      rail.style.setProperty('--evidence-period', period + 'px')
      rail.style.animationDuration = period / SPEED + 's'
    }
    apply()
    // ResizeObserver over the one-shot measure: tile layout can settle late
    // (fonts, posters) and the period must follow.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null
    if (ro) ro.observe(rail)
    window.addEventListener('resize', apply)
    mq.addEventListener?.('change', apply)
    return () => {
      if (ro) ro.disconnect()
      window.removeEventListener('resize', apply)
      mq.removeEventListener?.('change', apply)
    }
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
  const resume = useCallback(() => {
    hoveringRef.current = false
    recompute()
  }, [recompute])
  // touch: let the swipe/tap settle before the drift takes back over. One
  // pending timer only — a page-scroll finger brushing the rail used to stack
  // stale timers and could leave the rail paused.
  const resumeTimer = useRef(0)
  const resumeSoon = useCallback(() => {
    window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(resume, 1800)
  }, [resume])
  useEffect(() => () => window.clearTimeout(resumeTimer.current), [])

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
                  poster={c.poster}
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
