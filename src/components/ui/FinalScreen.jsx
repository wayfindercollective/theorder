import { useEffect, useState } from 'react'
import { finalScreenContent } from '../../config/sectionContent.js'
import { Sigil } from './Sigil.jsx'

export function FinalScreen() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 350)
    const t2 = setTimeout(() => setStage(2), 1100)
    const t3 = setTimeout(() => setStage(3), 1900)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div className="final-screen">
      <div className={'final-mark' + (stage >= 1 ? ' in' : '')}>
        <Sigil size={96} variant="full" />
      </div>
      <h2 className={'final-heading display' + (stage >= 2 ? ' in' : '')}>
        {finalScreenContent.heading}
      </h2>
      <p className={'final-sub' + (stage >= 2 ? ' in' : '')}>
        {finalScreenContent.sub}
      </p>
      <div className="section-divider" style={{ marginTop: '3rem', marginBottom: '3rem' }} />
      <p className={'final-begin' + (stage >= 3 ? ' in' : '')}>
        {finalScreenContent.begin}
      </p>
    </div>
  )
}
