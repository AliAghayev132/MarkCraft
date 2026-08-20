import { describe, expect, it } from 'vitest'

import {
  canvasToSvg,
  drawableLines,
  escapeXml,
  timelineCanvas,
  wrapLine,
  type CanvasData,
  type SvgTheme
} from '@shared'

/**
 * A canvas as a picture.
 *
 * The export has one job nothing else has: it leaves the application. A file
 * that only draws correctly inside a running window — because it kept a CSS
 * custom property, or smuggled HTML into a `foreignObject` — is a file that
 * arrives blank in somebody's inbox, and nothing in the editor would ever show
 * that.
 */

const theme: SvgTheme = {
  background: '#ffffff',
  card: '#f6f7f9',
  line: '#e3e6ec',
  ink: '#1b1f27',
  muted: '#5b6472',
  colour: (color) => (color === '3' ? '#e0b341' : color?.startsWith('#') ? color : null)
}

const card = (over: Partial<CanvasData['nodes'][number]> = {}): CanvasData['nodes'][number] => ({
  id: 'n1',
  type: 'text',
  x: 0,
  y: 0,
  width: 200,
  height: 120,
  text: 'Hello',
  ...over
})

describe('wrapLine', () => {
  it('breaks between words', () => {
    expect(wrapLine('one two three four', 9)).toEqual(['one two', 'three', 'four'])
  })

  it('keeps a line that already fits', () => {
    expect(wrapLine('short', 20)).toEqual(['short'])
  })

  /* A URL is one word and longer than any card; letting it run would put it
     outside the shape the reader can see. */
  it('cuts a word too long for the line', () => {
    expect(wrapLine('https://example.com/a/very/long/path', 10)).toEqual([
      'https://ex',
      'ample.com/',
      'a/very/lon',
      'g/path'
    ])
  })

  it('collapses the whitespace it breaks on', () => {
    expect(wrapLine('one    two', 20)).toEqual(['one two'])
  })

  it('makes nothing out of nothing', () => {
    expect(wrapLine('', 20)).toEqual([])
  })
})

describe('drawableLines', () => {
  it('marks a heading as one and takes its hashes off', () => {
    expect(drawableLines('## Agenda', 40)).toEqual([{ text: 'Agenda', heading: true }])
  })

  it('keeps a bullet visible as a bullet', () => {
    expect(drawableLines('- first', 40)[0].text).toBe('• first')
  })

  it('takes the punctuation off emphasis', () => {
    expect(drawableLines('**bold** and *italic* and `code`', 60)[0].text).toBe(
      'bold and italic and code'
    )
  })

  /* An export is a picture, and a picture cannot follow a link. */
  it('keeps a link’s words and drops its address', () => {
    expect(drawableLines('see [the notes](notes.md)', 60)[0].text).toBe('see the notes')
  })

  it('keeps a blank line, so two paragraphs stay two', () => {
    expect(drawableLines('one\n\ntwo', 40).map((line) => line.text)).toEqual(['one', '', 'two'])
  })

  it('does not make a card taller for trailing blank lines', () => {
    expect(drawableLines('one\n\n\n', 40)).toHaveLength(1)
  })

  it('wraps a long line into several', () => {
    expect(drawableLines('one two three four five six', 10).length).toBeGreaterThan(1)
  })
})

