import { useInView } from '../../hooks/useInView.js'
import { codeContent } from '../../config/sectionContent.js'
import { mdHtml } from '../../lib/markdown.js'

// "Who We Are" — heading + manifesto prose, round-table image behind it.
// The Principles wall lives in its own section (PrinciplesSection).
export function TheCodeSection() {
  const { ref, inView } = useInView({ threshold: 0.2 })
  return (
    <section className="section section-code" ref={ref}>
      <div className="code-bg" aria-hidden="true" />
      {codeContent.image && (
        <div
          className={codeContent.imageAlign === 'full'
            ? 'section-bg-image'
            : `section-side-image section-side-image-${codeContent.imageAlign || 'right'}`}
          style={{ backgroundImage: `url(${codeContent.image})` }}
          aria-hidden="true"
        />
      )}
      <div className="shell-narrow code-inner">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {codeContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading">{codeContent.heading}</h2>
          <div className="section-divider" style={{ margin: '1.8rem auto 2.2rem' }} />
          {codeContent.intro && (
            <div className="values-intro" dangerouslySetInnerHTML={mdHtml(codeContent.intro)} />
          )}
        </div>
      </div>
    </section>
  )
}
