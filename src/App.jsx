import { lazy, Suspense, useEffect } from 'react'
import { Header } from './components/sections/Header.jsx'
import { Hero } from './components/sections/Hero.jsx'
import { TheTruthSection } from './components/sections/TheTruthSection.jsx'
import { TheCodeSection } from './components/sections/TheCodeSection.jsx'
import { PrinciplesSection } from './components/sections/PrinciplesSection.jsx'
import { WhatYouBecomeSection } from './components/sections/WhatYouBecomeSection.jsx'
import { ApplicationSection } from './components/sections/ApplicationSection.jsx'
import { ApplicationGatePage } from './components/sections/ApplicationGatePage.jsx'
import { BookingPage } from './components/sections/BookingPage.jsx'
import { FounderSection } from './components/sections/FounderSection.jsx'
import { EvidenceSection } from './components/sections/EvidenceSection.jsx'
import { FAQSection } from './components/sections/FAQSection.jsx'
import { HowWeOperateSection } from './components/sections/HowWeOperateSection.jsx'
import { ClosingSection } from './components/sections/ClosingSection.jsx'
import { FooterSection } from './components/sections/FooterSection.jsx'
import { captureAttribution } from './lib/utm.js'
import { variantSlugFromPath } from './config/variantPages.js'
import { bootAnalytics, track } from './lib/analytics.js'
import { DESIGN_V2 } from './config/design.js'

// Lazy-load private tools so public visitors never download them.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
const PresentationsApp = lazy(() => import('./presentations/PresentationsApp.jsx'))

// Segment-boundary match: /admin and /admin/foo are the admin app, but a
// variant page like /admin-offer must NOT be (Nico names pages himself now).
function pathIsUnder(prefix) {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname
  return path === prefix || path.startsWith(prefix + '/')
}

function isAdminRoute() {
  return pathIsUnder('/admin')
}

function isPresentationsRoute() {
  return pathIsUnder('/presentations')
}

function privateApplicationRoute() {
  if (typeof window === 'undefined') return false
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/application' || path === '/booking') return 'gate'
  if (path === '/application/booking') return 'booking'
  return false
}

function AdminRoot() {
  return (
    <Suspense fallback={<div className="admin-loading"><p className="restraint">Loading editor...</p></div>}>
      <AdminApp />
    </Suspense>
  )
}

function PresentationsRoot() {
  return (
    <Suspense fallback={<div className="admin-loading"><p className="restraint">Loading presentations...</p></div>}>
      <PresentationsApp />
    </Suspense>
  )
}

function PublicSite() {
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    // Retire the old split-design preview URL. /2 and ?v=2 now collapse to /.
    const path = window.location.pathname.replace(/\/+$/, '')
    const params = new URLSearchParams(window.location.search)
    if (path === '/booking') {
      const query = params.toString()
      window.history.replaceState({}, '', '/application' + (query ? '?' + query : ''))
    } else if (path === '/2' || params.get('v') === '2') {
      params.delete('v')
      const query = params.toString()
      window.history.replaceState({}, '', '/' + (query ? '?' + query : ''))
    } else if (window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname + window.location.search)
    }
    window.scrollTo(0, 0)

    captureAttribution()

    const boot = () => {
      bootAnalytics()
      track('session_start', {
        url: window.location.href,
        referrer: document.referrer,
        viewport_w: window.innerWidth,
        viewport_h: window.innerHeight,
        // Derived fresh from the CURRENT pathname, never the first-touch
        // store — a visitor who saw /physical last week and /financial today
        // is labelled financial today. Blocked from Meta in analytics.js.
        landing_variant: variantSlugFromPath(window.location.pathname) || 'main',
      })
    }
    const requestIdle = window.requestIdleCallback
    const id = requestIdle ? requestIdle(boot, { timeout: 3000 }) : window.setTimeout(boot, 1200)
    return () => {
      if (requestIdle && window.cancelIdleCallback) window.cancelIdleCallback(id)
      else window.clearTimeout(id)
    }
  }, [])

  const applicationRoute = privateApplicationRoute()

  return (
    <>
      <Header />
      <main className={DESIGN_V2 ? 'design-v2' : undefined}>
        {applicationRoute === 'gate' ? (
          <ApplicationGatePage />
        ) : applicationRoute === 'booking' ? (
          <BookingPage />
        ) : (
          <>
            <Hero />
            <TheTruthSection />
            <TheCodeSection />
            <PrinciplesSection />
            <EvidenceSection />
            <FounderSection />
            <WhatYouBecomeSection />
            <FAQSection />
            <HowWeOperateSection />
            <ApplicationSection />
            <ClosingSection />
          </>
        )}
      </main>
      <FooterSection />
    </>
  )
}

export default function App() {
  if (isAdminRoute()) return <AdminRoot />
  if (isPresentationsRoute()) return <PresentationsRoot />
  return <PublicSite />
}