describe('escapeXml', () => {
  it('escapes everything XML reserves', () => {
    expect(escapeXml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;')
  })

  it('leaves ordinary prose alone', () => {
    expect(escapeXml('Ödəniş — 5 gün')).toBe('Ödəniş — 5 gün')
  })
})

describe('canvasToSvg', () => {
  const simple: CanvasData = { nodes: [card()], edges: [] }

  it('produces a document a reader will accept', () => {
    const svg = canvasToSvg(simple, { theme })

    expect(svg.startsWith('<?xml')).toBe(true)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
  })

  /* The whole reason this module takes a theme rather than reading one. */
  it('leaves no custom property behind for another program to fail on', () => {
    const coloured: CanvasData = {
      nodes: [card({ color: '3' }), card({ id: 'n2', x: 300, color: '#123456' })],
      edges: []
    }

    expect(canvasToSvg(coloured, { theme })).not.toContain('var(--')
  })

  it('smuggles no HTML into the picture', () => {
    expect(canvasToSvg(simple, { theme })).not.toContain('foreignObject')
  })

  it('draws the writing as text, so it can be selected and searched', () => {
    expect(canvasToSvg(simple, { theme })).toContain('>Hello<')
  })

  it('escapes writing that would otherwise be markup', () => {
    const risky: CanvasData = { nodes: [card({ text: '<script>alert(1)</script>' })], edges: [] }
    const svg = canvasToSvg(risky, { theme })

    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
  })

  it('leaves room round the drawing', () => {
    const svg = canvasToSvg(simple, { theme, padding: 60 })

    expect(svg).toContain('viewBox="-60 -60 320 240"')
  })

  it('scales the picture without moving what is in it', () => {
    const svg = canvasToSvg(simple, { theme, padding: 0, scale: 2 })

    expect(svg).toContain('width="400"')
    expect(svg).toContain('viewBox="0 0 200 120"')
  })

  it('draws each shape as itself', () => {
    const shapes: CanvasData = {
      nodes: [
        card({ id: 'a', shape: 'ellipse' }),
        card({ id: 'b', x: 300, shape: 'diamond' }),
        card({ id: 'c', x: 600, shape: 'triangle' }),
        card({ id: 'd', x: 900, shape: 'rounded' })
      ],
      edges: []
    }
    const svg = canvasToSvg(shapes, { theme })

    expect(svg).toContain('<ellipse')
    expect(svg.match(/<polygon/g)).toHaveLength(2)
    expect(svg).toContain('rx="28"')
  })

  /* A `plain` node is writing with nothing drawn round it. */
  it('draws no box round a plain node, but still draws its words', () => {
    const svg = canvasToSvg({ nodes: [card({ shape: 'plain', text: 'Title' })], edges: [] }, { theme })

    expect(svg).not.toContain('<rect x="0"')
    expect(svg).toContain('>Title<')
  })

  it('draws the lines between cards, with an arrow on each', () => {
    const svg = canvasToSvg(timelineCanvas(['one', 'two', 'three']), { theme })

    // Counted by the arrowheads: the marker definition is a path too.
    expect(svg.match(/marker-end=/g)?.length).toBe(2)
  })

  it('gives a marker an id an XML parser will accept', () => {
    const svg = canvasToSvg(timelineCanvas(['one', 'two']), { theme })
    const ids = [...svg.matchAll(/id="(arrow-[^"]+)"/g)].map((match) => match[1])

    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(id).toMatch(/^arrow-[a-z0-9]+$/)
  })

  it('writes an edge label where the line is', () => {
    const labelled: CanvasData = {
      nodes: [card({ id: 'a' }), card({ id: 'b', x: 400 })],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'b', label: 'then' }]
    }

    expect(canvasToSvg(labelled, { theme })).toContain('>then<')
  })

  it('ignores an edge whose ends are not both there', () => {
    const dangling: CanvasData = {
      nodes: [card({ id: 'a' })],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'missing' }]
    }

    expect(canvasToSvg(dangling, { theme })).not.toContain('marker-end')
  })

  it('says what a file card and a link card point at', () => {
    const others: CanvasData = {
      nodes: [
        card({ id: 'f', type: 'file', file: 'notes.md', text: undefined }),
        card({ id: 'l', type: 'link', x: 300, url: 'https://example.com', text: undefined })
      ],
      edges: []
    }
    const svg = canvasToSvg(others, { theme })

    expect(svg).toContain('notes.md')
    expect(svg).toContain('example.com')
  })

  it('draws an empty canvas without falling over', () => {
    const svg = canvasToSvg({ nodes: [], edges: [] }, { theme })

    expect(svg).toContain('</svg>')
  })
})
