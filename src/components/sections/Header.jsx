import { useEffect, useState } from 'react'
import { Sigil } from '../ui/Sigil.jsx'

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
          <Sigil size={36} variant="full" />
          <span className="display header-wordmark">The Order</span>
        </a>
      </div>
    </header>
  )
}
