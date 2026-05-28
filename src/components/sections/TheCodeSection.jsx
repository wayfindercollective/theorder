import { useInView } from '../../hooks/useInView.js'
import { codeContent } from '../../config/sectionContent.js'

export function TheCodeSection() {
  const { ref, inView } = useInView({ threshold: 0.25 })
  return (
    <section className="section section-code" ref={ref}>
      <div className="code-bg" aria-hidden="true" />
      {codeContent.image && (
        <div
          className={`section-side-image section-side-image-${codeContent.imageAlign || 'left'}`}
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
          <p className="code-intro restraint">{codeContent.intro}</p>
          <div className="section-divider" style={{ margin: '2.5rem auto' }} />
        </div>

        <ol className={'code-list stagger ' + (inView ? 'in-view' : '')}>
          {codeContent.principles.map((p) => (
            <li key={p.roman} className="code-principle">
              <span className="code-roman display engraved">{p.roman}</span>
              <span className="code-text display tooled">{p.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
