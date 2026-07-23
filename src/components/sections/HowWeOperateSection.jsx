import { useInView } from '../../hooks/useInView.js'
import { howWeOperateContent } from '../../config/sectionContent.js'
import { renderRich, richText } from '../../lib/richtext.js'
import { SectionPainting } from '../ui/SectionPainting.jsx'
import { sectionAlign } from '../../config/design.js'

// The pull-quote drops in after this paragraph index (the "fuck yes" beat).
const PULLQUOTE_AFTER = 2

// A paragraph that OPENS with a bolded phrase ("AND YOU START HERE:") promotes
// that phrase to its own line at pull-quote size, leading into the rest of the
// paragraph. Mid-paragraph bold stays plain inline bold.
const LEADIN_RE = /^\s*<(strong|b)>([\s\S]*?)<\/\1>\s*/i

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
          <h2 className="display section-heading" dangerouslySetInnerHTML={renderRich(howWeOperateContent.heading)} />
          {/* Near-flush margins: this section carries the most copy on the page, so
              the divider is only a whisper between heading and body. */}
          <div className="section-divider" style={{ margin: '0.6rem auto 0.7rem' }} />
        </div>

        <div className={'how-body stagger ' + (inView ? 'in-view' : '')}>
          {paras.map((p, i) => {
            const m = String(p).match(LEADIN_RE)
            const lead = m && richText(m[2]) ? m[2] : null
            const body = lead ? String(p).slice(m[0].length) : p
            return (
              <div key={i} className="how-para-wrap">
                {lead ? (
                  <div className="how-leadin-group">
                    <p className="how-pullquote how-leadin display tooled" dangerouslySetInnerHTML={renderRich(lead)} />
                    <p className="how-para" dangerouslySetInnerHTML={renderRich(body)} />
                  </div>
                ) : (
                  <p className="how-para" dangerouslySetInnerHTML={renderRich(p)} />
                )}
                {howWeOperateContent.pullQuote && i === PULLQUOTE_AFTER && (
                  <p className="how-pullquote display tooled" dangerouslySetInnerHTML={renderRich(howWeOperateContent.pullQuote)} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
