// ── @shared ────────────────────────────────────────────────────────────────
import {
  canvasBounds,
  canvasToSvg,
  isCanvasColor,
  stem,
  type CanvasData,
  type SvgTheme
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { dialogService, fileService, toast } from '@services'

/** What the file is asked to be. */
export type CanvasImageFormat = 'svg' | 'png'

/*
 * Twice the size on screen. A canvas is mostly text, and a picture of text at
 * one-to-one is unreadable the moment anybody zooms into it — which is the
 * first thing everybody does with a diagram.
 */
const PNG_SCALE = 2

/*
 * A guard against a canvas somebody has spent a year on. Beyond this the
 * browser refuses to rasterise and returns a blank image, which would be worse
 * than saying so.
 */
const MAX_PIXELS = 16_000

/**
 * The colours the export cannot work out for itself.
 *
 * Read from the running window, once, so the picture matches the theme the
 * person is looking at. Custom properties do not survive leaving the
 * application: `var(--mc-canvas-3)` in a file is grey everywhere else.
 */
function readTheme(): SvgTheme {
  const styles = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string): string =>
    styles.getPropertyValue(name).trim() || fallback

  return {
    background: read('--mc-bg-sunken', '#ffffff'),
    card: read('--mc-bg-raised', '#f6f7f9'),
    line: read('--mc-line', '#e3e6ec'),
    ink: read('--mc-ink', '#1b1f27'),
    muted: read('--mc-ink-tertiary', '#5b6472'),
    colour: (color) => {
      if (!isCanvasColor(color)) return null
      // A hex was written by hand and means that exact colour; a slot is a
      // preset, and only the running window knows what it resolves to.
      if (color.startsWith('#')) return color
      return read(`--mc-canvas-${color}`, '') || null
    }
  }
}

/**
 * Turns the SVG into a PNG, in the window that drew it.
 *
 * Through an `Image` and a `<canvas>` rather than a library: the renderer
 * already has a complete SVG engine in it, and the alternative is a dependency
 * that reimplements one badly (§12).
 */
async function rasterise(svg: string, width: number, height: number): Promise<string> {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('the picture could not be drawn'))
      image.src = url
    })

    const surface = document.createElement('canvas')
    surface.width = Math.max(1, Math.round(width))
    surface.height = Math.max(1, Math.round(height))

    const context = surface.getContext('2d')
    if (!context) throw new Error('no drawing surface')
    context.drawImage(image, 0, 0, surface.width, surface.height)

    // The prefix is what a data URL needs and what a file must not have.
    return surface.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Saves the canvas as a picture, asking where to put it.
 *
 * SVG and PNG rather than PDF: a canvas has no pages, and cutting an infinite
 * surface into A4 is a decision that belongs to whoever is printing it, not to
 * the editor. An SVG opens in every browser and drops into every document.
 */
export async function exportCanvasImage(
  canvas: CanvasData,
  path: string,
  format: CanvasImageFormat
): Promise<boolean> {
  if (canvas.nodes.length === 0) {
    toast.info(t('canvas.exportEmpty'))
    return false
  }

  const name = `${stem(path)}.${format}`
  const target = await dialogService.saveFile(name, [format])
  if (!target) return false

  try {
    const svg = canvasToSvg(canvas, { theme: readTheme() })

    if (format === 'svg') {
      await fileService.write({ path: target, content: svg, eol: 'lf' })
    } else {
      const bounds = canvasBounds(canvas.nodes)
      const width = (bounds.width + 120) * PNG_SCALE
      const height = (bounds.height + 120) * PNG_SCALE

      if (width > MAX_PIXELS || height > MAX_PIXELS) {
        toast.warning(t('canvas.exportTooBig'), t('canvas.exportTooBigHint'))
        return false
      }

      await fileService.writeBinary(target, await rasterise(svg, width, height), true)
    }

    toast.success(t('canvas.exported', { name: target }))
    return true
  } catch (error) {
    toast.error(t('canvas.exportFailed'), error instanceof Error ? error.message : String(error))
    return false
  }
}
