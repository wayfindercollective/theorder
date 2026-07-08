import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { questions } from '../../config/questions.js'
import { applicationCopy } from '../../config/sectionContent.js'
import { countryCodes } from '../../config/countryCodes.js'
import { QuestionSlide } from '../ui/QuestionSlide.jsx'
import { FinalScreen } from '../ui/FinalScreen.jsx'
import { submitLead } from '../../lib/submitLead.js'
import { newPendingId } from '../../lib/pendingLeads.js'
import { normalizePhone } from '../../lib/phone.js'
import { getUTMs, getLastCTA } from '../../lib/utm.js'
import { track } from '../../lib/analytics.js'
import { useInView } from '../../hooks/useInView.js'
import { bgImage } from '../../lib/img.js'

const FUNNEL_SLUG = import.meta.env.VITE_FUNNEL_SLUG || 'the-order'
const SOURCE = import.meta.env.VITE_SITE_DOMAIN || 'theorder.global'

function buildPayload(formData) {
  const contact = formData.contact || {}
  const fullName = (contact.fullName || '').trim()
  const [firstName, ...rest] = fullName.split(/\s+/)
  const lastName = rest.join(' ')
  // `country` is only written to formData once the user opens the picker; the
  // input itself defaults to countryCodes[0] (US). Mirror that default here so
  // default-country submits still get a dial code + phoneCountry.
  const country = contact.country || countryCodes[0]
  const consent = !!contact.smsConsent
  const { phone, phoneCountry } = normalizePhone(contact.phone, country)

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
    email: (contact.email || '').trim().toLowerCase(),
    firstName: firstName || '',
    lastName: lastName || '',
    name: fullName,
    fullName,
    phone,
    phoneCountry,
    // Consent — all three keys to satisfy both handler versions.
    smsConsent: consent,
    smsConsentMarketing: consent,
    smsConsentOperational: consent,
    // Scored answers — flat …
    ...responses,
    // … and nested.
    responses,
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
    // SMS consent is OPTIONAL — it does NOT gate submission. The value is still
    // captured truthfully in the payload (smsConsent*); unticked = consent false.
    return nameOk && emailOk && phoneOk
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
          style={{ backgroundImage: bgImage(applicationCopy.image) }}
          aria-hidden="true"
        />
      )}
      <div className="shell-narrow application-shell">
        {!submitted && (
          <>
            <div className="application-card card card-stitched nailed" ref={formRef}>
              <span className="nail-tl" />
              <span className="nail-br" />
              <div className="eyebrow application-eyebrow">
                <span className="brass-rule" /> {applicationCopy.eyebrow} <span className="brass-rule" />
              </div>
              <div className="progress-track application-progress" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: `${submitting ? 100 : ((step - 1) / total) * 100}%` }}
                />
              </div>
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
              <div className="application-step restraint" aria-hidden="true">
                {applicationCopy.stepLabel ?? 'Step'} {step} / {total}
              </div>
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
