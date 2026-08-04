/**
 * The Wayfinder OS booking calendar, embedded only on the private /application
 * route. Nothing is prefilled and no questionnaire state is available here;
 * applicants type their contact details directly into the booking page.
 *
 * Realities of this embed (learned on clearmind-clearlife, re-verified
 * against the Wayfinder OS source for this build):
 *
 *  - The calendar sends no resize postMessage and is cross-origin, so the
 *    frame cannot shrink-wrap its content and no fixed height is ever right:
 *    the page is a different height collapsed, with dates open, with times
 *    listed, and confirmed. Too short cuts the dates off; too tall leaves a
 *    dead area below the calendar. The fixed heights in globals.css
 *    (`.booking-frame-wrap`, per breakpoint) are a compromise between those
 *    two failures — a phone needs far more room than a desktop because the
 *    calendar stacks vertically.
 *    THE REAL FIX is one line on the OS side: post the content height (they
 *    already post `wf-booking-confirmed` from the same page). Support for
 *    that is implemented below — the moment such a message arrives the frame
 *    sizes itself exactly and every fixed height stops mattering.
 *  - It autofocuses a control on load, which scroll-jacks the page past the
 *    confirmation heading. We restore the final screen into view once on
 *    load (immediately + again at 250ms; the calendar focuses late).
 *  - A CSP frame-ancestors block fails SILENTLY — the load event still
 *    fires on an empty document, so no timeout can catch it. The "open in
 *    a new tab" link below the frame is therefore always visible. NOTE: a
 *    booking made in that new tab cannot post back to this page, so our local
 *    confirmation treatment and analytics cannot run. The allowlist
 *    (BOOKING_FRAME_ANCESTORS on the OS) must include this site's origins.
 *  - On a successful booking it posts `wf-booking-confirmed` to the parent,
 *    ONCE, and does not re-emit it if the iframe reloads onto its
 *    confirmation screen. Act on first receipt.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { BOOKING_URL } from '../../config/booking.js'
import { finalScreenContent } from '../../config/sectionContent.js'
import { track } from '../../lib/analytics.js'

// Frame height is CSS now (see `.booking-frame-wrap` in globals.css) so it can
// differ per breakpoint — a phone needs roughly twice a desktop's height.

// The exact origin the confirmation message must come from. Derived from the
// booking URL so a preview override (VITE_WAYFINDER_BOOKING_URL) keeps working.
const BOOKING_ORIGIN = (() => {
  try {
    return new URL(BOOKING_URL).origin
  } catch {
    return null
  }
})()

// If the calendar ever posts its content height, use it — that is the only way
// to be exactly right, since the page is a different height in every state
// (collapsed, dates open, times listed, confirmed) and a fixed frame is
// therefore always too tall or too short for something. Accepts the shapes a
// resize message plausibly takes; ignores anything that isn't a sane pixel
// number. Costs nothing while the OS sends no such message.
const MIN_AUTO_HEIGHT = 320
const MAX_AUTO_HEIGHT = 5000

function resizeHeight(data) {
  if (!data || typeof data !== 'object') return 0
  const type = typeof data.type === 'string' ? data.type.toLowerCase() : ''
  if (type && !type.includes('resize') && !type.includes('height')) return 0
  const raw = data.height ?? data.payload?.height ?? data.value
  const n = Math.round(Number(raw))
  if (!Number.isFinite(n) || n < MIN_AUTO_HEIGHT) return 0
  // A couple of px of slack so a sub-pixel rounding difference doesn't leave
  // the frame one line short and reintroduce an inner scrollbar.
  return Math.min(n + 8, MAX_AUTO_HEIGHT)
}

export function BookingWidget({ onBooked, booked, scrollAnchorRef }) {
  const [loaded, setLoaded] = useState(false)
  const [autoHeight, setAutoHeight] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const resetOnce = useRef(false)
  const frameRef = useRef(null)
  const bookedRef = useRef(false)
  // Kept in a ref so a re-created callback never re-subscribes the listener
  // (and so the fire-once guard survives any re-render).
  const onBookedRef = useRef(onBooked)
  onBookedRef.current = onBooked

  const url = BOOKING_URL

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10000)
    return () => clearTimeout(t)
  }, [])

  // The booking confirmation. All three checks — origin, source frame, message
  // type — before anything is trusted: this handler fires a billed conversion,
  // so any window on the page must not be able to spoof it.
  useEffect(() => {
    const onMessage = (event) => {
      if (!BOOKING_ORIGIN || event.origin !== BOOKING_ORIGIN) return
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return
      // Height first — a resize message is not a booking, and shrink-wrapping
      // the frame beats every fixed height in the stylesheet.
      const h = resizeHeight(event.data)
      if (h) setAutoHeight(h)
      if (event.data?.type !== 'wf-booking-confirmed') return
      if (bookedRef.current) return
      bookedRef.current = true
      track('booking_confirmed', { slug: event.data.slug || '' })
      onBookedRef.current?.(event.data)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const onLoad = () => {
    setLoaded(true)
    track('booking_widget_loaded')
    if (resetOnce.current) return
    resetOnce.current = true
    // The calendar autofocuses a control → the browser scrolls it into view,
    // hiding the confirmation heading. Bring the final screen back.
    //
    // ONE correction, after the autofocus has happened — not the two instant
    // jumps this used to fire. Back to back they read as the page glitching
    // or reloading, especially on a phone where the browser is also moving
    // the view for the focused control. Skipped entirely if the applicant has
    // already started scrolling themselves: yanking the page out from under a
    // deliberate scroll is worse than a slightly off starting position.
    let cancelled = false
    const stop = () => { cancelled = true }
    window.addEventListener('wheel', stop, { passive: true, once: true })
    window.addEventListener('touchstart', stop, { passive: true, once: true })
    setTimeout(() => {
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchstart', stop)
      if (cancelled) return
      const el = scrollAnchorRef?.current
      if (!el) return
      const top = window.scrollY + el.getBoundingClientRect().top - 90
      window.scrollTo({ top, behavior: 'smooth' })
    }, 320)
  }

  return (
    <div className="booking-widget">
      {/* Once booked the frame shows the calendar's short confirmation screen
          instead of the full month + slot list, so it shrinks — otherwise the
          mobile height leaves a screen of dead space under the confirmation. */}
      <div
        className={'booking-frame-wrap' + (booked ? ' booking-frame-wrap--confirmed' : '')}
        style={autoHeight ? { height: autoHeight } : undefined}
      >
        {!loaded && !timedOut && (
          <div className="booking-frame-status" aria-hidden="true">
            <span className="booking-spinner" />
          </div>
        )}
        {/* The frame stays mounted through a timeout — the fallback OVERLAYS
            it, so a slow load that lands late still replaces the fallback
            with the working calendar. */}
        <iframe
          ref={frameRef}
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

      {/* The real confirmation can only come from inside a cross-origin frame,
          so it cannot be exercised on localhost. This fires the same handler
          with a fake payload to test the confirmed state and analytics.
          `import.meta.env.DEV` is replaced at
          build time, so none of this reaches production. */}
      {import.meta.env.DEV && (
        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: '0.9rem' }}
          onClick={() => {
            if (bookedRef.current) return
            bookedRef.current = true
            onBookedRef.current?.({
              type: 'wf-booking-confirmed',
              slug: 'dev-simulated',
              bookingId: `dev_${Date.now()}`,
              email: 'dev.test@theorder.global',
              name: 'Dev Test',
              phone: '+15551234567',
              startTime: Date.now() + 86400000,
              timezone: 'Australia/Brisbane',
            })
          }}
        >
          Simulate booking confirmation (dev only)
        </button>
      )}

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
