import { useCallback } from 'react'
import { recordCTA } from '../lib/utm.js'

const OFFSET = 40

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function useScrollToForm(targetId = 'application') {
  return useCallback(
    (ctaLocation) => {
      if (ctaLocation) recordCTA(ctaLocation)
      const el = document.getElementById(targetId)
      if (!el) return
      const startY = window.scrollY
      const rect = el.getBoundingClientRect()
      const endY = startY + rect.top - OFFSET
      const dur = 900
      const t0 = performance.now()
      function step(now) {
        const t = Math.min((now - t0) / dur, 1)
        const eased = easeOutCubic(t)
        window.scrollTo(0, startY + (endY - startY) * eased)
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    },
    [targetId]
  )
}
