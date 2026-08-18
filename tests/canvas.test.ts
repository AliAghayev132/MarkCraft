import { describe, expect, it } from 'vitest'

import {
  anchorOf,
  bestSides,
  canvasBounds,
  connect,
  groupAround,
  inPaintOrder,
  MIN_NODE,
  nextNodeId,
  nodeAt,
  parseCanvas,
  removeNode,
  resizeNode,
  serialiseCanvas,
  snap,
  type CanvasData,
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

describe('editing a canvas', () => {
  const canvas: CanvasData = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 200, height: 120, text: 'one' },
      { id: 'n2', type: 'text', x: 400, y: 0, width: 200, height: 120, text: 'two' },
      { id: 'g1', type: 'group', x: -40, y: -40, width: 700, height: 300, label: 'both' }
    ],
    edges: []
  }

  describe('connect', () => {
    it('joins two cards', () => {
      const next = connect(canvas, 'n1', 'n2')
      expect(next.edges).toHaveLength(1)
      expect(next.edges[0]).toMatchObject({ fromNode: 'n1', toNode: 'n2' })
    })

    it('refuses to join a card to itself', () => {
      expect(connect(canvas, 'n1', 'n1')).toBe(canvas)
    })

    it('leaves an existing pair alone, in either direction', () => {
      const once = connect(canvas, 'n1', 'n2')
      expect(connect(once, 'n1', 'n2').edges).toHaveLength(1)
      expect(connect(once, 'n2', 'n1').edges).toHaveLength(1)
    })

    it('ignores a node that is not there', () => {
      expect(connect(canvas, 'n1', 'gone')).toBe(canvas)
    })

    it('gives each edge an id nothing else is using', () => {
      const two = connect(connect(canvas, 'n1', 'n2'), 'n1', 'g1')
      const ids = [...two.nodes.map((n) => n.id), ...two.edges.map((e) => e.id)]
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('leaves the sides unset, so they are re-chosen as the cards move', () => {
      const [edge] = connect(canvas, 'n1', 'n2').edges
      expect(edge.fromSide).toBeUndefined()
      expect(edge.toSide).toBeUndefined()
    })
  })

  describe('removeNode', () => {
    it('takes the lines that reached it with it', () => {
      const joined = connect(canvas, 'n1', 'n2')
      const next = removeNode(joined, 'n2')

      expect(next.nodes.map((n) => n.id)).toEqual(['n1', 'g1'])
      expect(next.edges).toEqual([])
    })
  })

  describe('resizeNode', () => {
    it('snaps to the grid', () => {
      expect(resizeNode(canvas.nodes[0], 213, 187)).toMatchObject({ width: 220, height: 180 })
    })

    it('will not shrink a card below what can be read or grabbed', () => {
      const tiny = resizeNode(canvas.nodes[0], 4, 4)
      expect(tiny.width).toBe(MIN_NODE.width)
      expect(tiny.height).toBe(MIN_NODE.height)
    })
  })

  describe('groupAround', () => {
    it('surrounds the nodes it is given', () => {
      const bounds = groupAround([canvas.nodes[0], canvas.nodes[1]])

      expect(bounds.x).toBeLessThan(0)
      expect(bounds.y).toBeLessThan(0)
      expect(bounds.x + bounds.width).toBeGreaterThan(600)
      expect(bounds.y + bounds.height).toBeGreaterThan(120)
    })

    it('leaves more room above, where the label goes', () => {
      const bounds = groupAround([canvas.nodes[0]])
      const above = canvas.nodes[0].y - bounds.y
      const below = bounds.y + bounds.height - (canvas.nodes[0].y + canvas.nodes[0].height)

      expect(above).toBeGreaterThan(below)
    })

    it('gives an empty selection a usable default rather than a zero rectangle', () => {
      const bounds = groupAround([])
      expect(bounds.width).toBeGreaterThan(0)
      expect(bounds.height).toBeGreaterThan(0)
    })
  })

  describe('inPaintOrder', () => {
    it('puts groups behind, whatever order the file had them in', () => {
      const order = inPaintOrder(canvas.nodes).map((n) => n.id)
      expect(order).toEqual(['g1', 'n1', 'n2'])
    })

    it('keeps the order within each band, because that is what front-to-back means', () => {
      const order = inPaintOrder([...canvas.nodes].reverse()).map((n) => n.id)
      expect(order).toEqual(['g1', 'n2', 'n1'])
    })
  })
})
