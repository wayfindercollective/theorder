import { useCallback, useEffect, useRef, useState } from 'react'
import { questions as allQuestions } from '../../config/questions.js'
import { applicationCopy } from '../../config/sectionContent.js'
import { QuestionSlide } from '../ui/QuestionSlide.jsx'
import { QualifiedScreen } from '../ui/QualifiedScreen.jsx'
import { DeclineScreen } from '../ui/DeclineScreen.jsx'
import { getLastCTA } from '../../lib/utm.js'
import { pushDataLayerEvent, track } from '../../lib/analytics.js'
import { useInView } from '../../hooks/useInView.js'
import { bgImage } from '../../lib/img.js'

// LOCAL QUALIFICATION FILTER.
//
// This form asks multiple-choice questions only. It never collects contact
// details and never sends answers or a lead to Wayfinder OS. Answers are used
// in this component solely to choose between the decline and qualified
// screens, then discarded.
//
// A stale CMS tab could reintroduce the retired contact step, so filter it out
// rather than relying on its absence from questions.json.
const questions = allQuestions.filter((q) => q.type !== 'contact')

// Keep in-progress answers only in this browser tab so an involuntary mobile
// reload does not make somebody repeat the questionnaire. Once the filter has
// made its decision, the answers are removed and only the result is retained.
const STATE_KEY = 'order_application_filter_state_v2'

function loadState() {
  try {
    const raw = sessionStorage.getItem(STATE_KEY)
    const state = raw ? JSON.parse(raw) : null
    return state && typeof state === 'object' && !Array.isArray(state) ? state : null
  } catch {
    return null
  }
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

export function ApplicationSection() {
  const { ref: sectionRef, inView } = useInView({ threshold: 0.2 })
  const formRef = useRef(null)
  const [saved] = useState(loadState)
  const [step, setStep] = useState(() => saved?.step || 1)
  const [formData, setFormData] = useState(() => saved?.formData || {})
  const [faded, setFaded] = useState(false)
  // `finished` means the local filter has chosen a result screen. There is no
  // submission at this point (or anywhere else in this component).
  const [finished, setFinished] = useState(() => saved?.finished ?? questions.length === 0)
  const [declined, setDeclined] = useState(() => !!saved?.declined)
  const [formStarted, setFormStarted] = useState(false)
  const [questionViewedFor, setQuestionViewedFor] = useState(0)
  // Choice transitions are delayed for the fade animation, so two very fast
  // clicks on the last answer can otherwise queue finish() twice. Seed the
  // lock from restored state as well: returning to an already-confirmed result
  // must never emit SubmitApplication again.
  const finishLockRef = useRef(!!saved?.finished)

  const total = questions.length
  const question = questions[step - 1]

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STATE_KEY,
        JSON.stringify({ step, formData: finished ? {} : formData, finished, declined })
      )
    } catch {
      // Private mode or a full quota must never block the questionnaire.
    }
  }, [step, formData, finished, declined])

  useEffect(() => {
    if (!inView || finished || !question) return
    if (questionViewedFor === step) return
    setQuestionViewedFor(step)
    track('question_viewed', { step, field: question.id })
  }, [step, inView, finished, questionViewedFor, question])

  const handleChange = useCallback((patch) => {
    setFormData((previous) => ({ ...previous, ...patch }))
    if (!formStarted) {
      setFormStarted(true)
      track('form_started', { last_cta_location: getLastCTA() })
    }
  }, [formStarted])

  // `finalData` includes the last answer; React state may not have committed it
  // yet when the delayed question transition calls this function.
  const finish = useCallback((finalData) => {
    if (finishLockRef.current) return
    finishLockRef.current = true
    const shouldDecline = isDisqualified(finalData)
    track(shouldDecline ? 'application_declined' : 'questionnaire_completed', {
      result: shouldDecline ? 'declined' : 'qualified',
      last_cta_location: getLastCTA(),
    })
    if (!shouldDecline) pushDataLayerEvent('submit_application')
    setDeclined(shouldDecline)
    setFinished(true)
    setFormData({})
  }, [])

  const advance = useCallback((patch) => {
    setFaded(true)
    track('question_completed', { step, field: question?.id })
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
      setStep((current) => current + 1)
      requestAnimationFrame(() => {
        scrollToCard(formRef.current)
        setFaded(false)
      })
    }, 220)
  }, [step, total, question, formData, finish])

  const goBack = useCallback(() => {
    if (step <= 1) return
    setFaded(true)
    track('question_back', { step, field: question?.id })
    setTimeout(() => {
      setStep((current) => current - 1)
      setFormData((previous) => {
        const prior = questions[step - 2]
        if (prior?.type !== 'choice') return previous
        const copy = { ...previous }
        delete copy[prior.id]
        return copy
      })
      requestAnimationFrame(() => {
        scrollToCard(formRef.current)
        setFaded(false)
      })
    }, 220)
  }, [step, question])

  return (
    <section id="application" className="section section-application" ref={sectionRef}>
      {applicationCopy.image && (
        <div
          className="section-bg-image"
          style={{ backgroundImage: bgImage(applicationCopy.image) }}
          aria-hidden="true"
        />
      )}
      <div className="shell-narrow application-shell">
        {!finished && question && (
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
              question={question}
              step={step}
              value={formData[question.id]}
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
