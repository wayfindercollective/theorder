import { useInView } from '../../hooks/useInView.js'
import { howWeOperateContent } from '../../config/sectionContent.js'
import { mdInline } from '../../lib/markdown.js'
import { SectionPainting } from '../ui/SectionPainting.jsx'
import { sectionAlign } from '../../config/design.js'

// The pull-quote drops in after this paragraph index (the "fuck yes" beat).
const PULLQUOTE_AFTER = 2

export function HowWeOperateSection() {
  const { ref, inView } = useInView()
  const align = sectionAlign('howWeOperate', howWeOperateContent.imageAlign)
  const splitClass = align !== 'full' ? ` design-split img-${align}` : ''
  const paras = howWeOperateContent.paragraphs || []
  return (
    <section className={'section section-how' + splitClass} ref={ref}>
      <SectionPainting image={howWeOperateContent.image} align={align} />
      <div className="shell-narrow">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {howWeOperateContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading">{howWeOperateContent.heading}</h2>
          <div className="section-divider" style={{ margin: '2rem auto 3rem' }} />
        </div>

        <div className={'how-body stagger ' + (inView ? 'in-view' : '')}>
          {paras.map((p, i) => (
            <div key={i} className="how-para-wrap">
              <p className="how-para" dangerouslySetInnerHTML={mdInline(p)} />
              {howWeOperateContent.pullQuote && i === PULLQUOTE_AFTER && (
                <p className="how-pullquote display tooled">{howWeOperateContent.pullQuote}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
