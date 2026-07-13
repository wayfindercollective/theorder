import { useEffect, useState } from 'react'
import { brandContent, declineScreenContent } from '../../config/sectionContent.js'

/**
 * The negation screen — shown instead of FinalScreen when the applicant chose
 * a disqualifying answer. Same staged reveal as FinalScreen, no booking
 * calendar. Their lead is NOT sent to Wayfinder and nothing is kept, which the
 * notice line states outright. All copy lives in sections.json → declineScreen.
 */
export function DeclineScreen() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 350)
    const t2 = setTimeout(() => setStage(2), 1100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="final-screen">
      <div className={'final-mark' + (stage >= 1 ? ' in' : '')}>
        <img
          className="logo-mark final-logo"
          src={brandContent?.logo || '/images/logo-mark.png'}
          alt="The Order"
        />
      </div>
      <h2 className={'final-heading display' + (stage >= 2 ? ' in' : '')}>
        {declineScreenContent.heading}
      </h2>
      {/* Nico: the invitation-to-return line is the big, bold, gold moment;
          the privacy line is a small white footnote under the divider. */}
      <p className={'final-sub decline-body' + (stage >= 2 ? ' in' : '')}>
        {declineScreenContent.body}
      </p>
      {declineScreenContent.notice && (
        <>
          <div className="section-divider" style={{ marginTop: '3rem', marginBottom: '3rem' }} />
          <p className={'final-begin decline-notice' + (stage >= 2 ? ' in' : '')}>
            {declineScreenContent.notice}
          </p>
        </>
      )}
    </div>
  )
}
