import { useEffect } from 'react'

export function useLenis() {
  useEffect(() => {
    let rafId
    let lenis
    let cancelled = false
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    import('lenis')
      .then((mod) => {
        if (cancelled) return
        const Lenis = mod.default || mod.Lenis || mod
        lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
        })
        function raf(time) {
          if (cancelled) return
          lenis.raf(time)
          rafId = requestAnimationFrame(raf)
        }
        rafId = requestAnimationFrame(raf)
      })
      .catch(() => { /* lenis missing — graceful no-op */ })

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      if (lenis && lenis.destroy) lenis.destroy()
    }
  }, [])
}
