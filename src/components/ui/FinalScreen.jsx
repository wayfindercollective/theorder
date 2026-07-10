import { useEffect, useRef, useState } from 'react'
import { brandContent, finalScreenContent } from '../../config/sectionContent.js'
import { BookingWidget } from './BookingWidget.jsx'

// `contact` = { name, email, phone } from the just-submitted application —
// passed straight through to the booking calendar so the applicant never
// types their details twice.
export function FinalScreen({ contact }) {
  const rootRef = useRef(null)
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 350)
    const t2 = setTimeout(() => setStage(2), 1100)
    const t3 = setTimeout(() => setStage(3), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="final-screen" ref={rootRef}>
      <div className={'final-mark' + (stage >= 1 ? ' in' : '')}>
        <img
          className="logo-mark final-logo"
          src={brandContent?.logo || '/images/logo-mark.png'}
          alt="The Order"
        />
      </div>
      <h2 className={'final-heading display' + (stage >= 2 ? ' in' : '')}>
        {finalScreenContent.heading}
      </h2>
      <p className={'final-sub' + (stage >= 2 ? ' in' : '')}>
        {finalScreenContent.sub}
      </p>
      <div className="section-divider" style={{ marginTop: '3rem', marginBottom: '3rem' }} />
      <p className={'final-begin' + (stage >= 3 ? ' in' : '')}>
        {finalScreenContent.begin}
      </p>

      {/* The booking calendar — mounted immediately so the iframe starts
          loading during the ceremony, revealed with the final stage. Copy
          defaults live here and any matching CMS fields override them. */}
      <div className={'final-booking' + (stage >= 3 ? ' in' : '')}>
        <div className="eyebrow application-eyebrow">
          <span className="brass-rule" /> {finalScreenContent.bookingEyebrow || 'The Next Step'} <span className="brass-rule" />
        </div>
        <h3 className="final-booking-heading display">
          {finalScreenContent.bookingHeading || 'Book Your Call'}
        </h3>
        <BookingWidget
          name={contact?.name}
          email={contact?.email}
          phone={contact?.phone}
          scrollAnchorRef={rootRef}
        />
      </div>
    </div>
  )
}
