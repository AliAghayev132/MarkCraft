import { describe, expect, it } from 'vitest'

import {
  CANVAS_TEMPLATES,
  boardCanvas,
  canvasBounds,
  mergeCanvas,
  mindMapCanvas,
  parseCanvas,
  serialiseCanvas,
  timelineCanvas,
  type CanvasData
} from '@shared'

/**
 * Canvases that start with a shape.
 *
 * What matters is that the arrangement says what it means — a timeline in one
 * line, branches around a middle, columns that do not overlap — and that
 * adding one never disturbs what somebody already drew.
 */

const board = (): CanvasData =>
  boardCanvas(
    [{ label: 'To do' }, { label: 'Doing', color: '3' }, { label: 'Done', color: '4' }],
    'Write here'
  )

describe('boardCanvas', () => {
  it('gives every column a heading and a card', () => {
    expect(board().nodes).toHaveLength(6)
  })

  it('writes the heading as one, so it reads as a heading', () => {
    const heading = board().nodes.find((node) => node.id === 'heading-0')

    expect(heading?.text).toBe('## To do')
  })

  /* A bordered box holding the word "Doing" reads as an item on the board. */
  it('draws the headings with no card round them', () => {
    const headings = board().nodes.filter((node) => node.id.startsWith('heading-'))

    expect(headings.every((node) => node.shape === 'plain')).toBe(true)
  })

  it('carries each column colour to its card and not to its heading', () => {
    const nodes = board().nodes

    expect(nodes.find((node) => node.id === 'card-1')?.color).toBe('3')
    expect(nodes.find((node) => node.id === 'heading-1')?.color).toBeUndefined()
  })

  it('leaves the columns side by side without overlapping', () => {
    const nodes = board().nodes
    const first = nodes.find((node) => node.id === 'heading-0')!
    const second = nodes.find((node) => node.id === 'heading-1')!

    expect(second.x).toBeGreaterThan(first.x + first.width)
  })

  it('puts every card below its own heading', () => {
    for (const [index, column] of [0, 1, 2].entries()) {
      const nodes = board().nodes
      const heading = nodes.find((node) => node.id === `heading-${column}`)!
      const card = nodes.find((node) => node.id === `card-${column}`)!

      expect(card.y, `column ${index}`).toBeGreaterThanOrEqual(heading.y + heading.height)
    }
  })

  it('draws no lines, because a board is not a diagram', () => {
    expect(board().edges).toEqual([])
  })

  it('copes with a single column', () => {
    expect(boardCanvas([{ label: 'Only' }], 'x').nodes).toHaveLength(2)
  })

  it('makes nothing out of no columns', () => {
    expect(boardCanvas([], 'x')).toEqual({ nodes: [], edges: [] })
  })
})

describe('mindMapCanvas', () => {
  const map = (count: number): CanvasData =>
    mindMapCanvas(
      'Subject',
      Array.from({ length: count }, (_, index) => `Branch ${index + 1}`)
    )

  it('joins every branch to the middle', () => {
    const built = map(4)

    expect(built.edges).toHaveLength(4)
    expect(built.edges.every((edge) => edge.fromNode === 'centre')).toBe(true)
  })

  it('puts the branches round the middle rather than in a column', () => {
    const branches = map(4).nodes.filter((node) => node.id.startsWith('branch-'))
    const xs = new Set(branches.map((node) => node.x))
    const ys = new Set(branches.map((node) => node.y))

    expect(xs.size).toBeGreaterThan(1)
    expect(ys.size).toBeGreaterThan(1)
  })

  it('starts at the top, where the first thing is expected to be', () => {
    const first = map(4).nodes.find((node) => node.id === 'branch-0')!
    const centre = map(4).nodes.find((node) => node.id === 'centre')!

    expect(first.y).toBeLessThan(centre.y)
    expect(Math.abs(first.x - centre.x)).toBeLessThan(10)
  })

  /* An arrow that leaves the far side of the middle crosses it to get out. */
  it('leaves the middle on the side that faces the branch', () => {
    const built = map(4)
    const sides = built.edges.map((edge) => edge.fromSide)

    expect(new Set(sides).size).toBeGreaterThan(1)
  })

  it('spaces any number of branches evenly', () => {
    for (const count of [1, 2, 3, 5, 8]) {
      const built = map(count)

      expect(built.nodes, `${count} branches`).toHaveLength(count + 1)
      expect(built.edges, `${count} branches`).toHaveLength(count)
    }
  })

  it('survives a map with no branches at all', () => {
    const built = mindMapCanvas('Alone', [])

    expect(built.nodes).toHaveLength(1)
    expect(built.edges).toEqual([])
  })
})

