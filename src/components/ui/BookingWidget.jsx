/**
 * The Wayfinder OS booking calendar, embedded on the application's final
 * screen so an applicant books their call in the same breath as applying.
 *
 * Realities of this embed (learned on clearmind-clearlife, re-verified
 * against the Wayfinder OS source for this build):
 *
 *  - The calendar emits NO resize postMessage and is cross-origin, so the
 *    frame cannot shrink-wrap its content. It gets a tall fixed height and
 *    the OUTER page scrolls — an inner scrollbar reads as broken.
 *  - It DOES read ?name= &email= &phone= and prefills its contact step
 *    (URL params deliberately beat stale session data — confirmed in
 *    BookingPageClient.tsx), so we pass the applicant's details through.
 *  - It autofocuses a control on load, which scroll-jacks the page past the
 *    confirmation heading. We restore the final screen into view once on
 *    load (immediately + again at 250ms; the calendar focuses late).
 *  - A CSP frame-ancestors block fails SILENTLY — the load event still
 *    fires on an empty document, so no timeout can catch it. The "open in
 *    a new tab" link below the frame is therefore always visible.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { BOOKING_URL } from '../../config/booking.js'
import { finalScreenContent } from '../../config/sectionContent.js'
import { track } from '../../lib/analytics.js'

// Tall enough that the whole calendar card — including the last evening
// slot on a busy day — fits without an inner scrollbar. Tune here.
const FRAME_HEIGHT = 1120

export function BookingWidget({ name, email, phone, scrollAnchorRef }) {
  const [loaded, setLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const resetOnce = useRef(false)

  const url = useMemo(() => {
    const params = new URLSearchParams()
    if (name) params.set('name', name)
    if (email) params.set('email', email)
    if (phone) params.set('phone', phone)
    const qs = params.toString()
    return qs ? `${BOOKING_URL}?${qs}` : BOOKING_URL
  }, [name, email, phone])

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10000)
    return () => clearTimeout(t)
  }, [])

  const onLoad = () => {
    setLoaded(true)
    track('booking_widget_loaded')
    if (resetOnce.current) return
    resetOnce.current = true
    // The calendar autofocuses a control → the browser scrolls it into view,
    // hiding the confirmation heading. Bring the final screen back.
    const restore = () => {
      const el = scrollAnchorRef?.current
      if (!el) return
      const top = window.scrollY + el.getBoundingClientRect().top - 90
      window.scrollTo({ top })
    }
    restore()
    setTimeout(restore, 250)
  }

  return (
    <div className="booking-widget">
      <div className="booking-frame-wrap" style={{ height: FRAME_HEIGHT }}>
        {!loaded && !timedOut && (
          <div className="booking-frame-status" aria-hidden="true">
            <span className="booking-spinner" />
          </div>
        )}
        {/* The frame stays mounted through a timeout — the fallback OVERLAYS
            it, so a slow load that lands late still replaces the fallback
            with the working calendar. */}
        <iframe
          src={url}
          title="Book your call"
          onLoad={onLoad}
          allow="camera; microphone; payment"
          className="booking-frame"
        />
        {timedOut && !loaded && (
          <div className="booking-frame-status booking-frame-status--solid">
            <div>
              <p className="booking-slow">
                {finalScreenContent.bookingSlowMessage || 'The calendar is taking longer than usual to load.'}
              </p>
              <a
                className="btn btn-primary"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('booking_open_new_tab', { reason: 'timeout' })}
              >
                {finalScreenContent.bookingSlowButton || 'Book Your Call'}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Escape hatch — must ALWAYS be visible (see CSP note above). */}
      <p className="booking-escape restraint">
        {finalScreenContent.bookingEscapeLine || 'Calendar not loading?'}{' '}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('booking_open_new_tab', { reason: 'manual' })}
        >
          {finalScreenContent.bookingEscapeLink || 'Open it in a new tab'}
        </a>
      </p>
    </div>
  )
}
