/**
 * Reusable download menu for both the editor toolbar and presentation cards.
 * It mounts a fixed-size, present-mode copy of the selected deck only while a
 * PowerPoint is being generated, so controls and empty editor boxes stay out
 * of the exported slides.
 */
import { useRef, useState } from 'react'
import { humanizeError } from './presentationsApi.js'
import { downloadDeckBackup, exportDeckToPowerPoint } from './exportPresentation.js'
import { PresHero } from './PresHero.jsx'
import { Slide } from './Slide.jsx'

export function PresentationDownload({ deck, onError, onBusyChange, disabled = false, buttonClassName = 'pres-btn' }) {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(null)
  const exportRef = useRef(null)
  const detailsRef = useRef(null)

  const closeMenu = () => detailsRef.current?.removeAttribute('open')

  const downloadBackup = () => {
    if (disabled || exporting) return
    closeMenu()
    onError?.('')
    try {
      downloadDeckBackup(deck)
    } catch (e) {
      onError?.(`Backup download failed: ${humanizeError(e)}`)
    }
  }

  const downloadPowerPoint = async () => {
    if (disabled || exporting) return
    closeMenu()
    setExporting(true)
    setProgress(null)
    onBusyChange?.(true)
    onError?.('')

    // The hidden stages mount with `exporting`. Give React and the browser two
    // frames to commit and lay them out before snapshotting them.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    try {
      const stages = [...(exportRef.current?.querySelectorAll('.pres-stage') || [])]
      await exportDeckToPowerPoint({ deck, stages, onProgress: setProgress })
    } catch (e) {
      onError?.(`PowerPoint export failed: ${humanizeError(e)}`)
    } finally {
      setExporting(false)
      setProgress(null)
      onBusyChange?.(false)
    }
  }

  const label = exporting
    ? progress
      ? `Exporting ${progress.current}/${progress.total}`
      : 'Preparing…'
    : 'Download'
  const unavailable = disabled || exporting
  const slides = deck?.slides || []

  return (
    <>
      <details className="pres-download" ref={detailsRef}>
        <summary
          className={buttonClassName}
          aria-disabled={unavailable}
          aria-label={`Download ${deck?.title || 'presentation'}`}
          onClick={unavailable ? (e) => e.preventDefault() : undefined}
        >
          {label}
        </summary>
        <div className="pres-download-menu">
          <button type="button" onClick={downloadPowerPoint} disabled={unavailable}>
            <strong>PowerPoint (.pptx)</strong>
            <span>Opens in PowerPoint or Google Slides</span>
          </button>
          <button type="button" onClick={downloadBackup} disabled={unavailable}>
            <strong>Source backup (.json)</strong>
            <span>Keeps the editable presentation data</span>
          </button>
        </div>
      </details>

      {exporting && (
        <div className="pres-export-render" ref={exportRef} aria-hidden="true">
          <PresHero />
          {slides.map((slide, i) => (
            <Slide key={slide.id} slide={slide} index={i} total={slides.length} present />
          ))}
        </div>
      )}
    </>
  )
}
