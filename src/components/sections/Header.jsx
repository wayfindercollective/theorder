import { useEffect, useState } from 'react'
import { brandContent, footerContent } from '../../config/sectionContent.js'

const LOGO_SRC = brandContent?.logo || '/images/logo-mark.png'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    // The top bar stays hidden over the hero (the hero shows its own logo) and
    // slides in only once the hero has scrolled past, then stays for the rest.
    // The trigger height is cached and only re-measured on resize — reading
    // hero.offsetHeight inside the scroll handler would force a synchronous
    // reflow on every single scroll event for the whole page.
    let trigger = 0
    const measure = () => {
      const hero = document.getElementById('top')
      trigger = (hero ? hero.offsetHeight : window.innerHeight) - 90
    }
    const on = () => setScrolled(window.scrollY > trigger)
    const onResize = () => {
      measure()
      on()
    }
    measure()
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <header className={'site-header' + (scrolled ? ' is-scrolled' : '')}>
      <div className="shell site-header-inner">
        <a href="#top" className="header-mark" aria-label={brandContent?.wordmark || 'The Order'}>
          <img className="logo-mark header-logo" src={LOGO_SRC} alt="" />
          <span className="display header-wordmark">{brandContent?.wordmark || 'The Order'}</span>
        </a>
        {footerContent?.instagram && (
          <a
            className="header-instagram"
            href={footerContent.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="The Order on Instagram"
          >
            <span className="display header-instagram-label">
              {footerContent.instagram.replace(/\/+$/, '').split('/').pop()}
            </span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" />
              <circle cx="12" cy="12" r="4.4" />
              <circle cx="17.4" cy="6.6" r="0.4" fill="currentColor" stroke="none" />
            </svg>
          </a>
        )}
      </div>
    </header>
  )
}
