import { useRef } from 'react'
import { HeroFilm } from '../showpiece/HeroFilm.jsx'
import { heroContent } from '../../config/sectionContent.js'
import { useScrollToForm } from '../../hooks/useScrollToForm.js'

export function Hero() {
  const heroRef = useRef(null)
  const scrollToForm = useScrollToForm('application')

  return (
    <section id="top" className="hero" ref={heroRef}>
      <div className="hero-sticky">
        <div className="hero-canvas">
          <HeroFilm scrollEl={heroRef} />
        </div>

        <div className="hero-vignette" aria-hidden="true" />

        <div className="hero-content shell">
          <div className="hero-eyebrow eyebrow">
            <span className="brass-rule" /> {heroContent.eyebrow} <span className="brass-rule" />
          </div>

          <h1 className="hero-headline display tooled">
            {heroContent.headline}
          </h1>

          <div className="hero-actions">
            <button
              className="btn btn-primary"
              onClick={() => scrollToForm('hero')}
              type="button"
            >
              {heroContent.cta}
            </button>
            <p className="restraint hero-restraint">{heroContent.restraint}</p>
          </div>
        </div>

        <div className="hero-fold-cue" aria-hidden="true">
          <span className="restraint">Scroll</span>
          <span className="hero-fold-line" />
        </div>
      </div>
    </section>
  )
}
