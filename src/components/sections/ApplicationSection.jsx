import { useCallback, useEffect, useRef, useState } from 'react'
import { questions as allQuestions } from '../../config/questions.js'
import { applicationCopy } from '../../config/sectionContent.js'
import { QuestionSlide } from '../ui/QuestionSlide.jsx'
import { CommitmentGate } from '../ui/CommitmentGate.jsx'
import { FinalScreen } from '../ui/FinalScreen.jsx'
import { DeclineScreen } from '../ui/DeclineScreen.jsx'
import { submitLead } from '../../lib/submitLead.js'
import { newPendingId } from '../../lib/pendingLeads.js'
import { getAttribution, getLastCTA } from '../../lib/utm.js'
import { track } from '../../lib/analytics.js'
import { useInView } from '../../hooks/useInView.js'
import { bgImage } from '../../lib/img.js'

const FUNNEL_SLUG = import.meta.env.VITE_FUNNEL_SLUG || 'the-order'
const SOURCE = import.meta.env.VITE_SITE_DOMAIN || 'theorder.global'

// BOOKING-GATED FUNNEL (see BOOKING_GATED_LEADS.md).
//
// This form asks multiple-choice questions ONLY — no name, email or phone.
// The answers are held in React state and go nowhere until the applicant
// books: contact details are typed on the Wayfinder booking page inside the
// iframe, and only its `wf-booking-confirmed` message releases the lead
// (server-side, via /api/funnel-lead). No booking → nothing reaches the CRM.
//
// The retired contact step is filtered out rather than trusted absent: /admin
// saves the whole of questions.json, so a client editing from a stale tab
// could re-introduce it. It must never render.
const questions = allQuestions.filter((q) => q.type !== 'contact')

// The business gate: true when any answered choice question's selected option
// carries `disqualify: true` (set per-option in /admin → Application).
function isDisqualified(formData) {
  for (const q of questions) {
    if (q.type !== 'choice') continue
    const picked = (q.options || []).find((o) => o.value === formData[q.id])
    if (picked?.disqualify) return true
  }
  return false
}

// `booking` is the validated `wf-booking-confirmed` payload — the ONLY source
// of contact details in this funnel. Its name/email/phone are what the
// applicant typed on the Wayfinder booking page, so they are already the
// values attached to the booking; we never re-normalise them (that would risk
// sending a number that differs from the one the CRM has).
function buildPayload(formData, booking) {
  const fullName = (booking.name || '').trim()
  const [firstName, ...rest] = fullName.split(/\s+/)
  const lastName = rest.join(' ')
  const phone = typeof booking.phone === 'string' ? booking.phone.trim() : ''

  // Scored answers — sent BOTH flat (Jeff-funnel handler) AND nested in
  // `responses` (current Wayfinder OS handler). Whichever the funnel reads
  // wins; the other is harmless rawResponses noise. See WAYFINDER_WIRING.md.
  // The four legacy field names are always present (Wayfinder scoring
  // contract); any further choice questions added via the CMS ride along
  // under their own id.
  const responses = {
    mainChallenge: formData.mainChallenge || '',
    commitment: formData.commitment || '',
    readiness: formData.readiness || '',
    income: formData.income || '',
  }
  for (const q of questions) {
    if (q.type === 'choice') responses[q.id] = formData[q.id] || ''
  }

  return {
    pendingId: newPendingId(),
    // Booking identity — `bookingId` is what makes the OS enrich the booking's
    // existing deal instead of creating a second one, and it is the permanent
    // idempotency key for retries.
    bookingId: booking.bookingId || '',
    bookingSlug: booking.slug || '',
    bookingStartTime: booking.startTime || null,
    bookingTimezone: booking.timezone || '',
    email: (booking.email || '').trim().toLowerCase(),
    firstName: firstName || '',
    lastName: lastName || '',
    name: fullName,
    fullName,
    phone,
    // SMS consent — deliberately conservative. This funnel no longer asks for
    // consent (there is no contact step); the number is typed on the Wayfinder
    // booking page, which owns its own consent copy. Claiming marketing
    // consent we did not collect would be a TCPA misstatement, so marketing is
    // false and only operational (appointment reminders for the call they just
    // booked) is asserted, and only when a number exists.
    smsConsent: false,
    smsConsentMarketing: false,
    smsConsentOperational: !!phone,
    // Scored answers — flat …
    ...responses,
    // … and nested.
    responses,
    source: SOURCE,
    funnel: FUNNEL_SLUG,
    submittedAt: new Date().toISOString(),
    timestamp: Date.now(),
    lastCTA: getLastCTA(),
    // utm_source/medium/campaign/content/term, gclid, fbclid, referrer —
    // first-touch preferred, empty keys omitted.
    ...getAttribution(),
  }
}

