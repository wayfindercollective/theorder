import { useInView } from '../../hooks/useInView.js'
import { codeContent, principlesContent } from '../../config/sectionContent.js'
import { SectionPainting } from '../ui/SectionPainting.jsx'

// The Principles — the values wall, on a clean dark ground (no image),
// split out of "Who We Are" so each fits one screen.
export function PrinciplesSection() {
  const { ref, inView } = useInView({ threshold: 0.1 })
  const values = (codeContent.values || '')
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
  return (
    <section className="section section-principles" ref={ref}>
      <SectionPainting image={principlesContent.image} />
      <div className="shell">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          {principlesContent.eyebrow && (
            <div className="eyebrow eyebrow--numeral">
              <span className="brass-rule" /> {principlesContent.eyebrow} <span className="brass-rule" />
            </div>
          )}
          <div className="eyebrow">
            <span className="brass-rule" /> {codeContent.valuesLabel} <span className="brass-rule" />
          </div>
          <div className="section-divider" style={{ margin: '1.1rem auto 0' }} />
        </div>

        <ul className={'values-wall reveal ' + (inView ? 'in-view' : '')}>
          {values.map((v, i) => (
            <li key={i} className="value-word display engraved">{v}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
