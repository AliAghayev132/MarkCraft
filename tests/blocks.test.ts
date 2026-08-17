import { describe, expect, it } from 'vitest'

import { parseBlocks, parseInline } from '@shared'

describe('parseInline', () => {
  it('splits plain text from emphasis', () => {
    expect(parseInline('a **b** c')).toEqual([
      { text: 'a ' },
      { text: 'b', bold: true },
      { text: ' c' }
    ])
  })

  /* `**` must not eat the outer pair of `***both***`. */
  it('reads triple emphasis as both marks', () => {
    expect(parseInline('***both***')).toEqual([{ text: 'both', bold: true, italic: true }])
  })

  it('marks code, italics and strikethrough', () => {
    expect(parseInline('`c`')).toEqual([{ text: 'c', code: true }])
    expect(parseInline('_i_')).toEqual([{ text: 'i', italic: true }])
    expect(parseInline('~~s~~')).toEqual([{ text: 's', strike: true }])
  })

  it('keeps link words and drops the target', () => {
    expect(parseInline('see [docs](https://x.com) now')).toEqual([
      { text: 'see ' },
      { text: 'docs', link: true },
      { text: ' now' }
    ])
  })

  it('drops images entirely', () => {
    expect(parseInline('a ![alt](p.png) b')).toEqual([{ text: 'a ' }, { text: ' b' }])
  })

  it('produces nothing for an empty string', () => {
    expect(parseInline('')).toEqual([])
  })
})

describe('parseBlocks', () => {
  const kinds = (markdown: string): string[] => parseBlocks(markdown).map((b) => b.kind)

  it('identifies each block kind', () => {
    expect(
      kinds('# H\n\ntext\n\n- b\n\n1. o\n\n- [ ] t\n\n> q\n\n---\n\n```\nc\n```')
    ).toEqual(['heading', 'paragraph', 'bullet', 'ordered', 'task', 'quote', 'rule', 'code'])
  })

  it('records the heading level', () => {
    const [block] = parseBlocks('### Third')
    expect(block).toMatchObject({ kind: 'heading', level: 3 })
  })

  it('numbers ordered items itself and restarts after a blank line', () => {
    const blocks = parseBlocks('1. a\n1. b\n\n1. c')
    expect(blocks.map((b) => ('index' in b ? b.index : null))).toEqual([1, 2, 1])
  })

  it('reads the state of a task box', () => {
    expect(parseBlocks('- [x] done\n- [ ] todo').map((b) => ('done' in b ? b.done : null))).toEqual([
      true,
      false
    ])
  })

  /* Everything inside a fence is code — asterisks included. */
  it('never marks up fenced content', () => {
    const blocks = parseBlocks('```js\nconst a = **not bold**\n```')
    expect(blocks).toEqual([{ kind: 'code', text: 'const a = **not bold**' }])
  })

  it('leaves front matter out', () => {
    expect(kinds('---\ntitle: x\n---\nBody.')).toEqual(['paragraph'])
  })

  it('is empty for an empty document', () => {
    expect(parseBlocks('')).toEqual([])
  })
})
