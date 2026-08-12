import { useInView } from '../../hooks/useInView.js'
import { becomeContent } from '../../config/sectionContent.js'
import { CtaButton } from '../ui/CtaButton.jsx'
import { SectionPainting } from '../ui/SectionPainting.jsx'
import { sectionAlign } from '../../config/design.js'
import { renderRich } from '../../lib/richtext.js'

// An offering line is either a bare label ("Brotherhood") or a label followed by
// an explanation ("Brotherhood -- community of like minded…"). Split on the
// FIRST double-dash only, so a description containing another dash stays whole.
// Single hyphens are left alone — "well-rounded" is not a separator.
function parseOffering(line) {
  const m = line.match(/^(.*?)\s*(?:--|—|–)\s*(.+)$/)
  return m ? { term: m[1].trim(), desc: m[2].trim() } : { term: line, desc: '' }
}

export function WhatYouBecomeSection() {
  const { ref, inView } = useInView()
  const align = sectionAlign('become', becomeContent.imageAlign)
  const splitClass = align !== 'full' ? ` design-split img-${align}` : ''
  const offerings = (becomeContent.offerings || '')
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean)
    .map(parseOffering)
  // Two quite different lists share this field. A list of bare labels keeps the
  // original two-column centred form it was designed for; once any line carries
  // an explanation the whole block switches to term-over-description, which
  // needs a single column and left alignment to be readable at all.
  const defined = offerings.some((o) => o.desc)
  return (
    <section className={'section section-become' + splitClass} ref={ref}>
      <SectionPainting image={becomeContent.image} align={align} />
      <div className="shell">
        <div className={'reveal become-head ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {becomeContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading become-heading" dangerouslySetInnerHTML={renderRich(becomeContent.heading)} />
          <div className="section-divider" style={{ margin: '1.5rem auto 2rem' }} />
        </div>

        <ul
          className={
            'offerings-grid stagger ' +
            (defined ? 'offerings-grid--defined ' : '') +
            (inView ? 'in-view' : '')
          }
          /* Both are editable in /admin so the size can be tuned to whatever
             copy is in the field, without a code change. */
          data-size={becomeContent.offeringsSize || 'medium'}
          data-columns={becomeContent.offeringsColumns || '1'}
        >
          {offerings.map((o, i) => (
            <li key={i} className="offering">
              <span className="offering-term display tooled">{o.term}</span>
              {o.desc && <span className="offering-desc">{o.desc}</span>}
            </li>
          ))}
        </ul>

        {becomeContent.closing && (
          <p className={'offering-closing display reveal ' + (inView ? 'in-view' : '')} dangerouslySetInnerHTML={renderRich(becomeContent.closing)} />
        )}

        <CtaButton location="afterOfferings" className={'reveal ' + (inView ? 'in-view' : '')} />
      </div>
    </section>
  )
}
