/**
 * The arithmetic behind cropping and compressing an image.
 *
 * Separated from the canvas work so the parts that are easy to get subtly
 * wrong — a crop that runs off the edge, a drag that went right-to-left, a
 * resize that quietly enlarges — are testable without a DOM.
 *
 * Every rectangle here is in *source pixels*, not screen pixels. The preview is
 * scaled to fit a dialog, and mixing the two coordinate spaces is the one bug
 * that makes a crop tool cut the wrong part of the picture.
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

/** The rectangle between two drag points, however the user dragged it. */
export function rectFromDrag(startX: number, startY: number, endX: number, endY: number): Rect {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY)
  }
}

/** Pulls a rectangle back inside the image, keeping as much of it as fits. */
export function clampRect(rect: Rect, bounds: Size): Rect {
  const width = Math.min(Math.max(0, rect.width), bounds.width)
  const height = Math.min(Math.max(0, rect.height), bounds.height)

  return {
    x: Math.round(Math.min(Math.max(0, rect.x), bounds.width - width)),
    y: Math.round(Math.min(Math.max(0, rect.y), bounds.height - height)),
    width: Math.round(width),
    height: Math.round(height)
  }
}

/**
 * Scales an image down to fit a bound.
 *
 * Down only. A 400px logo asked to fit 1600px stays 400px — enlarging it would
 * cost bytes to add blur, which is the opposite of what this is for.
 */
export function fitWithin(source: Size, maxWidth: number): Size {
  if (maxWidth <= 0 || source.width <= maxWidth) {
    return { width: Math.round(source.width), height: Math.round(source.height) }
  }

  const scale = maxWidth / source.width
  return {
    width: Math.round(maxWidth),
    // At least one pixel: a very wide, very short banner would otherwise round
    // its height to zero and produce an image that cannot be drawn.
    height: Math.max(1, Math.round(source.height * scale))
  }
}

/** Maps a rectangle drawn on the scaled preview back to source pixels. */
export function toSourceRect(rect: Rect, displayed: Size, source: Size): Rect {
  if (displayed.width <= 0 || displayed.height <= 0) return { x: 0, y: 0, ...source }

  const scaleX = source.width / displayed.width
  const scaleY = source.height / displayed.height

  return clampRect(
    {
      x: rect.x * scaleX,
      y: rect.y * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY
    },
    source
  )
}

/** Bytes a base64 payload decodes to — for showing what compression saved. */
export function base64Bytes(base64: string): number {
  const payload = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0

  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

/*
 * WebP rather than JPEG. It keeps transparency, which a screenshot with a
 * rounded corner or a diagram on no background depends on — compressing those
 * to JPEG replaces the transparent parts with black, which users read as the
 * editor having corrupted their image.
 */
export const COMPRESSED_TYPE = 'image/webp'
export const COMPRESSED_EXTENSION = 'webp'

/** The file name a processed image should be saved under. */
export function processedName(original: string, compressed: boolean): string {
  const stem = original.replace(/\.[^./\\]+$/, '') || 'image'
  return compressed ? `${stem}.${COMPRESSED_EXTENSION}` : original
}
