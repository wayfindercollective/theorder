import { useRef } from 'react'
import { HeroFilm } from '../showpiece/HeroFilm.jsx'
import { heroContent, brandContent } from '../../config/sectionContent.js'
import { useScrollToForm } from '../../hooks/useScrollToForm.js'
import { DESIGN_V2 } from '../../config/design.js'

export function Hero() {
  const heroRef = useRef(null)
  const scrollToForm = useScrollToForm('application')

  const actions = (
    <div className="hero-actions">
      <button
        className="btn btn-primary"
        onClick={() => scrollToForm('hero')}
        type="button"
      >
        {heroContent.cta}
      </button>
      {heroContent.restraint && (
        <p className="restraint hero-restraint">{heroContent.restraint}</p>
      )}
    </div>
  )

  return (
    <section id="top" className={'hero' + (DESIGN_V2 ? ' hero--split' : '')} ref={heroRef}>
      <div className="hero-sticky">
        <div className="hero-canvas">
          <HeroFilm scrollEl={heroRef} />
        </div>

        <div className="hero-vignette" aria-hidden="true" />

        <div className="hero-content shell">
          <img className="logo-mark hero-logo-mark" src={brandContent?.logo || '/images/logo-mark.png'} alt="The Order" />

          {heroContent.eyebrow && (
            <div className="hero-eyebrow eyebrow">
              <span className="brass-rule" /> {heroContent.eyebrow} <span className="brass-rule" />
            </div>
          )}

          <h1 className="hero-headline display tooled">
            {heroContent.headline}
          </h1>

          {heroContent.verseLine && (
            <p className="hero-verse display">{heroContent.verseLine}</p>
          )}

          {/* v2: CTA flows with the logo/headline/verse as one aligned column.
              v1: CTA stays anchored low in the foot (under the candle). */}
          {DESIGN_V2 && actions}
        </div>

        <div className="hero-foot">
          {!DESIGN_V2 && actions}

          <div className="hero-fold-cue" aria-hidden="true">
            <span className="restraint hero-scroll">Scroll</span>
            <span className="hero-fold-line" />
          </div>
        </div>
      </div>
    </section>
  )
}
