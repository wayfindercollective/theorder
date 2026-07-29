import { useEffect, useState } from 'react'
import { commitmentGateContent } from '../../config/sectionContent.js'
import { track } from '../../lib/analytics.js'

/**
 * The commitment gate — the screen that now stands where the contact step used
 * to, between the last question and the booking calendar.
 *
 * It exists to make the applicant say yes to the call before they see a
 * calendar: scarcity, the one-shot rule, then the challenge. Nothing is
 * collected here and nothing is sent — pressing the button only reveals the
 * calendar. All copy lives in sections.json → commitmentGate.
 *
 * Staged reveal matches FinalScreen / DeclineScreen: the lines land in order
 * so the challenge is read last, and the button appears only after it.
 */
export function CommitmentGate({ onProceed }) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    track('commitment_gate_viewed')
    const t1 = setTimeout(() => setStage(1), 300)
    const t2 = setTimeout(() => setStage(2), 1000)
    const t3 = setTimeout(() => setStage(3), 1750)
    const t4 = setTimeout(() => setStage(4), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  return (
    <div className="commitment-gate">
      <p className={'gate-line gate-line--seal' + (stage >= 1 ? ' in' : '')}>
        {commitmentGateContent.line1}
      </p>
      <p className={'gate-line gate-line--warning' + (stage >= 2 ? ' in' : '')}>
        {commitmentGateContent.line2}
      </p>
      <div className="section-divider gate-divider" aria-hidden="true" />
      <p className={'gate-line gate-line--challenge' + (stage >= 3 ? ' in' : '')}>
        {commitmentGateContent.line3}
      </p>
      <div className={'gate-action' + (stage >= 4 ? ' in' : '')}>
        <button
          type="button"
          className="btn btn-primary gate-button"
          onClick={onProceed}
        >
          {commitmentGateContent.button}
        </button>
      </div>
    </div>
  )
}
