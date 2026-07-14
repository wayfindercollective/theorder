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
        {footerContent.instagram && (
          <a
            className="footer-social"
            href={footerContent.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="The Order on Instagram"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2.5" y="2.5" width="19" height="19" rx="5.2" />
              <circle cx="12" cy="12" r="4.4" />
              <circle cx="17.4" cy="6.6" r="0.4" fill="currentColor" stroke="none" />
            </svg>
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
