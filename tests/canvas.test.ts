import { describe, expect, it } from 'vitest'

import {
  alignNodes,
  anchorOf,
  bestSides,
  bringToFront,
  canvasBounds,
  CANVAS_COLOR_SLOTS,
  CANVAS_SHAPES,
  canvasColorCss,
  colorSelection,
  connect,
  distributeNodes,
  duplicateNodes,
  edgeMidpoint,
  edgePath,
  groupAround,
  inPaintOrder,
  isCanvasColor,
  isCanvasShape,
  labelEdge,
  moveNodes,
  MIN_NODE,
  nextNodeId,
  nodeAt,
  nodesInside,
  parseCanvas,
  removeEdge,
  removeNode,
  removeNodes,
  sendToBack,
  shapeNodes,
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

describe('colour', () => {
  it('accepts the six preset slots the format defines', () => {
    for (const slot of CANVAS_COLOR_SLOTS) expect(isCanvasColor(slot)).toBe(true)
  })

  it('accepts a hex, because a canvas from elsewhere may carry one', () => {
    expect(isCanvasColor('#ff8800')).toBe(true)
    expect(isCanvasColor('#FF8800')).toBe(true)
  })

  it('refuses anything else — it ends up in a style attribute', () => {
    for (const value of ['red', '7', '0', '#fff', 'var(--x)', 'url(evil)', 42, null, undefined]) {
      expect(isCanvasColor(value)).toBe(false)
    }
  })

  it('resolves a preset to a custom property, so it follows the theme', () => {
    expect(canvasColorCss('4')).toBe('var(--mc-canvas-4)')
  })

  it('uses a hex as written — someone who typed one meant it', () => {
    expect(canvasColorCss('#ff8800')).toBe('#ff8800')
  })

  it('is null for no colour, which is not the same as black', () => {
    expect(canvasColorCss(undefined)).toBeNull()
    expect(canvasColorCss('')).toBeNull()
    expect(canvasColorCss('nonsense')).toBeNull()
  })

  it('drops an unusable colour when reading a file', () => {
    const json = JSON.stringify({
      nodes: [{ id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 100, color: 'javascript:x' }],
      edges: []
    })

    expect(parseCanvas(json).nodes[0].color).toBeUndefined()
  })

  it('keeps a colour it can use', () => {
    const json = JSON.stringify({
      nodes: [{ id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 100, color: '3' }],
      edges: []
    })

    expect(parseCanvas(json).nodes[0].color).toBe('3')
  })

  it('colours cards and lines together, because that is one action', () => {
    const canvas = {
      nodes: [
        { id: 'a', type: 'text' as const, x: 0, y: 0, width: 100, height: 100 },
        { id: 'b', type: 'text' as const, x: 200, y: 0, width: 100, height: 100 }
      ],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'b' }]
    }

    const painted = colorSelection(canvas, ['a'], ['e1'], '2')
    expect(painted.nodes[0].color).toBe('2')
    expect(painted.nodes[1].color).toBeUndefined()
    expect(painted.edges[0].color).toBe('2')
  })

  it('clears a colour rather than storing an empty one', () => {
    const canvas = {
      nodes: [{ id: 'a', type: 'text' as const, x: 0, y: 0, width: 100, height: 100, color: '2' }],
      edges: []
    }

    const cleared = colorSelection(canvas, ['a'], [], undefined)
    expect('color' in cleared.nodes[0]).toBe(false)
    expect(serialiseCanvas(cleared)).not.toContain('color')
  })
})

