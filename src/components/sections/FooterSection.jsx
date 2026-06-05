import { footerContent } from '../../config/sectionContent.js'
import { Sigil } from '../ui/Sigil.jsx'

export function FooterSection() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <a href="#top" className="footer-mark" aria-label="The Order">
          <Sigil size={26} variant="full" />
        </a>

        {footerContent.email && (
          <a className="footer-contact-link display" href={`mailto:${footerContent.email}`}>
            {footerContent.email}
          </a>
        )}
        {footerContent.phone && (
          <a
            className="footer-contact-link display"
            href={`tel:${footerContent.phone.replace(/[^+\d]/g, '')}`}
          >
            {footerContent.phone}
          </a>
        )}

        <span className="restraint footer-copyright">{footerContent.copyright}</span>
        <a
          className="restraint footer-privacy"
          href={footerContent.privacyHref}
          target="_blank"
          rel="noopener noreferrer"
        >Privacy</a>
      </div>
    </footer>
  )
}
