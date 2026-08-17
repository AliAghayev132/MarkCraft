// ── @shared ────────────────────────────────────────────────────────────────
import { base64Bytes, COMPRESSED_TYPE, fitWithin, type Rect, type Size } from '@shared'

export interface ProcessOptions {
  /** In source pixels; null keeps the whole image. */
  crop: Rect | null
  /** 0 means no bound. */
  maxWidth: number
  compress: boolean
  /** 0–1, only meaningful when compressing. */
  quality: number
}

export interface Processed {
  /** A full data URL, ready to preview or to strip and write. */
  dataUrl: string
  width: number
  height: number
  bytes: number
}

/**
 * Crops, resizes and compresses in one pass through a canvas.
 *
 * One pass on purpose: cropping and then resizing through two canvases would
 * resample the pixels twice and visibly soften the result — `drawImage` takes
 * both rectangles, so the browser does it once at full quality.
 */
export async function processImage(
  source: HTMLImageElement,
  { crop, maxWidth, compress, quality }: ProcessOptions
): Promise<Processed> {
  const natural: Size = { width: source.naturalWidth, height: source.naturalHeight }
  const region: Rect = crop ?? { x: 0, y: 0, ...natural }
  const target = fitWithin({ width: region.width, height: region.height }, maxWidth)

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')

  context.imageSmoothingQuality = 'high'
  context.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    target.width,
    target.height
  )

  /*
   * PNG ignores the quality argument, so an uncompressed export is lossless
   * regardless of where the slider sits — the slider is disabled in that case
   * rather than left to look as though it does something.
   */
  const dataUrl = compress
    ? canvas.toDataURL(COMPRESSED_TYPE, quality)
    : canvas.toDataURL('image/png')

  return { dataUrl, width: target.width, height: target.height, bytes: base64Bytes(dataUrl) }
}

/** Loads a data URL into an image element, resolved once it can be drawn. */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The file could not be read as an image'))
    image.src = dataUrl
  })
}

/** The payload half of a data URL, which is what the write channel wants. */
export function stripDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
}
