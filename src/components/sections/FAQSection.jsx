import { useState } from 'react'
import { useInView } from '../../hooks/useInView.js'
import { faqContent } from '../../config/sectionContent.js'
import { mdInline } from '../../lib/markdown.js'

export function FAQSection() {
  const { ref, inView } = useInView()
  const [open, setOpen] = useState(-1)
  return (
    <section className="section section-faq" ref={ref}>
      {faqContent.image && (
        <div
          className={`section-side-image section-side-image-${faqContent.imageAlign || 'left'}`}
          style={{ backgroundImage: `url(${faqContent.image})` }}
          aria-hidden="true"
        />
      )}
      <div className="shell-narrow">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {faqContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading">{faqContent.heading}</h2>
          <div className="section-divider" style={{ margin: '2rem auto 3rem' }} />
        </div>

        <ul className={'faq-list stagger ' + (inView ? 'in-view' : '')}>
          {faqContent.items.map((item, i) => {
            const isOpen = open === i
            return (
              <li key={i} className={'faq-item' + (isOpen ? ' open' : '')}>
                <button
                  className="faq-q"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  type="button"
                  aria-expanded={isOpen}
                >
                  <span className="faq-num display">{String(i + 1).padStart(2, '0')}</span>
                  <span className="faq-q-text display">{item.q}</span>
                  <span className="faq-caret" aria-hidden="true">{isOpen ? '–' : '+'}</span>
                </button>
                <div className="faq-a">
                  <p dangerouslySetInnerHTML={mdInline(item.a)} />
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
