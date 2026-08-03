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
  const confirmedRef = useRef(null)
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 350)
    const t2 = setTimeout(() => setStage(2), 1100)
    const t3 = setTimeout(() => setStage(3), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // Once the call is booked, the calendar's own "booking confirmed" panel is
  // NOT the message that matters — the ceremony above it is: THE ORDER, "God
  // Wills It", "Confirmation", "Your Enquiry Interview Is Scheduled", and Nico's
  // paragraph beneath it. The applicant is otherwise left looking at the frame,
  // which is mid-page and, on a phone, a screen or two below that copy.
  //
  // So on confirmation we bring the block spanning exactly those elements — the
  // mark (rootRef) down to the end of the paragraph (confirmedRef) — into view:
  // centred when it fits, otherwise pinned directly under the fixed header so it
  // reads from the first line down. That header is the reason we cannot just use
  // a small constant offset: `.site-header` is position:fixed and would sit on
  // top of "THE ORDER". The paragraph is long enough that on a phone the block
  // is taller than the viewport, so the pinned branch is the normal outcome —
  // which is the right one, since they read downward from the top of it.
  //
  // The calendar re-focuses a control on its confirmation screen and the frame
  // also changes height (`.booking-frame-wrap--confirmed`), either of which can
  // drag the page afterwards — hence the two correction passes. Both bail the
  // moment the applicant scrolls themselves; yanking the page out from under a
  // deliberate scroll is worse than a slightly off position.
  useEffect(() => {
    if (!booking) return
    let cancelled = false
    const stop = () => { cancelled = true }
    window.addEventListener('wheel', stop, { passive: true, once: true })
    window.addEventListener('touchstart', stop, { passive: true, once: true })

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const targetTop = () => {
      const root = rootRef.current
      if (!root) return null
      const rootRect = root.getBoundingClientRect()
      const endRect = (confirmedRef.current || root).getBoundingClientRect()
      const top = window.scrollY + rootRect.top
      const height = Math.max(0, window.scrollY + endRect.bottom - top)
      const vh = window.innerHeight || 0
      // Measured, not assumed: the header is a different height on a phone and
      // it is the one thing that can cover the top of the block.
      const header = document.querySelector('.site-header')
      const gap = (header ? header.offsetHeight : 0) + 12
      const room = vh - gap - 8
      // Centre inside the space below the header when the whole block fits;
      // otherwise pin its top just under the header.
      const pad = height && height <= room ? gap + (room - height) / 2 : gap
      return Math.max(0, top - pad)
    }

    const goTo = (behavior) => {
      const top = targetTop()
      if (top === null) return
      window.scrollTo({ top, behavior })
    }

    // First pass after a paint, so the confirmed copy is in the DOM and the
    // block is measured at its real height.
    const raf = requestAnimationFrame(() => {
      if (cancelled) return
      goTo(reduce ? 'auto' : 'smooth')
    })

    // Corrections, only if something moved us off the mark since.
    const correct = () => {
      if (cancelled) return
      const top = targetTop()
      if (top === null) return
      if (Math.abs(window.scrollY - top) < 40) return
      window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    }
    const t1 = setTimeout(correct, 800)
    const t2 = setTimeout(correct, 1600)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
    }
  }, [booking])

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
      {/* The encouragement line is optional and is currently empty. Rendering
          it regardless left an empty paragraph between two 3rem dividers — a
          dead void between "God Wills It" and the booking step. Only render
          the divider + line when there is actually copy. */}
      {finalScreenContent.begin && (
        <>
          <div className="section-divider" style={{ marginTop: '2.2rem', marginBottom: '2.2rem' }} />
          <p className={'final-begin' + (stage >= 3 ? ' in' : '')}>
            {finalScreenContent.begin}
          </p>
        </>
      )}

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
          /* The bottom of what the scroll-into-view above has to keep on
             screen — everything from the mark down to this line. */
          <p className="final-booked-note" ref={confirmedRef}>
            {bookedTime && <strong>{bookedTime}</strong>}
            {bookedTime && ' — '}
            {finalScreenContent.bookedSub || 'Check your email for the confirmation and calendar invite.'}
          </p>
        )}
        <BookingWidget onBooked={onBooked} booked={!!booking} scrollAnchorRef={rootRef} />

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
