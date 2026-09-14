import { useCallback, useEffect, useRef, useState } from 'react'
import { questions as allQuestions } from '../../config/questions.js'
import { applicationCopy } from '../../config/sectionContent.js'
import { variantSlugFromPath } from '../../config/variantPages.js'
import { QuestionSlide } from '../ui/QuestionSlide.jsx'
import { ContactStep, isContactValid } from '../ui/ContactStep.jsx'
import { QualifiedScreen } from '../ui/QualifiedScreen.jsx'
import { DeclineScreen } from '../ui/DeclineScreen.jsx'
import { captureAttribution, getLastCTA, readMetaIds } from '../../lib/utm.js'
import { pushDataLayerEvent, track } from '../../lib/analytics.js'
import { submitLead } from '../../lib/submitLead.js'
import { newPendingId } from '../../lib/pendingLeads.js'
import { useInView } from '../../hooks/useInView.js'
import { DeferredBackground } from '../ui/DeferredBackground.jsx'

// THE APPLICATION.
//
// Multiple-choice questions, then name + email, then a result screen. The
// questions are the gate, applied on submit:
//
//   declined  — any answer marked `disqualify` in the CMS. The applicant sees
//               the return-later screen and NOTHING is sent anywhere; their
//               details are dropped from this tab.
//   qualified — the answers + contact details go to Wayfinder OS as a lead
//               (through our own /api/funnel-lead relay), which creates the
//               deal, and the applicant sees Nico's video and the Instagram
//               handoff.
//
// Everyone is asked for their details BEFORE the decision, so nobody can tell
// which answer turns them away by where the form stops.
//
// The contact step is built in rather than being a question in questions.json,
// so lead capture can never be reordered away or deleted from the CMS. A
// leftover `contact` entry in questions.json is ignored.
const questions = allQuestions.filter((q) => q.type !== 'contact')

// The `funnel` field in the payload. Not the same string as the slug in the
// lead URL ("the-order-funnel") — see api/_lib/funnelLead.js.
const FUNNEL_SLUG = import.meta.env.VITE_FUNNEL_SLUG || 'the-order'
const SOURCE = import.meta.env.VITE_SITE_DOMAIN || 'theorder.global'

// In-progress answers and details live only in this browser tab, so an
// involuntary mobile reload does not make somebody start again. Once submitted,
// they are removed and only the result screen is remembered. `_v3`: the step
// numbering changed when the contact step was added.
const STATE_KEY = 'order_application_state_v3'

function loadState() {
  try {
    const raw = sessionStorage.getItem(STATE_KEY)
    const state = raw ? JSON.parse(raw) : null
    return state && typeof state === 'object' && !Array.isArray(state) ? state : null
  } catch {
    return null
  }
}

// A restored step can point past the end if a question was deleted in the CMS
// since this tab saved it.
function clampStep(value) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, questions.length + 1)
}

// The business gate: a single answer marked `disqualify` in the CMS sends the
// applicant to the return-later screen.
function isDisqualified(formData) {
  for (const question of questions) {
    if (question.type !== 'choice') continue
    const picked = (question.options || []).find((option) => option.value === formData[question.id])
    if (picked?.disqualify) return true
  }
  return false
}

// The lead as Wayfinder OS receives it. Contract in WAYFINDER_WIRING.md:
// answers both flat and nested, phone always a string, attribution merged in.
function buildPayload(formData) {
  const contact = formData.contact || {}
  const fullName = (contact.fullName || '').trim().replace(/\s+/g, ' ')
  const [firstName = '', ...rest] = fullName.split(' ')

  // The four legacy field names are always present (Wayfinder scoring
  // contract); every current choice question rides along under its own id.
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
    // Answers first, so a question id that happens to collide with a contact
    // or attribution field can never overwrite it.
    ...responses,
    responses,
    pendingId: newPendingId(),
    email: (contact.email || '').trim().toLowerCase(),
    firstName,
    lastName: rest.join(' '),
    name: fullName,
    fullName,
    // No phone is collected, so there is no number and no SMS consent of any
    // kind. Claiming consent we never asked for would be a TCPA misstatement.
    phone: '',
    smsConsent: false,
    smsConsentMarketing: false,
    smsConsentOperational: false,
    source: SOURCE,
    funnel: FUNNEL_SLUG,
    // Which landing page they applied from: `main`, `physical`, `financial`…
    landingPage: variantSlugFromPath(window.location.pathname) || 'main',
    submittedAt: new Date().toISOString(),
    timestamp: Date.now(),
    lastCTA: getLastCTA(),
    // utm_source/medium/campaign/content/term, gclid, fbclid, referrer —
    // first-touch preferred, empty keys omitted.
    ...captureAttribution(),
    // fbc / fbp: lets the OS match its server-side Meta events back to the ad
    // click far more reliably than hashed email alone.
    ...readMetaIds(),
  }
}

