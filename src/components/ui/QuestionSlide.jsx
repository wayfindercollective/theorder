/**
 * One question in the application — multiple choice only.
 *
 * There is deliberately no contact step and no submit button. Answers are
 * evaluated locally to choose a result screen, then discarded without being
 * sent to Wayfinder OS.
 */

import { useEffect, useState } from 'react'
import { applicationCopy } from '../../config/sectionContent.js'

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
  value,
  onChange,
  onAdvance,
  onBack,
  faded,
  letters = ['A', 'B', 'C', 'D', 'E', 'F'],
}) {
  const handleChoice = (val) => {
    const patch = { [question.id]: val }
    onChange(patch)
    // The patch rides along: this fires from a stale closure 320ms later, so
    // the parent cannot read the answer out of its own state yet.
    setTimeout(() => onAdvance(patch), 320)
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

      <div className="qs-nav">
        {step > 1 && (
          <button
            className="btn btn-ghost"
            onClick={() => onBack()}
            type="button"
          >
            {applicationCopy.backButton || '← Back'}
          </button>
        )}
      </div>
    </div>
  )
}
