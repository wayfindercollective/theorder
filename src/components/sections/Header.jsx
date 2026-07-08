import { useEffect, useState } from 'react'
import { brandContent } from '../../config/sectionContent.js'

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
      </div>
    </header>
  )
}