describe('duplicating', () => {
  const canvas = {
    nodes: [
      { id: 'a', type: 'text' as const, x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', type: 'text' as const, x: 200, y: 0, width: 100, height: 100 },
      { id: 'c', type: 'text' as const, x: 400, y: 0, width: 100, height: 100 }
    ],
    edges: [
      { id: 'e1', fromNode: 'a', toNode: 'b' },
      { id: 'e2', fromNode: 'b', toNode: 'c' }
    ]
  }

  it('offsets the copies so they are visibly not the originals', () => {
    const { canvas: next, ids } = duplicateNodes(canvas, ['a'])
    const copy = next.nodes.find((node) => node.id === ids[0])

    expect(copy?.x).toBe(40)
    expect(copy?.y).toBe(40)
  })

  it('keeps a line that ran between two copied cards', () => {
    const { canvas: next, ids } = duplicateNodes(canvas, ['a', 'b'])

    const added = next.edges.filter((edge) => !canvas.edges.some((old) => old.id === edge.id))
    expect(added).toHaveLength(1)
    expect(ids).toContain(added[0].fromNode)
    expect(ids).toContain(added[0].toNode)
  })

  it('drops a line to a card that was not copied, rather than guessing', () => {
    const { canvas: next } = duplicateNodes(canvas, ['b'])
    expect(next.edges).toHaveLength(2)
  })

  it('gives every copy an id nothing else uses', () => {
    const { canvas: next } = duplicateNodes(canvas, ['a', 'b', 'c'])
    const ids = next.nodes.map((node) => node.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('does nothing when nothing was selected', () => {
    const { canvas: next, ids } = duplicateNodes(canvas, [])
    expect(next).toBe(canvas)
    expect(ids).toEqual([])
  })
})

describe('groups carrying their contents', () => {
  const group = { id: 'g', type: 'group' as const, x: 0, y: 0, width: 400, height: 400 }
  const inside = { id: 'a', type: 'text' as const, x: 50, y: 50, width: 100, height: 100 }
  const straddling = { id: 'b', type: 'text' as const, x: 350, y: 50, width: 100, height: 100 }
  const outside = { id: 'c', type: 'text' as const, x: 500, y: 50, width: 100, height: 100 }

  it('takes what is wholly inside it', () => {
    expect(nodesInside([group, inside, outside], group).map((n) => n.id)).toEqual(['a'])
  })

  it('leaves a card hanging over the edge, which was put there deliberately', () => {
    expect(nodesInside([group, straddling], group)).toEqual([])
  })

  it('never takes itself', () => {
    expect(nodesInside([group], group)).toEqual([])
  })
})

describe('removing and labelling', () => {
  const canvas = {
    nodes: [
      { id: 'a', type: 'text' as const, x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', type: 'text' as const, x: 200, y: 0, width: 100, height: 100 }
    ],
    edges: [{ id: 'e1', fromNode: 'a', toNode: 'b' }]
  }

  it('removes several cards and every line that reached them', () => {
    const next = removeNodes(canvas, ['a'])
    expect(next.nodes.map((n) => n.id)).toEqual(['b'])
    expect(next.edges).toEqual([])
  })

  it('removes a line without touching the cards it joined', () => {
    const next = removeEdge(canvas, 'e1')
    expect(next.nodes).toHaveLength(2)
    expect(next.edges).toEqual([])
  })

  it('drops an emptied label rather than storing a blank one', () => {
    const labelled = labelEdge(canvas, 'e1', 'depends on')
    expect(labelled.edges[0].label).toBe('depends on')

    const cleared = labelEdge(labelled, 'e1', '   ')
    expect('label' in cleared.edges[0]).toBe(false)
    expect(serialiseCanvas(cleared)).not.toContain('label')
  })

  it('round-trips a label through the file', () => {
    const labelled = labelEdge(canvas, 'e1', 'depends on')
    expect(parseCanvas(serialiseCanvas(labelled)).edges[0].label).toBe('depends on')
  })
})

describe('arranging', () => {
  const row = {
    nodes: [
      { id: 'a', type: 'text' as const, x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', type: 'text' as const, x: 130, y: 40, width: 100, height: 60 },
      { id: 'c', type: 'text' as const, x: 400, y: 80, width: 100, height: 40 }
    ],
    edges: []
  }

  it('lines cards up on their left edges', () => {
    const aligned = alignNodes(row, ['a', 'b', 'c'], 'left')
    expect(aligned.nodes.map((n) => n.x)).toEqual([0, 0, 0])
  })

  it('lines them up on their right edges, which are not their positions', () => {
    const aligned = alignNodes(row, ['a', 'b', 'c'], 'right')
    expect(aligned.nodes.map((n) => n.x + n.width)).toEqual([500, 500, 500])
  })

  it('centres them on the selection, not on the origin', () => {
    const aligned = alignNodes(row, ['a', 'b', 'c'], 'centre')
    const centres = aligned.nodes.map((n) => n.x + n.width / 2)
    expect(new Set(centres).size).toBe(1)
    expect(centres[0]).toBe(250)
  })

  it('leaves one card alone — there is nothing to line it up with', () => {
    expect(alignNodes(row, ['a'], 'left')).toBe(row)
  })

  it('spreads three cards to equal gaps', () => {
    const spread = distributeNodes(row, ['a', 'b', 'c'], 'x')
    const sorted = [...spread.nodes].sort((l, r) => l.x - r.x)
    const gaps = [
      sorted[1].x - (sorted[0].x + sorted[0].width),
      sorted[2].x - (sorted[1].x + sorted[1].width)
    ]
    // Snapped to the grid, so equal to within one step rather than exactly.
    expect(Math.abs(gaps[0] - gaps[1])).toBeLessThanOrEqual(20)
  })

  it('keeps the outermost two where they were', () => {
    const spread = distributeNodes(row, ['a', 'b', 'c'], 'x')
    expect(spread.nodes[0].x).toBe(0)
    expect(spread.nodes[2].x).toBe(400)
  })

  it('needs three cards before spreading means anything', () => {
    expect(distributeNodes(row, ['a', 'b'], 'x')).toBe(row)
  })
})

describe('stacking', () => {
  const stack = {
    nodes: [
      { id: 'a', type: 'text' as const, x: 0, y: 0, width: 100, height: 100 },
      { id: 'b', type: 'text' as const, x: 10, y: 10, width: 100, height: 100 },
      { id: 'c', type: 'text' as const, x: 20, y: 20, width: 100, height: 100 }
    ],
    edges: []
  }

  it('brings a card to the front by moving it last', () => {
    // Painting order is the order in the file; there is no z-index to keep.
    expect(bringToFront(stack, ['a']).nodes.map((n) => n.id)).toEqual(['b', 'c', 'a'])
  })

  it('sends one to the back by moving it first', () => {
    expect(sendToBack(stack, ['c']).nodes.map((n) => n.id)).toEqual(['c', 'a', 'b'])
  })

  it('keeps the relative order of what moves together', () => {
    expect(bringToFront(stack, ['a', 'b']).nodes.map((n) => n.id)).toEqual(['c', 'a', 'b'])
  })

  it('and the topmost card is the one a click finds', () => {
    const raised = bringToFront(stack, ['a'])
    expect(nodeAt(raised.nodes, 50, 50)?.id).toBe('a')
  })
})

describe('the curve a line follows', () => {
  it('leaves each card perpendicular to the side it starts from', () => {
    // The first control point is directly right of a right-hand anchor, which
    // is what stops a diagonal line from setting off across its own card.
    const path = edgePath({ x: 100, y: 50 }, 'right', { x: 300, y: 200 }, 'left')
    const [, c1x, c1y] = path.match(/C ([\d.-]+) ([\d.-]+),/) ?? []

    expect(Number(c1x)).toBeGreaterThan(100)
    expect(Number(c1y)).toBe(50)
  })

  it('starts and ends exactly on the anchors', () => {
    const path = edgePath({ x: 10, y: 20 }, 'bottom', { x: 300, y: 400 }, 'top')
    expect(path.startsWith('M 10 20')).toBe(true)
    expect(path.endsWith('300 400')).toBe(true)
  })

  it('does not loop when two cards are almost touching', () => {
    const path = edgePath({ x: 100, y: 50 }, 'right', { x: 110, y: 50 }, 'left')
    const [, c1x] = path.match(/C ([\d.-]+)/) ?? []
    // A pull larger than the gap would send the curve past its own target.
    expect(Number(c1x)).toBeLessThan(200)
  })

  it('puts the label on the curve rather than on the straight line', () => {
    const from = { x: 100, y: 50 }
    const to = { x: 300, y: 50 }
    const middle = edgeMidpoint(from, 'right', to, 'left')

    expect(middle.x).toBeCloseTo(200, 0)
    expect(middle.y).toBeCloseTo(50, 0)
  })

  it('bows the label away from a curve that turns', () => {
    const middle = edgeMidpoint({ x: 100, y: 50 }, 'bottom', { x: 300, y: 50 }, 'bottom')
    // Both ends leave downwards, so the middle of the curve is below them.
    expect(middle.y).toBeGreaterThan(50)
  })
})

describe('a click that is not a drag', () => {
  const canvas = {
    nodes: [
      { id: 'a', type: 'text' as const, x: 40, y: 60, width: 100, height: 100 },
      { id: 'b', type: 'text' as const, x: 200, y: 60, width: 100, height: 100 }
    ],
    edges: []
  }

  it('leaves the canvas untouched when nothing ends up anywhere new', () => {
    // A press without a drag still produces pointer moves. Without this, a
    // click snapped the card to the grid and marked the document unsaved —
    // selecting something was enough to be asked whether to save it.
    const moves = new Map([['a', { x: 40, y: 60 }]])
    expect(moveNodes(canvas, moves)).toBe(canvas)
  })

  it('leaves it untouched when the move rounds back to where it was', () => {
    const moves = new Map([['a', { x: 43, y: 57 }]])
    expect(moveNodes(canvas, moves)).toBe(canvas)
  })

  it('still moves a card that genuinely goes somewhere', () => {
    const moves = new Map([['a', { x: 140, y: 60 }]])
    const next = moveNodes(canvas, moves)

    expect(next).not.toBe(canvas)
    expect(next.nodes[0].x).toBe(140)
  })

  it('moves the ones that changed and keeps the ones that did not', () => {
    const moves = new Map([
      ['a', { x: 40, y: 60 }],
      ['b', { x: 300, y: 60 }]
    ])
    const next = moveNodes(canvas, moves)

    expect(next.nodes[0]).toBe(canvas.nodes[0])
    expect(next.nodes[1].x).toBe(300)
  })
})

describe('shapes', () => {
  const canvas = {
    nodes: [{ id: 'a', type: 'text' as const, x: 0, y: 0, width: 100, height: 100 }],
    edges: []
  }

  it('accepts the shapes it can draw', () => {
    for (const shape of CANVAS_SHAPES) expect(isCanvasShape(shape)).toBe(true)
  })

  it('refuses anything else, which ends up in a clip path', () => {
    for (const value of ['star', '', 'polygon(0 0)', 42, null, undefined]) {
      expect(isCanvasShape(value)).toBe(false)
    }
  })

  it('sets a shape on the chosen cards', () => {
    expect(shapeNodes(canvas, ['a'], 'ellipse').nodes[0].shape).toBe('ellipse')
  })

  it('stores nothing for a rectangle, because that is the absence of a shape', () => {
    // Keeps a canvas that nobody reshaped byte-identical to one made before
    // shapes existed.
    const round = shapeNodes(canvas, ['a'], 'ellipse')
    const back = shapeNodes(round, ['a'], 'rectangle')

    expect('shape' in back.nodes[0]).toBe(false)
    expect(serialiseCanvas(back)).not.toContain('shape')
  })

  it('round-trips through the file', () => {
    const round = shapeNodes(canvas, ['a'], 'diamond')
    expect(parseCanvas(serialiseCanvas(round)).nodes[0].shape).toBe('diamond')
  })

  it('drops a shape it cannot draw when reading a file', () => {
    // A reader that has never heard of `shape` draws a rectangle, which is what
    // the card was before — so nothing is lost anywhere.
    const json = JSON.stringify({
      nodes: [{ id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 100, shape: 'star' }],
      edges: []
    })

    expect(parseCanvas(json).nodes[0].shape).toBeUndefined()
  })
})
