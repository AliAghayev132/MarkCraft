import { describe, expect, it } from 'vitest'

import {
  anchorOf,
  bestSides,
  canvasBounds,
  nextNodeId,
  nodeAt,
  parseCanvas,
  serialiseCanvas,
  snap,
  type CanvasNode
} from '@shared'

const node = (over: Partial<CanvasNode> = {}): CanvasNode => ({
  id: 'a',
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  ...over
})

describe('parseCanvas', () => {
  it('reads nodes and edges', () => {
    const json = JSON.stringify({
      nodes: [node({ id: 'a' }), node({ id: 'b', x: 400 })],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'b' }]
    })

    const canvas = parseCanvas(json)
    expect(canvas.nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(canvas.edges).toHaveLength(1)
  })

  /*
   * One bad node must not cost the other twenty. A canvas that refuses to open
   * is a canvas the user cannot get back into to fix.
   */
  it('drops malformed nodes and keeps the rest', () => {
    const json = JSON.stringify({
      nodes: [node({ id: 'good' }), { id: 'no-type', x: 0, y: 0, width: 1, height: 1 }, { type: 'text' }, null],
      edges: []
    })

    expect(parseCanvas(json).nodes.map((n) => n.id)).toEqual(['good'])
  })

  it('drops edges whose nodes did not survive', () => {
    const json = JSON.stringify({
      nodes: [node({ id: 'a' })],
      edges: [
        { id: 'ok', fromNode: 'a', toNode: 'a' },
        { id: 'dangling', fromNode: 'a', toNode: 'ghost' }
      ]
    })

    expect(parseCanvas(json).edges.map((e) => e.id)).toEqual(['ok'])
  })

  it('gives a collapsed node enough size to be grabbed again', () => {
    const json = JSON.stringify({ nodes: [node({ width: 0, height: 0 })], edges: [] })
    const [only] = parseCanvas(json).nodes

    expect(only.width).toBeGreaterThanOrEqual(40)
    expect(only.height).toBeGreaterThanOrEqual(30)
  })

  it('rejects non-finite coordinates', () => {
    const json = '{"nodes":[{"id":"a","type":"text","x":null,"y":0,"width":1,"height":1}],"edges":[]}'
    expect(parseCanvas(json).nodes).toEqual([])
  })

  it('returns an empty canvas for anything unreadable', () => {
    expect(parseCanvas('not json')).toEqual({ nodes: [], edges: [] })
    expect(parseCanvas('null')).toEqual({ nodes: [], edges: [] })
    expect(parseCanvas('[]')).toEqual({ nodes: [], edges: [] })
  })
})

describe('serialiseCanvas', () => {
  it('round-trips', () => {
    const canvas = { nodes: [node({ id: 'a', text: 'hello' })], edges: [] }
    expect(parseCanvas(serialiseCanvas(canvas)).nodes[0]).toMatchObject({ id: 'a', text: 'hello' })
  })

  /* Whole pixels, so nudging a card is a one-line diff and not a float storm. */
  it('rounds coordinates', () => {
    const out = serialiseCanvas({ nodes: [node({ x: 10.4, y: 20.6 })], edges: [] })
    expect(out).toContain('"x": 10')
    expect(out).toContain('"y": 21')
  })

  it('leaves out the fields a node does not have', () => {
    const out = serialiseCanvas({ nodes: [node()], edges: [] })
    expect(out).not.toContain('"file"')
    expect(out).not.toContain('"url"')
  })
})

describe('canvasBounds', () => {
  it('covers every node', () => {
    expect(canvasBounds([node({ x: 0, y: 0 }), node({ id: 'b', x: 300, y: 200 })])).toEqual({
      x: 0,
      y: 0,
      width: 500,
      height: 300
    })
  })

  it('handles negative coordinates', () => {
    expect(canvasBounds([node({ x: -100, y: -50 })])).toMatchObject({ x: -100, y: -50 })
  })

  it('is empty for an empty canvas', () => {
    expect(canvasBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})

describe('nodeAt', () => {
  it('returns the topmost node under the point', () => {
    const nodes = [node({ id: 'under' }), node({ id: 'over' })]
    expect(nodeAt(nodes, 50, 50)?.id).toBe('over')
  })

  /* Clicking a card inside a group should take the card, not the group. */
  it('prefers a card over the group containing it', () => {
    const nodes = [node({ id: 'group', type: 'group', width: 600, height: 400 }), node({ id: 'card' })]
    expect(nodeAt(nodes, 50, 50)?.id).toBe('card')
    expect(nodeAt(nodes, 500, 300)?.id).toBe('group')
  })

  it('is null on empty space', () => {
    expect(nodeAt([node()], 900, 900)).toBeNull()
  })
})

describe('anchorOf', () => {
  it('returns the midpoint of each side', () => {
    const n = node({ x: 100, y: 100, width: 200, height: 100 })
    expect(anchorOf(n, 'top')).toEqual({ x: 200, y: 100 })
    expect(anchorOf(n, 'bottom')).toEqual({ x: 200, y: 200 })
    expect(anchorOf(n, 'left')).toEqual({ x: 100, y: 150 })
    expect(anchorOf(n, 'right')).toEqual({ x: 300, y: 150 })
  })
})

describe('bestSides', () => {
  it('leaves the side that faces the other card', () => {
    const left = node({ x: 0 })
    const right = node({ id: 'b', x: 500 })
    expect(bestSides(left, right)).toEqual({ from: 'right', to: 'left' })
    expect(bestSides(right, left)).toEqual({ from: 'left', to: 'right' })
  })

  it('goes vertical when the cards are stacked', () => {
    const top = node({ y: 0 })
    const bottom = node({ id: 'b', y: 400 })
    expect(bestSides(top, bottom)).toEqual({ from: 'bottom', to: 'top' })
  })
})

describe('snap', () => {
  it('rounds to the grid', () => {
    expect(snap(23)).toBe(20)
    expect(snap(31)).toBe(40)
    expect(snap(-7)).toBe(-0)
  })

  it('leaves the value alone when there is no grid', () => {
    expect(snap(23, 0)).toBe(23)
  })
})

describe('nextNodeId', () => {
  it('never returns an id already in use', () => {
    const canvas = { nodes: [node({ id: 'n1' }), node({ id: 'n2' })], edges: [] }
    expect(['n1', 'n2']).not.toContain(nextNodeId(canvas))
  })

  it('avoids edge ids too', () => {
    const canvas = { nodes: [node({ id: 'x' })], edges: [{ id: 'n2', fromNode: 'x', toNode: 'x' }] }
    expect(nextNodeId(canvas)).not.toBe('n2')
  })
})
