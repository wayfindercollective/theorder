/**
 * Polymorphic question component — choice / contact variants.
 * Open text was originally on the menu, but the application is choice-led
 * by design now (less friction). Open-text branch left for future use.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { countryCodes } from '../../config/countryCodes.js'
import { submitConsent, formCopy, applicationCopy } from '../../config/sectionContent.js'

function Typewriter({ text, speed = 12 }) {
  const [out, setOut] = useState('')
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setOut(text); return }
    setOut('')
    let i = 0
    const id = setInterval(() => {
      i++
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return <span>{out}</span>
}

export function QuestionSlide({
  question,
  step,
  total,
  value,
  onChange,
  onAdvance,
  onBack,
  canAdvance,
  faded,
  onSubmit,
  submitting,
  letters = ['A', 'B', 'C', 'D', 'E', 'F'],
}) {
  const handleChoice = (val) => {
    onChange({ [question.id]: val })
    setTimeout(() => onAdvance(), 320)
  }

  return (
    <div
      className="qs"
      style={{
        opacity: faded ? 0 : 1,
        transform: faded ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 320ms var(--ease-order), transform 320ms var(--ease-order)',
      }}
    >
      <h2 className="qs-question display tooled">
        <Typewriter text={question.question} speed={14} />
      </h2>

      {question.subtitle && (
        <p className="qs-sub"><Typewriter text={question.subtitle} speed={10} /></p>
      )}

      {question.type === 'choice' && (
        <div className="qs-choices">
          {(question.options || []).map((opt, i) => (
            <button
              key={i}
              className={'choice' + (value === opt.value ? ' selected' : '')}
              onClick={() => handleChoice(opt.value)}
              type="button"
            >
              <span className="choice-badge">{letters[i] || String(i + 1)}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {question.type === 'contact' && (
        <ContactFields
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          submitting={submitting}
          canAdvance={canAdvance}
        />
      )}

      <div className="qs-nav">
        {step > 1 && (
          <button
            className="btn btn-ghost"
            onClick={() => onBack()}
            type="button"
            disabled={submitting}
          >
            ← Back
          </button>
        )}
        {question.type === 'contact' && (
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={!canAdvance || submitting}
            type="button"
          >
            {submitting ? applicationCopy.submittingButton : applicationCopy.submitButton}
          </button>
        )}
      </div>
    </div>
  )
}

function ContactFields({ value, onChange, onSubmit, submitting, canAdvance }) {
  const v = value || {}
  const [emailTouched, setEmailTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  const [countryFilter, setCountryFilter] = useState('')

  const sortedCountries = useMemo(() => {
    const pinned = countryCodes.filter((c) => c.pinned)
    const rest = countryCodes.filter((c) => !c.pinned).sort((a, b) => a.name.localeCompare(b.name))
    return [...pinned, ...rest]
  }, [])

  const country = v.country || countryCodes[0]
  const filtered = countryFilter
    ? sortedCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(countryFilter.toLowerCase()) ||
          c.dial.includes(countryFilter)
      )
    : sortedCountries

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email || '')
  const phoneDigits = (v.phone || '').replace(/\D/g, '')
  const phoneValid = phoneDigits.length >= Math.min(7, country.maxDigits || 7)
  const nameValid = (v.fullName || '').trim().length >= 2
  const consent = !!v.smsConsent

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      if (canAdvance) onSubmit()
    }
  }

  return (
    <div className="qs-contact" onKeyDown={onKeyDown}>
      <label className="qs-field">
        <span className="qs-label">{formCopy.nameLabel}</span>
        <input
          className="input-field"
          type="text"
          autoComplete="name"
          value={v.fullName || ''}
          onChange={(e) => onChange({ fullName: e.target.value })}
          placeholder={formCopy.namePlaceholder}
          required
        />
      </label>

      <label className="qs-field">
        <span className="qs-label">{formCopy.emailLabel}</span>
        <input
          className="input-field"
          type="email"
          autoComplete="email"
          value={v.email || ''}
          onChange={(e) => onChange({ email: e.target.value })}
          onBlur={() => setEmailTouched(true)}
          placeholder={formCopy.emailPlaceholder}
          required
        />
        {emailTouched && !emailValid && v.email && (
          <span className="qs-error">{formCopy.emailError}</span>
        )}
      </label>

      <div className="qs-field">
        <span className="qs-label">{formCopy.phoneLabel}</span>
        <div className="phone-row">
          <button
            type="button"
            className="phone-cc"
            onClick={() => setCountryOpen((o) => !o)}
          >
            <span className="phone-cc-flag">{country.code}</span>
            <span className="phone-cc-dial">{country.dial}</span>
            <span className="phone-cc-caret">▾</span>
          </button>
          <input
            className="input-field phone-input"
            type="tel"
            autoComplete="tel"
            value={v.phone || ''}
            onChange={(e) => onChange({ phone: e.target.value.replace(/[^\d\s()+-]/g, '') })}
            onBlur={() => setPhoneTouched(true)}
            placeholder={formCopy.phonePlaceholder}
            required
          />
        </div>
        {countryOpen && (
          <div className="phone-dropdown">
            <input
              className="input-field phone-search"
              type="text"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              placeholder="Search country or code…"
              autoFocus
            />
            <div className="phone-list">
              {filtered.map((c) => (
                <button
                  key={c.code + c.dial}
                  className="phone-option"
                  onClick={() => {
                    onChange({ country: c })
                    setCountryOpen(false)
                    setCountryFilter('')
                  }}
                  type="button"
                >
                  <span className="phone-option-code">{c.code}</span>
                  <span className="phone-option-name">{c.name}</span>
                  <span className="phone-option-dial">{c.dial}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {phoneTouched && !phoneValid && v.phone && (
          <span className="qs-error">{formCopy.phoneError}</span>
        )}
      </div>

      <label className="qs-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onChange({ smsConsent: e.target.checked })}
        />
        <span>{submitConsent.smsLine}</span>
      </label>

      {/* Honeypot — bots fill this, real users never see it */}
      <div className="hp" aria-hidden="true">
        <label>
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={v.company || ''}
            onChange={(e) => onChange({ company: e.target.value })}
          />
        </label>
      </div>
    </div>
  )
}
