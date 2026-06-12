import { useEffect, useState } from 'react'
import { brandContent } from '../../config/sectionContent.js'

const LOGO_SRC = brandContent?.logo || '/images/logo-mark.png'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    // The top bar stays hidden over the hero (the hero shows its own logo) and
    // slides in only once the hero has scrolled past, then stays for the rest.
    const on = () => {
      const hero = document.getElementById('top')
      const trigger = (hero ? hero.offsetHeight : window.innerHeight) - 90
      setScrolled(window.scrollY > trigger)
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on, { passive: true })
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])

  return (
    <header className={'site-header' + (scrolled ? ' is-scrolled' : '')}>
      <div className="shell site-header-inner">
        <a href="#top" className="header-mark" aria-label={brandContent?.wordmark || 'The Order'}>
          <img className="logo-mark header-logo" src={LOGO_SRC} alt="" />
          <span className="display header-wordmark">{brandContent?.wordmark || 'The Order'}</span>
        </a>
      </div>
    </header>
  )
}
