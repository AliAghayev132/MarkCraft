import { describe, expect, it } from 'vitest'

import {
  canvasBounds,
  radialLayout,
  treeLayout,
  type CanvasData,
  type CanvasNode
} from '@shared'

/**
 * Arranging a canvas by its arrows.
 *
 * What these check is that the arrangement *says* the right thing: a parent
 * above its children, a flow that reads in one direction, a hub in the middle.
 * A layout that is merely tidy is a grid, and there is already one of those.
 */

const card = (id: string, over: Partial<CanvasNode> = {}): CanvasNode => ({
  id,
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  text: id,
  ...over
})

/** A canvas from `a>b` style edges. */
function graph(nodes: string[], edges: string[]): CanvasData {
  return {
    nodes: nodes.map((id, index) => card(id, { x: index * 37, y: index * 53 })),
    edges: edges.map((pair, index) => {
      const [from, to] = pair.split('>')
      return { id: `e${index}`, fromNode: from, toNode: to }
    })
  }
}

const allIds = (canvas: CanvasData): string[] => canvas.nodes.map((node) => node.id)
const at = (canvas: CanvasData, id: string): CanvasNode =>
  canvas.nodes.find((node) => node.id === id) as CanvasNode

describe('treeLayout', () => {
  const simple = graph(['a', 'b', 'c'], ['a>b', 'a>c'])

  it('puts a parent above its children', () => {
    const laid = treeLayout(simple, allIds(simple))

    expect(at(laid, 'a').y).toBeLessThan(at(laid, 'b').y)
    expect(at(laid, 'a').y).toBeLessThan(at(laid, 'c').y)
  })

  it('puts siblings on the same row, side by side', () => {
    const laid = treeLayout(simple, allIds(simple))

    expect(at(laid, 'b').y).toBe(at(laid, 'c').y)
    expect(at(laid, 'b').x).not.toBe(at(laid, 'c').x)
  })

  it('centres a parent over the children it has', () => {
    const laid = treeLayout(simple, allIds(simple))
    const parent = at(laid, 'a')
    const left = at(laid, 'b')
    const right = at(laid, 'c')

    const middleOfChildren = (left.x + right.x + right.width) / 2
    expect(Math.abs(parent.x + parent.width / 2 - middleOfChildren)).toBeLessThanOrEqual(20)
  })

  it('leaves room between siblings for the lines to be followed', () => {
    const laid = treeLayout(simple, allIds(simple))
    const [left, right] = [at(laid, 'b'), at(laid, 'c')].sort((a, b) => a.x - b.x)

    expect(right.x).toBeGreaterThanOrEqual(left.x + left.width)
  })

  it('lays out a chain as a chain', () => {
    const chain = graph(['a', 'b', 'c', 'd'], ['a>b', 'b>c', 'c>d'])
    const laid = treeLayout(chain, allIds(chain))
    const ys = ['a', 'b', 'c', 'd'].map((id) => at(laid, id).y)

    expect([...ys].sort((a, b) => a - b)).toEqual(ys)
    expect(new Set(ys).size).toBe(4)
  })

  it('gives every root its own place', () => {
    const forest = graph(['a', 'b', 'c', 'd'], ['a>b', 'c>d'])
    const laid = treeLayout(forest, allIds(forest))

    expect(at(laid, 'a').y).toBe(at(laid, 'c').y)
    expect(at(laid, 'a').x).not.toBe(at(laid, 'c').x)
  })

  /* Cards joined to nothing are not part of the diagram; mixing them into it
     would say they were. */
  it('keeps unconnected cards out of the tree, in a row of their own', () => {
    const mixed = graph(['a', 'b', 'lonely'], ['a>b'])
    const laid = treeLayout(mixed, allIds(mixed))

    expect(at(laid, 'lonely').y).toBeGreaterThan(at(laid, 'b').y)
  })

  /* A cycle has no root and no bottom; it must still lay out rather than
     recurse until the stack gives up. */
  it('survives a cycle', () => {
    const cycle = graph(['a', 'b', 'c'], ['a>b', 'b>c', 'c>a'])
    const laid = treeLayout(cycle, allIds(cycle))

    expect(new Set(allIds(laid).map((id) => `${at(laid, id).x},${at(laid, id).y}`)).size).toBe(3)
  })

  it('survives a card joined to itself', () => {
    const loop = graph(['a', 'b'], ['a>a', 'a>b'])
    const laid = treeLayout(loop, allIds(loop))

    expect(at(laid, 'a').y).toBeLessThan(at(laid, 'b').y)
  })

  it('reads the same twice, whatever order the cards are stored in', () => {
    const once = treeLayout(simple, allIds(simple))
    const shuffled: CanvasData = { ...simple, nodes: [...simple.nodes].reverse() }
    const twice = treeLayout(shuffled, allIds(shuffled))

    for (const id of ['a', 'b', 'c']) {
      expect(at(twice, id).x, id).toBe(at(once, id).x)
      expect(at(twice, id).y, id).toBe(at(once, id).y)
    }
  })

  it('lands every card on the grid, where a dragged one would land', () => {
    const laid = treeLayout(simple, allIds(simple))

    for (const node of laid.nodes) {
      expect(node.x % 20, node.id).toBe(0)
      expect(node.y % 20, node.id).toBe(0)
    }
  })

  /* Somebody who lays out a canvas should not then have to go looking for it. */
  it('leaves the arrangement where the old one was', () => {
    const moved: CanvasData = {
      ...simple,
      nodes: simple.nodes.map((node) => ({ ...node, x: node.x + 1200, y: node.y + 800 }))
    }
    const laid = treeLayout(moved, allIds(moved))
    const before = canvasBounds(moved.nodes)
    const after = canvasBounds(laid.nodes)

    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(20)
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(20)
  })

  it('leaves the cards it was not asked about alone', () => {
    const laid = treeLayout(simple, ['a', 'b'])

    expect(at(laid, 'c').x).toBe(at(simple, 'c').x)
    expect(at(laid, 'c').y).toBe(at(simple, 'c').y)
  })

  it('does nothing to a single card', () => {
    expect(treeLayout(simple, ['a'])).toBe(simple)
  })

  it('changes no text, size or colour', () => {
    const laid = treeLayout(simple, allIds(simple))

    for (const node of laid.nodes) {
      const before = at(simple, node.id)
      expect(node.text).toBe(before.text)
      expect(node.width).toBe(before.width)
      expect(node.height).toBe(before.height)
    }
  })

  it('leaves the lines exactly as they were', () => {
    expect(treeLayout(simple, allIds(simple)).edges).toEqual(simple.edges)
  })
})

