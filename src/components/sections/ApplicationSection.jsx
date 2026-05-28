import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { questions } from '../../config/questions.js'
import { applicationCopy } from '../../config/sectionContent.js'
import { QuestionSlide } from '../ui/QuestionSlide.jsx'
import { FinalScreen } from '../ui/FinalScreen.jsx'
import { submitLead } from '../../lib/submitLead.js'
import { newPendingId } from '../../lib/pendingLeads.js'
import { getUTMs, getLastCTA } from '../../lib/utm.js'
import { track } from '../../lib/analytics.js'
import { useInView } from '../../hooks/useInView.js'

const FUNNEL_SLUG = import.meta.env.VITE_FUNNEL_SLUG || 'the-order'
const SOURCE = import.meta.env.VITE_SITE_DOMAIN || 'theorder.placeholder'

function buildPayload(formData) {
  const contact = formData.contact || {}
  const fullName = (contact.fullName || '').trim()
  const [firstName, ...rest] = fullName.split(/\s+/)
  const lastName = rest.join(' ')
  const country = contact.country || {}

  return {
    pendingId: newPendingId(),
    email: contact.email || '',
    firstName: firstName || '',
    lastName: lastName || '',
    name: fullName,
    phone: {
      phone: contact.phone || '',
      country: country.code || '',
      dial: country.dial || '',
      consent: !!contact.smsConsent,
    },
    smsConsent: !!contact.smsConsent,
    mainChallenge: formData.mainChallenge || '',
    commitment: formData.commitment || '',
    readiness: formData.readiness || '',
    income: formData.income || '',
    source: SOURCE,
    funnel: FUNNEL_SLUG,
    submittedAt: new Date().toISOString(),
    timestamp: Date.now(),
    lastCTA: getLastCTA(),
    ...getUTMs(),
  }
}

export function ApplicationSection() {
  const { ref: sectionRef, inView } = useInView({ threshold: 0.2 })
  const formRef = useRef(null)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({})
  const [faded, setFaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formStarted, setFormStarted] = useState(false)
  const [questionViewedFor, setQuestionViewedFor] = useState(0)

  const total = questions.length
  const q = questions[step - 1]

  useEffect(() => {
    if (!inView) return
    if (questionViewedFor === step) return
    setQuestionViewedFor(step)
    track('question_viewed', { step, field: q.id })
  }, [step, inView, questionViewedFor, q.id])

  const handleChange = useCallback((patch) => {
    setFormData((prev) => {
      if (q.type === 'contact') {
        return { ...prev, contact: { ...(prev.contact || {}), ...patch } }
      }
      return { ...prev, ...patch }
    })
    if (!formStarted) {
      setFormStarted(true)
      track('form_started', { last_cta_location: getLastCTA() })
    }
  }, [q, formStarted])

  const advance = useCallback(() => {
    if (step >= total) return
    setFaded(true)
    track('question_completed', { step, field: q.id })
    setTimeout(() => {
      setStep((s) => s + 1)
      requestAnimationFrame(() => {
        // scroll the question card into view, slow
        scrollToCard(formRef.current)
        setFaded(false)
      })
    }, 220)
  }, [step, total, q.id])

  const goBack = useCallback(() => {
    if (step <= 1) return
    setFaded(true)
    track('question_back', { step, field: q.id })
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
  }, [step, q.id])

  const contactValid = useMemo(() => {
    if (q.type !== 'contact') return true
    const c = formData.contact || {}
    const fullName = (c.fullName || '').trim()
    const nameOk = fullName.length >= 2
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '')
    const digits = (c.phone || '').replace(/\D/g, '')
    const phoneOk = digits.length >= 7
    return nameOk && emailOk && phoneOk && !!c.smsConsent
  }, [q, formData])

  const handleSubmit = useCallback(async () => {
    if (submitting) return
    // Honeypot — silently fake-success on bot fill
    const honey = (formData.contact || {}).company
    if (honey) {
      setSubmitted(true)
      return
    }
    if (!contactValid) return
    setSubmitting(true)
    const payload = buildPayload(formData)
    track('form_submitted', { payload_keys: Object.keys(payload) })
    const result = await submitLead(payload)
    if (result.ok) {
      track('wayfinder_lead_sent', { source: 'immediate' })
    } else {
      track('wayfinder_lead_failed', { queued: !!result.queued, status: result.status })
    }
    // Always advance — lead is queued locally either way
    setSubmitting(false)
    setSubmitted(true)
  }, [submitting, contactValid, formData])

  const currentValue = q.type === 'contact' ? formData.contact : formData[q.id]

  return (
    <section id="application" className="section section-application" ref={sectionRef}>
      {applicationCopy.image && (
        <div
          className="section-bg-image"
          style={{ backgroundImage: `url(${applicationCopy.image})` }}
          aria-hidden="true"
        />
      )}
      <div className="shell-narrow application-shell">
        {!submitted && (
          <>
            <div className="application-head">
              <div className="eyebrow">
                <span className="brass-rule" /> {applicationCopy.eyebrow} <span className="brass-rule" />
              </div>
              <h2 className="display section-heading">{applicationCopy.heading}</h2>
              <p className="restraint application-sub">{applicationCopy.sub}</p>
              <div className="progress-track application-progress" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: `${(step / total) * 100}%` }}
                />
              </div>
            </div>

            <div className="application-card card card-stitched nailed" ref={formRef}>
              <span className="nail-tl" />
              <span className="nail-br" />
              <QuestionSlide
                question={q}
                step={step}
                total={total}
                value={currentValue}
                onChange={handleChange}
                onAdvance={advance}
                onBack={goBack}
                canAdvance={contactValid}
                faded={faded}
                onSubmit={handleSubmit}
                submitting={submitting}
              />
            </div>
          </>
        )}

        {submitted && (
          <div className="application-card card card-stitched nailed">
            <span className="nail-tl" />
            <span className="nail-br" />
            <FinalScreen />
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
