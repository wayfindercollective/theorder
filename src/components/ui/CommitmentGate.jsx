import { useEffect, useState } from 'react'
import { commitmentGateContent } from '../../config/sectionContent.js'
import { track } from '../../lib/analytics.js'

/**
 * The standalone acceptance gate shown at /application. Nothing is collected
 * here: the applicant reads the call terms and explicitly continues to the
 * calendar at /application/booking.
 */
export function CommitmentGate() {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    track('commitment_gate_viewed')
    const timers = [
      setTimeout(() => setStage(1), 250),
      setTimeout(() => setStage(2), 850),
      setTimeout(() => setStage(3), 1450),
      setTimeout(() => setStage(4), 2050),
      setTimeout(() => setStage(5), 2550),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="commitment-gate">
      <p className={'gate-line gate-line--acceptance' + (stage >= 1 ? ' in' : '')}>
        {commitmentGateContent.acceptance}
      </p>
      <p className={'gate-line gate-line--seal' + (stage >= 2 ? ' in' : '')}>
        {commitmentGateContent.line1}
      </p>
      <p className={'gate-line gate-line--warning' + (stage >= 3 ? ' in' : '')}>
        {commitmentGateContent.line2}
      </p>
      <div className="section-divider gate-divider" aria-hidden="true" />
      <p className={'gate-line gate-line--challenge' + (stage >= 4 ? ' in' : '')}>
        {commitmentGateContent.line3}
      </p>
      <div className={'gate-action' + (stage >= 5 ? ' in' : '')}>
        <a
          className="btn btn-primary gate-button"
          href="/application/booking"
          onClick={() => track('commitment_gate_proceeded')}
        >
          {commitmentGateContent.button}
        </a>
      </div>
    </div>
  )
}
