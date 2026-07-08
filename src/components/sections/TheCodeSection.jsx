import { useInView } from '../../hooks/useInView.js'
import { codeContent } from '../../config/sectionContent.js'
import { renderRich } from '../../lib/richtext.js'
import { sectionAlign } from '../../config/design.js'
import { CtaButton } from '../ui/CtaButton.jsx'
import { bgImage } from '../../lib/img.js'

// "Who We Are" — heading + manifesto prose, round-table image behind it.
// The Principles wall lives in its own section (PrinciplesSection).
export function TheCodeSection() {
  const { ref, inView } = useInView({ threshold: 0.2 })
  const align = sectionAlign('code', codeContent.imageAlign)
  const splitClass = align !== 'full' ? ` design-split img-${align}` : ''
  return (
    <section className={'section section-code' + splitClass} ref={ref}>
      <div className="code-bg" aria-hidden="true" />
      {codeContent.image && (
        <div
          className={align === 'full'
            ? 'section-bg-image'
            : `section-side-image section-side-image-${align}`}
          style={{ backgroundImage: bgImage(codeContent.image) }}
          aria-hidden="true"
        />
      )}
      <div className="shell-narrow code-inner">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {codeContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading" dangerouslySetInnerHTML={renderRich(codeContent.heading)} />
          <div className="section-divider" style={{ margin: '1.8rem auto 2.2rem' }} />
          {codeContent.intro && (
            <div className="values-intro" dangerouslySetInnerHTML={renderRich(codeContent.intro)} />
          )}
          <CtaButton location="afterWhoWeAre" className={'reveal ' + (inView ? 'in-view' : '')} />
        </div>
      </div>
    </section>
  )
}
