import { describe, expect, it } from 'vitest'

import { base64Bytes, clampRect, fitWithin, processedName, rectFromDrag, toSourceRect } from '@shared'

describe('rectFromDrag', () => {
  it('normalises a drag in any direction', () => {
    const expected = { x: 10, y: 20, width: 30, height: 40 }
    expect(rectFromDrag(10, 20, 40, 60)).toEqual(expected)
    expect(rectFromDrag(40, 60, 10, 20)).toEqual(expected)
    expect(rectFromDrag(40, 20, 10, 60)).toEqual(expected)
  })
})

describe('clampRect', () => {
  const bounds = { width: 100, height: 80 }

  it('leaves a rectangle that already fits', () => {
    expect(clampRect({ x: 10, y: 10, width: 50, height: 40 }, bounds)).toEqual({
      x: 10,
      y: 10,
      width: 50,
      height: 40
    })
  })

  it('slides a rectangle that runs off the edge back inside', () => {
    expect(clampRect({ x: 90, y: 70, width: 50, height: 40 }, bounds)).toEqual({
      x: 50,
      y: 40,
      width: 50,
      height: 40
    })
  })

  it('shrinks a rectangle larger than the image', () => {
    expect(clampRect({ x: -20, y: -20, width: 500, height: 500 }, bounds)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 80
    })
  })
})

describe('fitWithin', () => {
  it('scales down and keeps the aspect ratio', () => {
    expect(fitWithin({ width: 2000, height: 1000 }, 800)).toEqual({ width: 800, height: 400 })
  })

  /* Enlarging costs bytes to add blur — the opposite of the point. */
  it('never enlarges', () => {
    expect(fitWithin({ width: 400, height: 300 }, 1600)).toEqual({ width: 400, height: 300 })
  })

  it('keeps at least one pixel of height for an extreme banner', () => {
    expect(fitWithin({ width: 5000, height: 3 }, 100).height).toBe(1)
  })

  it('treats a bound of zero as no bound', () => {
    expect(fitWithin({ width: 640, height: 480 }, 0)).toEqual({ width: 640, height: 480 })
  })
})

describe('toSourceRect', () => {
  /*
   * The bug this exists to prevent: the preview is scaled to fit the dialog, so
   * a selection drawn on it is in screen pixels. Cropping with those directly
   * cuts the wrong part of a large image.
   */
  it('scales a preview selection up to source pixels', () => {
    const source = { width: 1600, height: 1200 }
    const displayed = { width: 400, height: 300 }

    expect(toSourceRect({ x: 100, y: 75, width: 200, height: 150 }, displayed, source)).toEqual({
      x: 400,
      y: 300,
      width: 800,
      height: 600
    })
  })

  it('still clamps after scaling', () => {
    const rect = toSourceRect(
      { x: 380, y: 290, width: 100, height: 100 },
      { width: 400, height: 300 },
      { width: 800, height: 600 }
    )

    expect(rect.x + rect.width).toBeLessThanOrEqual(800)
    expect(rect.y + rect.height).toBeLessThanOrEqual(600)
  })

  it('falls back to the whole image when nothing is displayed yet', () => {
    expect(toSourceRect({ x: 0, y: 0, width: 10, height: 10 }, { width: 0, height: 0 }, { width: 50, height: 40 }))
      .toEqual({ x: 0, y: 0, width: 50, height: 40 })
  })
})

describe('base64Bytes', () => {
  it('counts the decoded bytes, padding included', () => {
    expect(base64Bytes('aGVsbG8=')).toBe(5)
    expect(base64Bytes('aGVsbG8')).toBe(5)
  })

  it('accepts a full data URL', () => {
    expect(base64Bytes('data:image/webp;base64,aGVsbG8=')).toBe(5)
  })

  it('is zero for nothing', () => {
    expect(base64Bytes('')).toBe(0)
  })
})

describe('processedName', () => {
  it('switches the extension when the image was compressed', () => {
    expect(processedName('photo.png', true)).toBe('photo.webp')
    expect(processedName('photo.jpeg', true)).toBe('photo.webp')
  })

  it('keeps the original name when it was not', () => {
    expect(processedName('photo.png', false)).toBe('photo.png')
  })

  it('copes with a name that has no extension', () => {
    expect(processedName('photo', true)).toBe('photo.webp')
  })
})