export function ApplicationSection() {
  const { ref: sectionRef, inView } = useInView({ threshold: 0.2 })
  const formRef = useRef(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({})
  const [faded, setFaded] = useState(false)
  // `finished` = the questionnaire is done. From here the applicant either
  // sees the negation screen or the commitment gate; there is no submit.
  const [finished, setFinished] = useState(() => questions.length === 0)
  const [declined, setDeclined] = useState(false)
  // The gate stands between the last question and the calendar: the applicant
  // has to accept the terms of the call before a single time slot is shown.
  const [gatePassed, setGatePassed] = useState(false)
  const [booking, setBooking] = useState(null)
  const [formStarted, setFormStarted] = useState(false)
  const [questionViewedFor, setQuestionViewedFor] = useState(0)

  const total = questions.length
  const q = questions[step - 1]

  useEffect(() => {
    if (!inView || finished || !q) return
    if (questionViewedFor === step) return
    setQuestionViewedFor(step)
    track('question_viewed', { step, field: q.id })
  }, [step, inView, finished, questionViewedFor, q])

  const handleChange = useCallback((patch) => {
    setFormData((prev) => ({ ...prev, ...patch }))
    if (!formStarted) {
      setFormStarted(true)
      track('form_started', { last_cta_location: getLastCTA() })
    }
  }, [formStarted])

  // Called with the answer that completes the form, because setFormData is
  // async — reading `formData` here would miss the last choice.
  const finish = useCallback((finalData) => {
    // The gate. A declining answer ends the application here: no calendar, no
    // contact details ever collected, nothing sent to the CRM.
    if (isDisqualified(finalData)) {
      track('application_declined', {
        income_bracket: finalData.income || '',
        last_cta_location: getLastCTA(),
      })
      setDeclined(true)
      setFinished(true)
      return
    }
    // NOT the billed conversion — that fires on booking (see handleBooked).
    // This is the only signal we get for booking-step drop-off, which is
    // invisible to the OS by design.
    track('questionnaire_completed', {
      income_bracket: finalData.income || '',
      life_area: finalData.mainChallenge || '',
      last_cta_location: getLastCTA(),
    })
    setFinished(true)
  }, [])

  const advance = useCallback((patch) => {
    setFaded(true)
    track('question_completed', { step, field: q?.id })
    const nextData = { ...formData, ...(patch || {}) }
    setTimeout(() => {
      if (step >= total) {
        finish(nextData)
        requestAnimationFrame(() => {
          scrollToCard(formRef.current)
          setFaded(false)
        })
        return
      }
      setStep((s) => s + 1)
      requestAnimationFrame(() => {
        // scroll the question card into view, slow
        scrollToCard(formRef.current)
        setFaded(false)
      })
    }, 220)
  }, [step, total, q, formData, finish])

  const goBack = useCallback(() => {
    if (step <= 1) return
    setFaded(true)
    track('question_back', { step, field: q?.id })
    setTimeout(() => {
      setStep((s) => s - 1)
      // clear the prior answer (Jeff handoff: users hit back to change, not verify)
      setFormData((prev) => {
        const prior = questions[step - 2]
        if (prior?.type === 'choice') {
          const copy = { ...prev }
          delete copy[prior.id]
          return copy
        }
        return prev
      })
      requestAnimationFrame(() => {
        scrollToCard(formRef.current)
        setFaded(false)
      })
    }, 220)
  }, [step, q])

  // Synchronous re-entry lock. `wf-booking-confirmed` is documented as
  // fire-once, but a duplicate would double-count a billed Meta Lead AND
  // double-post the lead — and a state guard is async, so it would not hold.
  const bookedLockRef = useRef(false)

  const handleBooked = useCallback(async (message) => {
    if (bookedLockRef.current) return
    bookedLockRef.current = true
    setBooking(message)

    const payload = buildPayload(formData, message)
    // The billed conversion — fired here, at the booking, because a booking is
    // the only thing this funnel now counts as a lead. At intent (before the
    // POST), never on POST-success: counting only successes would starve the
    // optimizer during an outage. Delivery is the queue's job.
    track('form_submitted', {
      income_bracket: formData.income || '',
      life_area: formData.mainChallenge || '',
      last_cta_location: getLastCTA(),
    })
    const result = await submitLead(payload)
    if (result.ok) {
      track('wayfinder_lead_sent', { source: 'immediate' })
    } else {
      track('wayfinder_lead_failed', { queued: !!result.queued, status: result.status })
    }
  }, [formData])

  // Accepting the terms of the call is what reveals the calendar. Nothing is
  // collected or sent here — it is a decision, not a submission.
  const passGate = useCallback(() => {
    track('commitment_gate_passed', { last_cta_location: getLastCTA() })
    setGatePassed(true)
    requestAnimationFrame(() => scrollToCard(formRef.current))
  }, [])

  return (
    <section id="application" className="section section-application" ref={sectionRef}>
      {applicationCopy.image && (
        <div
          className="section-bg-image"
          style={{ backgroundImage: bgImage(applicationCopy.image) }}
          aria-hidden="true"
        />
      )}
      {/* The card widens only once the calendar is actually on screen — it
          needs more room than the reading column gives. The questionnaire, the
          gate and the decline screen all stay in the narrow column. */}
      <div className={'shell-narrow application-shell' + (finished && !declined && gatePassed ? ' application-shell--booking' : '')}>
        {!finished && q && (
          <div className="application-card card card-stitched nailed" ref={formRef}>
            <span className="nail-tl" />
            <span className="nail-br" />
            <div className="eyebrow application-eyebrow">
              <span className="brass-rule" /> {applicationCopy.eyebrow} <span className="brass-rule" />
            </div>
            <div className="progress-track application-progress" aria-hidden="true">
              <div
                className="progress-fill"
                style={{ width: `${((step - 1) / total) * 100}%` }}
              />
            </div>
            <QuestionSlide
              question={q}
              step={step}
              value={formData[q.id]}
              onChange={handleChange}
              onAdvance={advance}
              onBack={goBack}
              faded={faded}
            />
            <div className="application-step restraint" aria-hidden="true">
              {applicationCopy.stepLabel ?? 'Step'} {step} / {total}
            </div>
          </div>
        )}

        {finished && (
          <div className="application-card card card-stitched nailed" ref={formRef}>
            <span className="nail-tl" />
            <span className="nail-br" />
            {declined ? (
              <DeclineScreen />
            ) : gatePassed ? (
              <FinalScreen onBooked={handleBooked} booking={booking} />
            ) : (
              <CommitmentGate onProceed={passGate} />
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function scrollToCard(el) {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const top = window.scrollY + rect.top - 80
  window.scrollTo({ top, behavior: 'smooth' })
}
