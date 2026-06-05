import { useInView } from '../../hooks/useInView.js'
import { faqContent } from '../../config/sectionContent.js'
import { CtaButton } from '../ui/CtaButton.jsx'

export function FAQSection() {
  const { ref, inView } = useInView()
  const questions = (faqContent.questions || '')
    .split('\n')
    .map((q) => q.trim())
    .filter(Boolean)
  return (
    <section className="section section-faq" ref={ref}>
      <div className="shell-narrow">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {faqContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading">{faqContent.heading}</h2>
          <div className="section-divider" style={{ margin: '2rem auto 3rem' }} />
        </div>

        <ol className={'serious-questions stagger ' + (inView ? 'in-view' : '')}>
          {questions.map((q, i) => (
            <li key={i} className="serious-question">
              <span className="sq-num display engraved">{String(i + 1).padStart(2, '0')}</span>
              <span className="sq-text display">{q}</span>
            </li>
          ))}
        </ol>

        <CtaButton location="afterQuestions" className={'reveal ' + (inView ? 'in-view' : '')} />
      </div>
    </section>
  )
}
