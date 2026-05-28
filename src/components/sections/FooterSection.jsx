import { footerContent } from '../../config/sectionContent.js'
import { Sigil } from '../ui/Sigil.jsx'

export function FooterSection() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-mark">
          <Sigil size={48} variant="full" />
        </div>
        <p className="footer-restraint display">{footerContent.restraint}</p>
        <div className="section-divider" style={{ margin: '2.5rem auto' }} />
        <div className="footer-meta">
          <span className="restraint">{footerContent.copyright}</span>
          <a
            className="restraint"
            href={footerContent.privacyHref}
            target="_blank"
            rel="noopener noreferrer"
          >Privacy</a>
        </div>
      </div>
    </footer>
  )
}
