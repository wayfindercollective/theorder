import { useInView } from '../../hooks/useInView.js'
import { closingContent, ctaContent } from '../../config/sectionContent.js'
import { Sigil } from '../ui/Sigil.jsx'
import { useScrollToForm } from '../../hooks/useScrollToForm.js'

export function ClosingSection() {
  const { ref, inView } = useInView()
  const scrollToForm = useScrollToForm('application')
  const verses = closingContent.verses || []
  return (
    <section className="section section-closing" ref={ref}>
      <div className="shell-narrow closing-inner">
        <div className={'reveal closing-head ' + (inView ? 'in-view' : '')}>
          <Sigil size={72} variant="full" className="closing-sigil" />
          {closingContent.wordmark && (
            <h2 className="display tooled closing-wordmark">{closingContent.wordmark}</h2>
          )}
          <div className="section-divider" style={{ margin: '2.5rem auto' }} />
        </div>

        <div className={'closing-verses stagger ' + (inView ? 'in-view' : '')}>
          {verses.map((v, i) => (
            <blockquote key={i} className="closing-verse">
              <p className="closing-verse-text display">{v.text}</p>
              <cite className="closing-ref">{v.ref}</cite>
            </blockquote>
          ))}
        </div>

        <div className={'closing-cta reveal ' + (inView ? 'in-view' : '')}>
          <button
            className="btn btn-primary"
            onClick={() => scrollToForm('closing')}
            type="button"
          >
            {ctaContent.label}
          </button>
        </div>
      </div>
    </section>
  )
}
