/**
 * Portable presentation downloads.
 *
 * The PowerPoint export deliberately places one high-resolution snapshot on
 * each 16:9 slide. That keeps the website's masks, image grades, custom fonts,
 * rich text, and freely positioned elements intact in both PowerPoint and
 * Google Slides. The JSON download is the unflattened source backup.
 */

const STAGE_WIDTH = 1280
const STAGE_HEIGHT = 720
const PPTX_WIDTH = 13.333
const PPTX_HEIGHT = 7.5

function safeBaseName(title) {
  const clean = String(title || 'Untitled Presentation')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 100)
  return clean || 'Untitled Presentation'
}

function fileName(deck, extension) {
  return `${safeBaseName(deck?.title)}.${extension}`
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadDeckBackup(deck) {
  const json = JSON.stringify(deck, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8' }), fileName(deck, 'json'))
}

function waitForImage(image) {
  if (image.complete) {
    return image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(new Error(`Could not load image: ${image.currentSrc || image.src}`))
  }

  return new Promise((resolve, reject) => {
    const done = () => {
      image.removeEventListener('load', loaded)
      image.removeEventListener('error', failed)
    }
    const loaded = () => { done(); resolve() }
    const failed = () => {
      done()
      reject(new Error(`Could not load image: ${image.currentSrc || image.src}`))
    }
    image.addEventListener('load', loaded, { once: true })
    image.addEventListener('error', failed, { once: true })
  })
}

async function waitForAssets(stages) {
  if (document.fonts?.ready) await document.fonts.ready
  const images = stages.flatMap((stage) => [...stage.querySelectorAll('img')])
  await Promise.all(images.map(waitForImage))
}

/**
 * Capture the supplied present-mode DOM stages and download a self-contained
 * .pptx. `onProgress` receives { current, total } after each captured slide.
 */
export async function exportDeckToPowerPoint({ deck, stages, onProgress }) {
  const expected = (deck?.slides?.length || 0) + 1
  if (!Array.isArray(stages) || stages.length !== expected) {
    throw new Error('The slides were not ready to export. Please try again.')
  }

  await waitForAssets(stages)

  // Keep these heavy libraries out of the editor chunk until Nico actually
  // asks for a download.
  const [{ default: PptxGenJS }, htmlToImage] = await Promise.all([
    import('pptxgenjs'),
    import('html-to-image'),
  ])

  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'The Order'
  pptx.company = 'The Order'
  pptx.subject = 'Presentation exported from The Order presentation builder'
  pptx.title = deck.title || 'Untitled Presentation'

  // Font discovery is expensive. Resolve the shared font CSS once, then reuse
  // it for every stage capture.
  let fontEmbedCSS
  try {
    fontEmbedCSS = await htmlToImage.getFontEmbedCSS(stages[0], { preferredFontFormat: 'woff2' })
  } catch {
    // A browser may block font embedding while still being able to capture the
    // slide with its fallback fonts, so let the export continue.
    fontEmbedCSS = ''
  }

  for (let i = 0; i < stages.length; i += 1) {
    const data = await htmlToImage.toJpeg(stages[i], {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
      canvasWidth: STAGE_WIDTH * 2,
      canvasHeight: STAGE_HEIGHT * 2,
      pixelRatio: 1,
      quality: 0.94,
      backgroundColor: '#080604',
      preferredFontFormat: 'woff2',
      fontEmbedCSS,
      includeQueryParams: true,
    })

    const slide = pptx.addSlide()
    slide.background = { color: '080604' }
    slide.addImage({ data, x: 0, y: 0, w: PPTX_WIDTH, h: PPTX_HEIGHT })
    onProgress?.({ current: i + 1, total: stages.length })
  }

  await pptx.writeFile({ fileName: fileName(deck, 'pptx'), compression: true })
}
