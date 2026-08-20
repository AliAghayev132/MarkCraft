import { describe, expect, it } from 'vitest'

import {
  canvasToMarkdown,
  gridLayout,
  inReadingOrder,
  markdownToCanvas,
  sectionsOf,
  type CanvasData,
  type CanvasNode
} from '@shared'

/**
 * Across, and back.
 *
 * A canvas and a document are the same notes arranged differently, and neither
 * direction is lossless — going one way drops where things were, coming back
 * invents where they should go. What is tested is that each produces something
 * a person would have written, and that nothing they wrote disappears.
 */
const card = (over: Partial<CanvasNode> & { id: string }): CanvasNode => ({
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 120,
  ...over
})

describe('reading order', () => {
  it('goes down the canvas', () => {
    const nodes = [card({ id: 'b', y: 300 }), card({ id: 'a', y: 0 })]
    expect(inReadingOrder(nodes).map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('goes across within a band, the way anybody reads a wall of notes', () => {
    // Three pixels apart is side by side, not one above the other.
    const nodes = [card({ id: 'right', x: 400, y: 3 }), card({ id: 'left', x: 0, y: 0 })]
    expect(inReadingOrder(nodes).map((n) => n.id)).toEqual(['left', 'right'])
  })

  it('treats a real gap as a new row', () => {
    const nodes = [card({ id: 'below', x: 0, y: 400 }), card({ id: 'above', x: 900, y: 0 })]
    expect(inReadingOrder(nodes).map((n) => n.id)).toEqual(['above', 'below'])
  })
})

describe('a canvas read as a document', () => {
  it('turns a group into a heading with its contents under it', () => {
    const canvas: CanvasData = {
      nodes: [
        card({ id: 'g', type: 'group', x: -20, y: -20, width: 400, height: 400, label: 'Ideas' }),
        card({ id: 'a', x: 0, y: 0, text: 'First thought' }),
        card({ id: 'b', x: 0, y: 200, text: 'Second thought' })
      ],
      edges: []
    }

    expect(canvasToMarkdown(canvas)).toBe('## Ideas\n\nFirst thought\n\nSecond thought\n')
  })

  it('keeps a card that is in no group', () => {
    const canvas: CanvasData = {
      nodes: [
        card({ id: 'g', type: 'group', x: 0, y: 0, width: 300, height: 300, label: 'Ideas' }),
        card({ id: 'loose', x: 900, y: 0, text: 'On its own' })
      ],
      edges: []
    }

    expect(canvasToMarkdown(canvas)).toContain('On its own')
  })

  it('keeps an empty group, which is a section somebody meant to fill in', () => {
    const canvas: CanvasData = {
      nodes: [card({ id: 'g', type: 'group', width: 300, height: 300, label: 'Later' })],
      edges: []
    }

    expect(canvasToMarkdown(canvas)).toContain('## Later')
  })

  it('writes a file card as a link this application follows', () => {
    const canvas: CanvasData = {
      nodes: [card({ id: 'f', type: 'file', file: 'notes/one.md' })],
      edges: []
    }

    expect(canvasToMarkdown(canvas)).toContain('[[notes/one.md]]')
  })

  it('lists the lines, because a line is something somebody drew', () => {
    const canvas: CanvasData = {
      nodes: [card({ id: 'a', text: 'Cause' }), card({ id: 'b', x: 400, text: 'Effect' })],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'b', label: 'leads to' }]
    }
    const markdown = canvasToMarkdown(canvas)

    expect(markdown).toContain('## Connections')
    expect(markdown).toContain('- Cause → Effect (leads to)')
  })

  it('names a card by its first line, without the heading marker', () => {
    const canvas: CanvasData = {
      nodes: [
        card({ id: 'a', text: '## The plan\n\nDetails' }),
        card({ id: 'b', x: 400, text: 'Other' })
      ],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'b' }]
    }

    expect(canvasToMarkdown(canvas)).toContain('- The plan → Other')
  })

  it('takes a title when it is given one', () => {
    const canvas: CanvasData = { nodes: [card({ id: 'a', text: 'Hello' })], edges: [] }
    expect(canvasToMarkdown(canvas, { title: 'My canvas' }).startsWith('# My canvas')).toBe(true)
  })

  it('produces nothing but a newline for an empty canvas', () => {
    expect(canvasToMarkdown({ nodes: [], edges: [] })).toBe('\n')
  })
})

