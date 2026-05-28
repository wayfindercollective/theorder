/**
 * HeroFilm — the cinematic asset behind the headline.
 *
 * Reads heroFilm config and renders one of three modes:
 *
 *   1. video — scroll-scrubbed. One short MP4. As user scrolls through the
 *      hero, currentTime maps to scroll progress. The man sits down and pulls
 *      the chair in. Gold standard, best with a Sora/Veo3/Runway clip.
 *
 *   2. frames — 4–8 stills crossfaded as scroll progresses. Works with
 *      Midjourney / Sora-image / DALL-E outputs. Less smooth than video but
 *      flexible — easy to iterate one frame at a time.
 *
 *   3. neither — dark hero, headline only. Current state.
 *
 * Scroll progress is read from a ref so we don't re-render on every scroll.
 */

import { useEffect, useRef } from 'react'
import { heroFilm } from '../../config/sectionContent.js'

export function HeroFilm({ scrollEl }) {
  const progressRef = useRef(0)

  useEffect(() => {
    function update() {
      const el = scrollEl?.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const h = rect.height
      const scrolled = -rect.top
      progressRef.current = Math.min(Math.max(scrolled / h, 0), 1)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [scrollEl])

  if (heroFilm?.video?.src) {
    return <HeroVideo progressRef={progressRef} />
  }
  if (heroFilm?.frames?.length > 0) {
    return <HeroFrames progressRef={progressRef} />
  }
  return <HeroPlaceholder />
}

function HeroVideo({ progressRef }) {
  const ref = useRef(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    let rafId
    function tick() {
      if (v.duration && !isNaN(v.duration)) {
        const target = progressRef.current * v.duration
        // smooth seek — lerp toward target
        const cur = v.currentTime
        v.currentTime = cur + (target - cur) * 0.18
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [progressRef])

  return (
    <div className="hero-film hero-film-video">
      <video
        ref={ref}
        src={heroFilm.video.src}
        poster={heroFilm.video.poster}
        muted
        playsInline
        preload="auto"
        tabIndex={-1}
      />
    </div>
  )
}

function HeroFrames({ progressRef }) {
  const refs = useRef([])

  useEffect(() => {
    let rafId
    const n = heroFilm.frames.length
    if (n === 0) return
    function tick() {
      const p = progressRef.current * (n - 1)
      const i = Math.floor(p)
      const t = p - i
      for (let k = 0; k < n; k++) {
        const node = refs.current[k]
        if (!node) continue
        let op = 0
        if (k === i) op = 1 - t
        else if (k === i + 1) op = t
        else if (k < i && i === n - 1 && k === n - 2) op = 0 // edge
        node.style.opacity = op.toFixed(3)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [progressRef])

  return (
    <div className="hero-film hero-film-frames">
      {heroFilm.frames.map((f, i) => (
        <img
          key={f.src}
          ref={(el) => (refs.current[i] = el)}
          src={f.src}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={i === 0 ? 'high' : 'auto'}
          style={{ opacity: i === 0 ? 1 : 0 }}
        />
      ))}
    </div>
  )
}

function HeroPlaceholder() {
  return (
    <div className="hero-film hero-film-placeholder" aria-hidden="true">
      <div className="hero-placeholder-mark">
        <span className="restraint">[ Hero film — to be added ]</span>
      </div>
    </div>
  )
}
