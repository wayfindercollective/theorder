/**
 * The fixed first slide of every deck — the hero, mirroring the site: hero
 * painting + logo + headline + verse. No CTA, no scroll cue. Not editable. The
 * background reads from SITE_IMAGES[0].src (= heroFilm.frames[0].src) so a CMS
 * hero swap flows through.
 */
import { heroContent, brandContent } from '../config/sectionContent.js'
import { SITE_IMAGES } from './siteImages.js'
import { bgImage } from '../lib/img.js'

export function PresHero() {
  const heroImg = SITE_IMAGES[0].src
  const logo = brandContent?.logo || '/images/logo-mark.png'
  return (
    <div className="pres-stage pres-hero">
      {/* bgImage() routes to the lean WebP derivative when one exists */}
      <div className="pres-hero-bg" style={{ backgroundImage: bgImage(heroImg) }} aria-hidden="true" />
      <div className="pres-hero-veil" aria-hidden="true" />
      <div className="pres-hero-content">
        <img className="logo-mark pres-hero-logo" src={logo} alt={brandContent?.wordmark || 'The Order'} />
        {heroContent?.eyebrow && (
          <div className="hero-eyebrow eyebrow">
            <span className="brass-rule" /> {heroContent.eyebrow} <span className="brass-rule" />
          </div>
        )}
        <h1 className="hero-headline display tooled">{heroContent?.headline || 'THE ORDER'}</h1>
        {heroContent?.verseLine && <p className="hero-verse display">{heroContent.verseLine}</p>}
      </div>
    </div>
  )
}
