import { describe, expect, it } from 'vitest'

import { combineBook, parseSummary, readingOrder, shiftHeadings } from '@shared'

const SUMMARY = [
  '# Summary',
  '',
  '- [Introduction](intro.md)',
  '- [Part one](one/index.md)',
  '  - [First](one/first.md)',
  '  - [Second](one/second.md)',
  '- [Appendix](appendix.md)'
].join('\n')

describe('parseSummary', () => {
  it('reads titles, paths and nesting', () => {
    const chapters = parseSummary(SUMMARY)

    expect(chapters.map((c) => [c.title, c.path, c.depth])).toEqual([
      ['Summary', null, 0],
      ['Introduction', 'intro.md', 0],
      ['Part one', 'one/index.md', 0],
      ['First', 'one/first.md', 1],
      ['Second', 'one/second.md', 1],
      ['Appendix', 'appendix.md', 0]
    ])
  })

  it('records the line each entry came from', () => {
    expect(parseSummary(SUMMARY).find((c) => c.title === 'First')?.line).toBe(5)
  })

  /*
   * A summary written with tabs or four spaces is just as valid as one with
   * two. Assuming two would flatten the first and double the second.
   */
  it('measures indentation in the units the file uses', () => {
    const fourSpace = '- [a](a.md)\n    - [b](b.md)\n        - [c](c.md)'
    expect(parseSummary(fourSpace).map((c) => c.depth)).toEqual([0, 1, 2])

    const tabs = '- [a](a.md)\n\t- [b](b.md)'
    expect(parseSummary(tabs).map((c) => c.depth)).toEqual([0, 1])
  })

  it('accepts ordered lists', () => {
    expect(parseSummary('1. [a](a.md)\n2. [b](b.md)').map((c) => c.path)).toEqual(['a.md', 'b.md'])
  })

  it('treats an unlinked item as a grouping section', () => {
    const chapters = parseSummary('- Reference\n  - [API](api.md)')
    expect(chapters[0]).toMatchObject({ title: 'Reference', path: null, depth: 0 })
    expect(chapters[1]).toMatchObject({ title: 'API', path: 'api.md', depth: 1 })
  })

  it('falls back to the file name when a link has no label', () => {
    expect(parseSummary('- [](notes/idea.md)')[0].title).toBe('idea')
  })

  it('decodes escaped spaces and normalises separators', () => {
    expect(parseSummary('- [x](my%20notes\\a.md)')[0].path).toBe('my notes/a.md')
  })

  it('ignores prose around the list', () => {
    // Neither the sentence nor the blockquote is an entry; only the link is.
    expect(parseSummary('Some words.\n\n> quoted\n\n- [a](a.md)').map((c) => c.path)).toEqual([
      'a.md'
    ])
  })

  it('is empty for a document with no entries', () => {
    expect(parseSummary('just prose')).toEqual([])
  })
})

describe('readingOrder', () => {
  it('keeps only the entries that point at a file', () => {
    expect(readingOrder(parseSummary(SUMMARY)).map((c) => c.path)).toEqual([
      'intro.md',
      'one/index.md',
      'one/first.md',
      'one/second.md',
      'appendix.md'
    ])
  })
})

describe('shiftHeadings', () => {
  it('pushes every heading down', () => {
    expect(shiftHeadings('# A\n\n## B', 1)).toBe('## A\n\n### B')
  })

  it('stops at level six, because Markdown has no seventh', () => {
    expect(shiftHeadings('##### E\n###### F', 2)).toBe('###### E\n###### F')
  })

  it('changes nothing when asked to shift by zero', () => {
    expect(shiftHeadings('# A', 0)).toBe('# A')
  })

  /* A `#` inside a fence is a comment in someone's code. */
  it('never touches a fenced block', () => {
    const code = '```sh\n# not a heading\n```'
    expect(shiftHeadings(code, 2)).toBe(code)
  })

  it('leaves a hash with no space alone — it is not a heading', () => {
    expect(shiftHeadings('#tag', 1)).toBe('#tag')
  })
})

describe('combineBook', () => {
  const chapters = parseSummary(SUMMARY)
  const at = (title: string) => chapters.find((c) => c.title === title)!

  it('joins chapters in order, shifted by their depth', () => {
    const out = combineBook([
      { chapter: at('Introduction'), markdown: '# Introduction\n\nHello.' },
      { chapter: at('First'), markdown: '# First\n\nBody.' }
    ])

    expect(out).toBe('# Introduction\n\nHello.\n\n## First\n\nBody.\n')
  })

  it('renders an unlinked entry as a heading of its own', () => {
    const out = combineBook([{ chapter: at('Summary'), markdown: '' }])
    expect(out).toBe('# Summary\n')
  })

  it('drops front matter, which belongs to its own file', () => {
    const out = combineBook([
      { chapter: at('Introduction'), markdown: '---\ntitle: x\n---\n# Intro\n' }
    ])
    expect(out).not.toContain('title: x')
    expect(out).toContain('# Intro')
  })

  it('skips a chapter whose file is empty', () => {
    const out = combineBook([
      { chapter: at('Introduction'), markdown: '# Intro' },
      { chapter: at('First'), markdown: '   \n\n' }
    ])
    expect(out).toBe('# Intro\n')
  })

  it('produces an empty document for an empty book', () => {
    expect(combineBook([])).toBe('\n')
  })
})
