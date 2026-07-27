import { useEffect, useRef, useState } from 'react'
import { brandContent, finalScreenContent, submitConsent } from '../../config/sectionContent.js'
import { BookingWidget } from './BookingWidget.jsx'

// Renders the booked time in the timezone the booking page reported, so the
// line always agrees with the confirmation email. Falls back to the browser's
// zone (and then to nothing) rather than showing a wrong or broken time.
function formatBookedTime(startTime, timezone) {
  if (!startTime) return ''
  const opts = {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }
  try {
    return new Date(startTime).toLocaleString(undefined, { ...opts, timeZone: timezone || undefined })
  } catch {
    try {
      return new Date(startTime).toLocaleString(undefined, opts)
    } catch {
      return ''
    }
  }
}

// The end of the application: the ceremony, then the Wayfinder booking
// calendar. `onBooked` receives the validated `wf-booking-confirmed` payload —
// it is what releases the lead. `booking` is that same payload once it has
// arrived, and only switches this screen into its confirmed state.
export function FinalScreen({ onBooked, booking }) {
  const rootRef = useRef(null)
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 350)
    const t2 = setTimeout(() => setStage(2), 1100)
    const t3 = setTimeout(() => setStage(3), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const bookedTime = booking ? formatBookedTime(booking.startTime, booking.timezone) : ''

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
      <p className={'final-sub final-sub--gilded' + (stage >= 2 ? ' in' : '')}>
        {finalScreenContent.sub}
      </p>
      <div className="section-divider" style={{ marginTop: '3rem', marginBottom: '3rem' }} />
      <p className={'final-begin' + (stage >= 3 ? ' in' : '')}>
        {finalScreenContent.begin}
      </p>

      {/* The booking calendar — mounted immediately so the iframe starts
          loading during the ceremony, revealed with the final stage. Copy
          defaults live here and any matching CMS fields override them. It
          stays mounted after the booking: the frame shows the calendar's own
          confirmation screen, and unmounting it would blank that out. */}
      <div className={'final-booking' + (stage >= 3 ? ' in' : '')}>
        <div className="eyebrow application-eyebrow">
          <span className="brass-rule" />{' '}
          {booking
            ? (finalScreenContent.bookedEyebrow || 'Confirmed')
            : (finalScreenContent.bookingEyebrow || 'The Next Step')}{' '}
          <span className="brass-rule" />
        </div>
        <h3 className="final-booking-heading display">
          {booking
            ? (finalScreenContent.bookedHeading || 'Your Call Is Booked')
            : (finalScreenContent.bookingHeading || 'Book Your Call')}
        </h3>
        {booking && (
          <p className="final-booked-note">
            {bookedTime && <strong>{bookedTime}</strong>}
            {bookedTime && ' — '}
            {finalScreenContent.bookedSub || 'Check your email for the confirmation and calendar invite.'}
          </p>
        )}
        <BookingWidget onBooked={onBooked} scrollAnchorRef={rootRef} />

        {/* Contact details are typed inside the frame, so the disclosures
            belong here — this is the point of collection. */}
        <p className="qs-consent-links restraint">
          {submitConsent.privacyHref && (
            <a href={submitConsent.privacyHref} target="_blank" rel="noopener noreferrer">
              {submitConsent.privacyLabel || 'Privacy Policy'}
            </a>
          )}
          {submitConsent.privacyHref && submitConsent.termsHref && (
            <span aria-hidden="true"> · </span>
          )}
          {submitConsent.termsHref && (
            <a href={submitConsent.termsHref} target="_blank" rel="noopener noreferrer">
              {submitConsent.termsLabel || 'Terms of Service'}
            </a>
          )}
        </p>
        {submitConsent.smsLine && (
          <p className="booking-sms-note restraint">{submitConsent.smsLine}</p>
        )}
      </div>
    </div>
  )
}
