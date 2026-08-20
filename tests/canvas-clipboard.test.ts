import { beforeEach, describe, expect, it } from 'vitest'

import {
  clippingSize,
  copyNodes,
  forgetClipping,
  hasClipping,
  pasteInto
} from '@features/canvas/canvas-clipboard'

import type { CanvasData } from '@shared'

/**
 * Copying cards.
 *
 * Held in the renderer rather than on the system clipboard: a card is not text,
 * and putting JSON there would replace whatever the person had copied to paste
 * into their document. The system clipboard belongs to what people write.
 */
const canvas: CanvasData = {
  nodes: [
    { id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 100, text: 'A' },
    { id: 'b', type: 'text', x: 200, y: 0, width: 100, height: 100, text: 'B' },
    { id: 'c', type: 'text', x: 400, y: 0, width: 100, height: 100, text: 'C' }
  ],
  edges: [
    { id: 'e1', fromNode: 'a', toNode: 'b' },
    { id: 'e2', fromNode: 'b', toNode: 'c' }
  ]
}

beforeEach(() => forgetClipping())

describe('copying', () => {
  it('starts with nothing on it', () => {
    expect(hasClipping()).toBe(false)
    expect(clippingSize()).toBe(0)
  })

  it('holds what was copied', () => {
    expect(copyNodes(canvas, ['a', 'b'])).toBe(2)
    expect(hasClipping()).toBe(true)
    expect(clippingSize()).toBe(2)
  })

  it('copies nothing when nothing was selected', () => {
    expect(copyNodes(canvas, [])).toBe(0)
    expect(hasClipping()).toBe(false)
  })

  it('does not hand out the canvas own nodes', () => {
    copyNodes(canvas, ['a'])
    const pasted = pasteInto(canvas, { x: 0, y: 0 })

    // A paste that shared objects with the canvas would change the original
    // the moment the copy was moved.
    expect(pasted.canvas.nodes.at(-1)).not.toBe(canvas.nodes[0])
  })
})

describe('pasting', () => {
  it('does nothing with an empty clipboard', () => {
    const result = pasteInto(canvas, { x: 0, y: 0 })
    expect(result.canvas).toBe(canvas)
    expect(result.ids).toEqual([])
  })

  it('puts the clipping where it was asked to', () => {
    copyNodes(canvas, ['a'])
    const { canvas: next, ids } = pasteInto(canvas, { x: 600, y: 300 })

    const pasted = next.nodes.find((node) => node.id === ids[0])
    expect(pasted?.x).toBe(600)
    expect(pasted?.y).toBe(300)
  })

  it('offsets instead when there is nowhere in particular', () => {
    // A paste underneath the cards it was copied from looks like nothing
    // happened at all.
    copyNodes(canvas, ['a'])
    const { canvas: next, ids } = pasteInto(canvas, null)

    const pasted = next.nodes.find((node) => node.id === ids[0])
    expect(pasted?.x).toBe(40)
    expect(pasted?.y).toBe(40)
  })

  it('keeps the shape of what was copied', () => {
    copyNodes(canvas, ['a', 'b'])
    const { canvas: next, ids } = pasteInto(canvas, { x: 0, y: 400 })

    const [first, second] = ids.map((id) => next.nodes.find((node) => node.id === id))
    expect((second?.x ?? 0) - (first?.x ?? 0)).toBe(200)
  })

  it('brings the lines that ran between the copied cards', () => {
    copyNodes(canvas, ['a', 'b'])
    const { canvas: next, ids } = pasteInto(canvas, { x: 0, y: 400 })

    const added = next.edges.filter((edge) => !canvas.edges.some((old) => old.id === edge.id))
    expect(added).toHaveLength(1)
    expect(ids).toContain(added[0].fromNode)
    expect(ids).toContain(added[0].toNode)
  })

  it('leaves behind a line to a card that was not copied', () => {
    copyNodes(canvas, ['b'])
    const { canvas: next } = pasteInto(canvas, { x: 0, y: 400 })

    expect(next.edges).toHaveLength(2)
  })

  it('can be pasted again, and into the canvas it came from', () => {
    copyNodes(canvas, ['a'])

    const once = pasteInto(canvas, { x: 0, y: 200 })
    const twice = pasteInto(once.canvas, { x: 0, y: 400 })

    const ids = twice.canvas.nodes.map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(twice.canvas.nodes).toHaveLength(5)
  })

  it('survives the canvas it was copied from being emptied', () => {
    copyNodes(canvas, ['a', 'b'])
    const { canvas: next } = pasteInto({ nodes: [], edges: [] }, { x: 0, y: 0 })

    expect(next.nodes).toHaveLength(2)
    expect(next.edges).toHaveLength(1)
  })
})
