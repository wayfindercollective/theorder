import { useEffect, useState } from 'react'

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 80)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <header className={'site-header' + (scrolled ? ' is-scrolled' : '')}>
      <div className="shell site-header-inner">
        <a href="#top" className="header-mark" aria-label="The Order">
          <img className="logo-mark header-logo" src="/images/logo-mark.png" alt="" />
          <span className="display header-wordmark">The Order</span>
        </a>
      </div>
    </header>
  )
}
