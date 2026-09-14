/**
 * The last step of the application: name and email.
 *
 * Every applicant sees it, qualified or not, so nobody learns which answer
 * would decline them before they have finished. What happens to the details is
 * decided by the parent on submit: a qualified applicant becomes a lead (and a
 * deal) in Wayfinder OS; a declined applicant's details are discarded without
 * being sent anywhere.
 *
 * Copy is CMS-editable under sections.json → contactStep (/admin → Sections →
 * Contact details step), shared by every page.
 */
import { useState } from 'react'
import { applicationCopy, contactStepContent, submitConsent } from '../../config/sectionContent.js'
import { Typewriter } from './QuestionSlide.jsx'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isNameValid(contact) {
  return ((contact?.fullName) || '').trim().length >= 2
}

export function isEmailValid(contact) {
  return EMAIL_RE.test(((contact?.email) || '').trim())
}

export function isContactValid(contact) {
  return isNameValid(contact) && isEmailValid(contact)
}

export function ContactStep({ value, onChange, onSubmit, onBack, showBack, submitting, faded }) {
  const v = value || {}
  const copy = contactStepContent
  const [touched, setTouched] = useState({ fullName: false, email: false })
  // Set by a submit attempt: from then on every invalid field says so, even one
  // the applicant never focused.
  const [attempted, setAttempted] = useState(false)

  const nameValid = isNameValid(v)
  const emailValid = isEmailValid(v)
  const showNameError = !nameValid && (attempted || (touched.fullName && !!v.fullName))
  const showEmailError = !emailValid && (attempted || (touched.email && !!v.email))

  // A real <form>: Enter in either field submits, and phone keyboards show "Go".
  const handleSubmit = (e) => {
    e.preventDefault()
    if (submitting) return
    setAttempted(true)
    onSubmit()
  }

  return (
    <form
      className="qs"
      noValidate
      onSubmit={handleSubmit}
      style={{
        opacity: faded ? 0 : 1,
        transform: faded ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 320ms var(--ease-order), transform 320ms var(--ease-order)',
      }}
    >
      {copy.heading && (
        <h2 className="qs-question display tooled">
          <Typewriter text={copy.heading} speed={14} />
        </h2>
      )}

      {copy.subtitle && (
        <p className="qs-sub"><Typewriter text={copy.subtitle} speed={10} /></p>
      )}

      <div className="qs-contact">
        <label className="qs-field">
          <span className="qs-label">{copy.nameLabel}</span>
          <input
            className="input-field"
            type="text"
            name="name"
            autoComplete="name"
            value={v.fullName || ''}
            onChange={(e) => onChange({ fullName: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
            placeholder={copy.namePlaceholder}
            aria-invalid={showNameError || undefined}
            disabled={submitting}
            required
          />
          {showNameError && <span className="qs-error" role="alert">{copy.nameError}</span>}
        </label>

        <label className="qs-field">
          <span className="qs-label">{copy.emailLabel}</span>
          <input
            className="input-field"
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={v.email || ''}
            onChange={(e) => onChange({ email: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            placeholder={copy.emailPlaceholder}
            aria-invalid={showEmailError || undefined}
            disabled={submitting}
            required
          />
          {showEmailError && <span className="qs-error" role="alert">{copy.emailError}</span>}
        </label>

        {(submitConsent.privacyHref || submitConsent.termsHref) && (
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
        )}

        {/* Honeypot — bots fill every field, people never see this one. */}
        <div className="hp" aria-hidden="true">
          <label>
            Company
            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={v.company || ''}
              onChange={(e) => onChange({ company: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="qs-nav">
        {showBack ? (
          <button className="btn btn-ghost" onClick={() => onBack()} type="button" disabled={submitting}>
            {applicationCopy.backButton || '← Back'}
          </button>
        ) : (
          <span />
        )}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? (copy.submittingButton || 'Submitting…') : (copy.submitButton || 'Submit')}
        </button>
      </div>
    </form>
  )
}
