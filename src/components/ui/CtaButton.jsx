import { ctaContent } from '../../config/sectionContent.js'
import { useScrollToForm } from '../../hooks/useScrollToForm.js'

/**
 * Inline "Come this way" button — sits at the foot of a content section
 * (over whatever background that section already has) and scrolls to the form.
 */
export function CtaButton({ location = 'cta', className = '' }) {
  const scrollToForm = useScrollToForm('application')
  return (
    <div className={('cta-inline ' + className).trim()}>
      <button
        className="btn btn-primary"
        onClick={() => scrollToForm(location)}
        type="button"
      >
        {ctaContent.label}
      </button>
    </div>
  )
}
