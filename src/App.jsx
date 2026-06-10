import { lazy, Suspense, useEffect } from 'react'
import { Header } from './components/sections/Header.jsx'
import { Hero } from './components/sections/Hero.jsx'
import { TheTruthSection } from './components/sections/TheTruthSection.jsx'
import { TheCodeSection } from './components/sections/TheCodeSection.jsx'
import { PrinciplesSection } from './components/sections/PrinciplesSection.jsx'
import { WhatYouBecomeSection } from './components/sections/WhatYouBecomeSection.jsx'
// import { WhoIsConsideredSection } from './components/sections/WhoIsConsideredSection.jsx' // hidden until copy exists
import { ApplicationSection } from './components/sections/ApplicationSection.jsx'
import { FounderSection } from './components/sections/FounderSection.jsx'
import { EvidenceSection } from './components/sections/EvidenceSection.jsx'
import { FAQSection } from './components/sections/FAQSection.jsx'
import { HowWeOperateSection } from './components/sections/HowWeOperateSection.jsx'
import { ClosingSection } from './components/sections/ClosingSection.jsx'
import { FooterSection } from './components/sections/FooterSection.jsx'
import { usePendingLeadsSync } from './hooks/usePendingLeadsSync.js'
import { PendingLeadsAdmin } from './components/ui/PendingLeadsAdmin.jsx'
import { captureUTMs } from './lib/utm.js'
import { bootAnalytics, track } from './lib/analytics.js'
import { DESIGN_V2 } from './config/design.js'

// Lazy-load admin so public visitors never download it.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

function isAdminRoute() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
}

function isPendingLeadsAdmin() {
  return typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('admin') === 'pending-leads'
}

function AdminRoot() {
  return (
    <Suspense fallback={<div className="admin-loading"><p className="restraint">Loading editor…</p></div>}>
      <AdminApp />
    </Suspense>
  )
}

function PublicSite() {
  usePendingLeadsSync()

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    if (window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname + window.location.search)
    }
    window.scrollTo(0, 0)

    captureUTMs()
    bootAnalytics()
    track('session_start', {
      url: window.location.href,
      referrer: document.referrer,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
    })
  }, [])

  return (
    <>
      <Header />
      <main className={DESIGN_V2 ? 'design-v2' : undefined}>
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
        {/* Who Is Considered hidden until copy exists — re-enable: import + <WhoIsConsideredSection /> */}
        <ClosingSection />
      </main>
      <FooterSection />
    </>
  )
}

export default function App() {
  if (isAdminRoute()) return <AdminRoot />
  if (isPendingLeadsAdmin()) return <PendingLeadsAdmin />
  return <PublicSite />
}