describe('splitting a document', () => {
  it('finds the headings', () => {
    const sections = sectionsOf('# One\n\ntext\n\n## Two\n\nmore')
    expect(sections.map((s) => [s.level, s.heading])).toEqual([
      [1, 'One'],
      [2, 'Two']
    ])
  })

  it('keeps what comes before the first heading', () => {
    const sections = sectionsOf('An opening line\n\n# One')
    expect(sections[0].level).toBe(0)
    expect(sections[0].body.join('\n')).toContain('An opening line')
  })

  it('is empty for an empty document', () => {
    expect(sectionsOf('')).toEqual([])
  })
})

describe('a document laid out as a canvas', () => {
  const markdown = '# Plan\n\nThe overview\n\n## First\n\nOne\n\n## Second\n\nTwo\n'

  it('makes a card for every heading', () => {
    expect(markdownToCanvas(markdown).nodes).toHaveLength(3)
  })

  it('keeps the heading and what follows it together', () => {
    const [first] = markdownToCanvas(markdown).nodes
    expect(first.text).toBe('# Plan\n\nThe overview')
  })

  it('puts a deeper heading in the next column', () => {
    const [top, second] = markdownToCanvas(markdown).nodes
    expect(second.x).toBeGreaterThan(top.x)
  })

  it('puts siblings under each other, not on top of each other', () => {
    const [, first, second] = markdownToCanvas(markdown).nodes
    expect(second.y).toBeGreaterThan(first.y)
    expect(second.x).toBe(first.x)
  })

  it('joins each section to the one it came under', () => {
    const canvas = markdownToCanvas(markdown)
    expect(canvas.edges).toHaveLength(2)
    for (const edge of canvas.edges) expect(edge.fromNode).toBe('n1')
  })

  it('does not join a later sibling to a cousin', () => {
    const canvas = markdownToCanvas('# A\n\n## A1\n\n### A1a\n\n## A2\n')
    const parents = new Map(canvas.edges.map((edge) => [edge.toNode, edge.fromNode]))

    // A2 belongs to A, not to A1a.
    expect(parents.get('n4')).toBe('n1')
  })

  it('gives an empty document an empty canvas', () => {
    expect(markdownToCanvas('')).toEqual({ nodes: [], edges: [] })
  })

  it('round-trips a document through a canvas without losing its words', () => {
    const canvas = markdownToCanvas(markdown)
    const back = canvasToMarkdown(canvas)

    for (const word of ['Plan', 'The overview', 'First', 'One', 'Second', 'Two']) {
      expect(back).toContain(word)
    }
  })
})

describe('tidying a canvas into a grid', () => {
  const scattered: CanvasData = {
    nodes: [
      card({ id: 'a', x: 13, y: 7 }),
      card({ id: 'b', x: 411, y: 93 }),
      card({ id: 'c', x: 77, y: 402 }),
      card({ id: 'd', x: 903, y: 11 })
    ],
    edges: []
  }

  it('puts them on a grid', () => {
    const tidy = gridLayout(scattered, ['a', 'b', 'c', 'd'])
    const xs = new Set(tidy.nodes.map((n) => n.x))
    const ys = new Set(tidy.nodes.map((n) => n.y))

    // Four cards: two columns and two rows.
    expect(xs.size).toBe(2)
    expect(ys.size).toBe(2)
  })

  it('keeps them roughly square rather than in one long row', () => {
    const many: CanvasData = {
      nodes: Array.from({ length: 9 }, (_, at) => card({ id: `n${at}`, x: at * 17, y: at * 3 })),
      edges: []
    }
    const tidy = gridLayout(
      many,
      many.nodes.map((n) => n.id)
    )

    expect(new Set(tidy.nodes.map((n) => n.x)).size).toBe(3)
  })

  it('leaves one card alone — there is no grid of one', () => {
    expect(gridLayout(scattered, ['a'])).toBe(scattered)
  })

  it('leaves the cards it was not given where they are', () => {
    const tidy = gridLayout(scattered, ['a', 'b'])
    expect(tidy.nodes.find((n) => n.id === 'd')?.x).toBe(903)
  })
})
