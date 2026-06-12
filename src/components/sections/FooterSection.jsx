import { footerContent, brandContent } from '../../config/sectionContent.js'

export function FooterSection() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <a href="#top" className="footer-mark" aria-label={brandContent?.wordmark || 'The Order'}>
          <img className="logo-mark footer-logo" src={brandContent?.logo || '/images/logo-mark.png'} alt="" />
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
        {(footerContent.privacyLabel ?? 'Privacy') && (
          <a
            className="restraint footer-privacy"
            href={footerContent.privacyHref}
            target="_blank"
            rel="noopener noreferrer"
          >{footerContent.privacyLabel ?? 'Privacy'}</a>
        )}
      </div>
    </footer>
  )
}