export function ApplicationSection() {
  const { ref: sectionRef, inView } = useInView({ threshold: 0.2 })
  const formRef = useRef(null)
  const [saved] = useState(loadState)
  const [step, setStep] = useState(() => clampStep(saved?.step))
  const [formData, setFormData] = useState(() => saved?.formData || {})
  const [faded, setFaded] = useState(false)
  const [finished, setFinished] = useState(() => !!saved?.finished)
  const [declined, setDeclined] = useState(() => !!saved?.declined)
  const [submitting, setSubmitting] = useState(false)
  const [formStarted, setFormStarted] = useState(false)
  const [viewedFor, setViewedFor] = useState(0)
  // Synchronous re-entry lock for the submit. A `submitting` state guard is
  // async: Enter + click, or a fast double-click, would pass it twice before
  // the re-render — double-firing SubmitApplication and double-posting the
  // lead. Seeded from restored state: returning to an already-submitted result
  // must never emit either again.
  const submitLockRef = useRef(!!saved?.finished)

  const choiceCount = questions.length
  const total = choiceCount + 1
  const onContactStep = step > choiceCount
  const question = onContactStep ? null : questions[step - 1]

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({ step, formData: finished ? {} : formData, finished, declined })
      )
    } catch {
      // Private mode or a full quota must never block the application.
    }
  }, [step, formData, finished, declined])

  useEffect(() => {
    if (!inView || finished) return
    if (viewedFor === step) return
    setViewedFor(step)
    track('question_viewed', { step, field: onContactStep ? 'contact' : question?.id })
  }, [step, inView, finished, viewedFor, onContactStep, question])

  const markStarted = useCallback(() => {
    if (formStarted) return
    setFormStarted(true)
    track('form_started', { last_cta_location: getLastCTA() })
  }, [formStarted])

  const handleChange = useCallback((patch) => {
    setFormData((previous) => ({ ...previous, ...patch }))
    markStarted()
  }, [markStarted])

  const handleContactChange = useCallback((patch) => {
    setFormData((previous) => ({ ...previous, contact: { ...(previous.contact || {}), ...patch } }))
    markStarted()
  }, [markStarted])

  const transition = useCallback((apply) => {
    setFaded(true)
    setTimeout(() => {
      apply()
      requestAnimationFrame(() => {
        scrollToCard(formRef.current)
        setFaded(false)
      })
    }, 220)
  }, [])

  // After the last question this lands on the contact step, never a result.
  //
  // Both moves only apply if the step is still the one they were issued from.
  // A double-tap on an answer queues two advances within the fade; without the
  // guard the second would skip the NEXT question, and an unanswered question
  // is one whose disqualifying answer the gate can never see.
  const advance = useCallback(() => {
    const from = step
    track('question_completed', { step: from, field: question?.id })
    transition(() => setStep((current) => (current === from ? Math.min(current + 1, total) : current)))
  }, [step, question, total, transition])

  const goBack = useCallback(() => {
    if (step <= 1) return
    const from = step
    track('question_back', { step: from, field: onContactStep ? 'contact' : question?.id })
    transition(() => {
      setStep((current) => (current === from ? current - 1 : current))
      // Returning to a question clears its answer so it is picked afresh.
      // Contact details are kept.
      setFormData((previous) => {
        const prior = questions[step - 2]
        if (prior?.type !== 'choice') return previous
        const copy = { ...previous }
        delete copy[prior.id]
        return copy
      })
    })
  }, [step, onContactStep, question, transition])

  const showResult = useCallback((isDeclined) => {
    setDeclined(isDeclined)
    setFinished(true)
    setFormData({})
    requestAnimationFrame(() => scrollToCard(formRef.current))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    const contact = formData.contact || {}

    // Honeypot: a bot filled the hidden field. Show the ordinary success
    // screen, send nothing, count nothing.
    if ((contact.company || '').trim()) {
      showResult(false)
      return
    }

    if (!isContactValid(contact)) {
      // The only exit the applicant can retry from — release the lock. The
      // step itself shows which field needs fixing.
      submitLockRef.current = false
      return
    }

    // The gate — BEFORE any conversion fires and before any payload is built.
    if (isDisqualified(formData)) {
      track('application_declined', { result: 'declined', last_cta_location: getLastCTA() })
      showResult(true)
      return
    }

    // The conversion (Meta SubmitApplication, GTM submit_application) fires at
    // intent, before the POST — never on POST-success, which would starve ad
    // optimisation during an outage. Delivery is the local queue's job. No
    // browser `Lead`: Wayfinder OS owns that event (see analytics.js).
    track('questionnaire_completed', { result: 'qualified', last_cta_location: getLastCTA() })
    pushDataLayerEvent('submit_application')

    setSubmitting(true)
    const result = await submitLead(buildPayload(formData))
    if (result.ok) {
      track('wayfinder_lead_sent', { source: 'immediate' })
    } else {
      track('wayfinder_lead_failed', {
        source: 'immediate',
        queued: !!result.queued,
        status: result.status || 0,
      })
    }
    // The applicant moves on either way: a lead that did not land is queued in
    // this browser and resent on their next visit.
    setSubmitting(false)
    showResult(false)
  }, [formData, showResult])

  return (
    <section id="application" className="section section-application" ref={sectionRef}>
      {applicationCopy.image && (
        <DeferredBackground
          image={applicationCopy.image}
          className="section-bg-image"
        />
      )}
      <div className="shell-narrow application-shell">
        {!finished && (question || onContactStep) && (
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
            {onContactStep ? (
              <ContactStep
                value={formData.contact}
                onChange={handleContactChange}
                onSubmit={handleSubmit}
                onBack={goBack}
                showBack={step > 1}
                submitting={submitting}
                faded={faded}
              />
            ) : (
              <QuestionSlide
                question={question}
                step={step}
                value={formData[question.id]}
                onChange={handleChange}
                onAdvance={advance}
                onBack={goBack}
                faded={faded}
              />
            )}
            <div className="application-step restraint" aria-hidden="true">
              {applicationCopy.stepLabel ?? 'Step'} {step} / {total}
            </div>
          </div>
        )}

        {finished && (
          <div className="application-card card card-stitched nailed" ref={formRef}>
            <span className="nail-tl" />
            <span className="nail-br" />
            {declined ? <DeclineScreen /> : <QualifiedScreen inView={inView} />}
          </div>
        )}
      </div>
    </section>
  )
}

function scrollToCard(element) {
  if (!element) return
  const rect = element.getBoundingClientRect()
  const top = window.scrollY + rect.top - 80
  window.scrollTo({ top, behavior: 'smooth' })
}
