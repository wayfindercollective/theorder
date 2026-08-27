import { useEffect, useRef, useState } from 'react'
import { bgImage } from '../../lib/img.js'

/**
 * Loads decorative section art before it reaches the viewport without making
 * every painting compete with the hero during the initial page load.
 */
export function DeferredBackground({
  image,
  className,
  eager = false,
  ariaHidden = true,
  style,
  children,
}) {
  const ref = useRef(null)
  const [shouldLoad, setShouldLoad] = useState(eager)

  useEffect(() => {
    if (eager || shouldLoad || !image) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return
    }

    // Two screens of lead time keeps the next painting ready during normal
    // scrolling while leaving the rest of the long page off the network.
    const lead = Math.max(window.innerHeight * 2, 1200)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setShouldLoad(true)
        observer.disconnect()
      },
      { rootMargin: `${Math.round(lead)}px 0px`, threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [eager, image, shouldLoad])

  const backgroundStyle = shouldLoad && image
    ? { backgroundImage: bgImage(image) }
    : undefined

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...style, ...backgroundStyle }}
      aria-hidden={ariaHidden || undefined}
    >
      {children}
    </div>
  )
}
