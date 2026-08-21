/**
 * The Wayfinder OS booking calendar, embedded only on /application/booking.
 * Nothing is prefilled and no questionnaire state is available here;
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
 *  - A restored date makes the calendar call scrollIntoView on its time pane.
 *    In an embed that can scroll the parent document too. The parent viewport
 *    is briefly locked at the top while that initial calendar effect settles.
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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BOOKING_URL, bookingUrlWithAttribution } from '../../config/booking.js'
import { finalScreenContent } from '../../config/sectionContent.js'
import { pushDataLayerEvent, track } from '../../lib/analytics.js'

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

export function BookingWidget({ onBooked, booked }) {
  const [loaded, setLoaded] = useState(false)
  const [autoHeight, setAutoHeight] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const resetOnce = useRef(false)
  const settleTimerRef = useRef(null)
  const releaseScrollLockRef = useRef(() => {})
  const frameRef = useRef(null)
  const bookedRef = useRef(false)
  // Kept in a ref so a re-created callback never re-subscribes the listener
  // (and so the fire-once guard survives any re-render).
  const onBookedRef = useRef(onBooked)
  onBookedRef.current = onBooked

  // Computed once: the src must not change after first paint or the iframe
  // reloads and the visitor loses their place in the calendar. BOOKING_ORIGIN
  // above is derived from the bare URL, so the confirmation check is unaffected.
  const url = useMemo(() => bookingUrlWithAttribution(BOOKING_URL), [])

  // The fire-once guard covers duplicate messages as well as React re-renders.
  // This is called only after the trusted calendar confirms the booking (or by
  // the development-only simulator below), never from a booking-button click.
  const confirmBooking = useCallback((data) => {
    if (bookedRef.current) return
    bookedRef.current = true
    track('booking_confirmed', { slug: data.slug || '' })
    pushDataLayerEvent('appointment_scheduled')
    onBookedRef.current?.(data)
  }, [])

  // CalendarView restores the visitor's last selected date from localStorage,
  // then calls scrollIntoView for the corresponding time pane. Because the
  // iframe is part of the outer page's scroll chain, Chrome may satisfy that
  // request by moving this entire page. Locking the root before first paint
  // makes that cross-frame scroll a no-op. We release after the iframe's
  // smooth scroll has finished, or after a fail-safe if the frame never loads.
  useLayoutEffect(() => {
    const root = document.documentElement
    const body = document.body
    const previous = {
      rootOverflow: root.style.overflow,
      rootScrollBehavior: root.style.scrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    }
    let locked = true

    root.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = '0'
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'

    const release = () => {
      if (!locked) return
      locked = false
      frameRef.current?.blur()
      window.scrollTo(0, 0)
      root.style.overflow = previous.rootOverflow
      body.style.overflow = previous.bodyOverflow
      body.style.position = previous.bodyPosition
      body.style.top = previous.bodyTop
      body.style.left = previous.bodyLeft
      body.style.right = previous.bodyRight
      body.style.width = previous.bodyWidth
      window.scrollTo(0, 0)
      root.style.scrollBehavior = previous.rootScrollBehavior
    }

    releaseScrollLockRef.current = release
    const failSafe = setTimeout(release, 5000)
    return () => {
      clearTimeout(failSafe)
      clearTimeout(settleTimerRef.current)
      release()
    }
  }, [])

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
      confirmBooking(event.data)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [confirmBooking])

  const onLoad = () => {
    setLoaded(true)
    if (resetOnce.current) return
    resetOnce.current = true
    track('booking_widget_loaded')
    // CalendarView uses a smooth scroll, so keep the parent locked until that
    // animation has fully settled. This is a release, not a corrective scroll:
    // the outer page never visibly leaves the top position.
    settleTimerRef.current = setTimeout(() => releaseScrollLockRef.current(), 900)
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
            confirmBooking({
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
