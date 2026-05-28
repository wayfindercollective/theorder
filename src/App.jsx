import { useEffect } from 'react'
import { Header } from './components/sections/Header.jsx'
import { Hero } from './components/sections/Hero.jsx'
import { TheTruthSection } from './components/sections/TheTruthSection.jsx'
import { TheCodeSection } from './components/sections/TheCodeSection.jsx'
import { WhatYouBecomeSection } from './components/sections/WhatYouBecomeSection.jsx'
import { WhoIsConsideredSection } from './components/sections/WhoIsConsideredSection.jsx'
import { ApplicationSection } from './components/sections/ApplicationSection.jsx'
import { FounderSection } from './components/sections/FounderSection.jsx'
// import { EvidenceSection } from './components/sections/EvidenceSection.jsx' // hidden until testimonies exist — see flag below
import { FAQSection } from './components/sections/FAQSection.jsx'
import { FooterSection } from './components/sections/FooterSection.jsx'
import { usePendingLeadsSync } from './hooks/usePendingLeadsSync.js'
import { captureUTMs } from './lib/utm.js'
import { bootAnalytics, track } from './lib/analytics.js'

export default function App() {
  usePendingLeadsSync()

  useEffect(() => {
    // start at top, ignore browser scroll restoration
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
      <main>
        <Hero />
        <TheTruthSection />
        <TheCodeSection />
        <WhatYouBecomeSection />
        <WhoIsConsideredSection />
        <ApplicationSection />
        <FounderSection />
        {/* Testimonies hidden until first cohort completes — re-enable: import + <EvidenceSection /> */}
        <FAQSection />
      </main>
      <FooterSection />
    </>
  )
}