describe('radialLayout', () => {
  const hub = graph(['h', 'a', 'b', 'c', 'd'], ['h>a', 'h>b', 'h>c', 'h>d'])

  it('puts the most-joined card in the middle', () => {
    const laid = radialLayout(hub, allIds(hub))
    const middle = at(laid, 'h')

    for (const id of ['a', 'b', 'c', 'd']) {
      const spoke = at(laid, id)
      const distance = Math.hypot(
        spoke.x + spoke.width / 2 - (middle.x + middle.width / 2),
        spoke.y + spoke.height / 2 - (middle.y + middle.height / 2)
      )
      expect(distance, id).toBeGreaterThan(100)
    }
  })

  it('spreads the others round it rather than down a column', () => {
    const laid = radialLayout(hub, allIds(hub))
    const ring = ['a', 'b', 'c', 'd'].map((id) => at(laid, id))

    expect(new Set(ring.map((node) => node.x)).size).toBeGreaterThan(1)
    expect(new Set(ring.map((node) => node.y)).size).toBeGreaterThan(1)
  })

  it('starts at the top, where the first thing is expected', () => {
    const laid = radialLayout(hub, allIds(hub))

    expect(at(laid, 'a').y).toBeLessThan(at(laid, 'h').y)
  })

  it('lands every card on the grid', () => {
    const laid = radialLayout(hub, allIds(hub))

    for (const node of laid.nodes) {
      expect(node.x % 20, node.id).toBe(0)
      expect(node.y % 20, node.id).toBe(0)
    }
  })

  it('has nothing to arrange with fewer than three cards', () => {
    const two = graph(['a', 'b'], ['a>b'])

    expect(radialLayout(two, allIds(two))).toBe(two)
  })

  it('copes with cards joined to nothing at all', () => {
    const loose = graph(['a', 'b', 'c'], [])
    const laid = radialLayout(loose, allIds(loose))

    expect(new Set(laid.nodes.map((node) => `${node.x},${node.y}`)).size).toBe(3)
  })
})