describe('timelineCanvas', () => {
  const steps = timelineCanvas(['First', 'Then', 'Finally'])

  it('points each step at the one after it', () => {
    expect(steps.edges.map((edge) => [edge.fromNode, edge.toNode])).toEqual([
      ['step-0', 'step-1'],
      ['step-1', 'step-2']
    ])
  })

  /* A wrapped timeline claims the fourth step follows the first. */
  it('keeps every step on one line', () => {
    expect(new Set(steps.nodes.map((node) => node.y)).size).toBe(1)
  })

  it('leaves the steps in the order they were given', () => {
    const xs = steps.nodes.map((node) => node.x)

    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
  })

  it('does not draw a line out of a single step', () => {
    expect(timelineCanvas(['Only']).edges).toEqual([])
  })
})

describe('every template', () => {
  const built = [board(), mindMapCanvas('S', ['a', 'b']), timelineCanvas(['a', 'b'])]

  it('is offered by the list the picker reads', () => {
    expect(CANVAS_TEMPLATES.length).toBe(4)
    expect(CANVAS_TEMPLATES).not.toContain('blank')
  })

  it('survives being written out and read back', () => {
    for (const canvas of built) {
      expect(parseCanvas(serialiseCanvas(canvas))).toEqual(canvas)
    }
  })

  it('gives every node an id of its own', () => {
    for (const canvas of built) {
      expect(new Set(canvas.nodes.map((node) => node.id)).size).toBe(canvas.nodes.length)
    }
  })

  it('points every edge at a node that exists', () => {
    for (const canvas of built) {
      const ids = new Set(canvas.nodes.map((node) => node.id))

      for (const edge of canvas.edges) {
        expect(ids.has(edge.fromNode)).toBe(true)
        expect(ids.has(edge.toNode)).toBe(true)
      }
    }
  })
})

describe('mergeCanvas', () => {
  const existing: CanvasData = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 100, text: 'mine' }],
    edges: []
  }

  it('keeps what was already there', () => {
    const { canvas } = mergeCanvas(existing, timelineCanvas(['a', 'b']), { x: 0, y: 400 })

    expect(canvas.nodes.find((node) => node.id === 'n1')?.text).toBe('mine')
  })

  /* A template's ids are `step-0`, `branch-1` and so on, every time. Adding
     two of them without minting fresh ones would fuse them together. */
  it('mints ids nothing else is using', () => {
    const once = mergeCanvas(existing, timelineCanvas(['a', 'b']), null)
    const twice = mergeCanvas(once.canvas, timelineCanvas(['a', 'b']), null)

    expect(new Set(twice.canvas.nodes.map((node) => node.id)).size).toBe(5)
    expect(new Set(twice.canvas.edges.map((edge) => edge.id)).size).toBe(2)
  })

  it('remaps the edges onto the new ids', () => {
    const { canvas, ids } = mergeCanvas(existing, timelineCanvas(['a', 'b']), null)
    const [edge] = canvas.edges

    expect(ids).toContain(edge.fromNode)
    expect(ids).toContain(edge.toNode)
  })

  it('places the addition where it was asked to', () => {
    const { canvas, ids } = mergeCanvas(existing, board(), { x: 0, y: 400 })
    const added = canvas.nodes.filter((node) => ids.includes(node.id))

    expect(canvasBounds(added).y).toBe(400)
  })

  it('offsets an addition given no point, so it is never hidden underneath', () => {
    const { canvas, ids } = mergeCanvas(existing, existing, null)
    const added = canvas.nodes.find((node) => ids.includes(node.id))!

    expect(added.x).not.toBe(0)
  })

  it('adds nothing when there is nothing to add', () => {
    const { canvas, ids } = mergeCanvas(existing, { nodes: [], edges: [] }, null)

    expect(canvas).toBe(existing)
    expect(ids).toEqual([])
  })

  /* An edge whose other end was not part of the addition has nowhere to
     point; guessing would draw a connection nobody made. */
  it('drops an edge that reaches outside what is being added', () => {
    const orphaned: CanvasData = {
      nodes: [{ id: 'a', type: 'text', x: 0, y: 0, width: 10, height: 10 }],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'gone' }]
    }

    expect(mergeCanvas(existing, orphaned, null).canvas.edges).toEqual([])
  })
})
