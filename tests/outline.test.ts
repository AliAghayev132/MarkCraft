import { describe, expect, it } from 'vitest'

import { activeHeading, filterOutline, parseOutline } from '@features/outline'

/**
 * The outline is parsed from the Markdown text, not from the rendered preview,
 * so it works in source-only mode and costs nothing to keep in step. That makes
 * the parser the whole feature — and the two things it must never get wrong are
 * a `#` inside a fenced code block and a `#` inside front matter, both of which
 * are ordinary content in a technical document.
 */

describe('parseOutline', () => {
  it('finds ATX headings with their level and line', () => {
    const outline = parseOutline('# One\n\ntext\n\n## Two\n\n### Three\n')

    expect(outline).toEqual([
      { line: 1, level: 1, text: 'One' },
      { line: 5, level: 2, text: 'Two' },
      { line: 7, level: 3, text: 'Three' }
    ])
  })

  it('ignores a hash inside a fenced code block', () => {
    const outline = parseOutline('# Real\n\n```sh\n# not a heading\necho hi\n```\n\n## Also real\n')
    expect(outline.map((h) => h.text)).toEqual(['Real', 'Also real'])
  })

  it('handles tilde fences and a fence that never closes', () => {
    expect(parseOutline('~~~\n# hidden\n~~~\n## seen\n').map((h) => h.text)).toEqual(['seen'])
    expect(parseOutline('```\n# hidden\n# still hidden\n').map((h) => h.text)).toEqual([])
  })

  it('ignores headings inside front matter', () => {
    const outline = parseOutline('---\ntitle: x\n# not a heading\n---\n\n# Real\n')
    expect(outline.map((h) => h.text)).toEqual(['Real'])
  })

  it('treats a lone --- as content, not front matter', () => {
    expect(parseOutline('# First\n\n---\n\n# Second\n').map((h) => h.text)).toEqual([
      'First',
      'Second'
    ])
  })

  it('strips inline syntax so the outline reads as prose', () => {
    const outline = parseOutline('# `code` and **bold** and [a link](http://x)\n')
    expect(outline[0]?.text).toBe('code and bold and a link')
  })

  it('drops closing hashes', () => {
    expect(parseOutline('## Title ##\n')[0]?.text).toBe('Title')
  })

  it('requires a space after the hashes', () => {
    expect(parseOutline('#NotAHeading\n')).toEqual([])
    expect(parseOutline('#hashtag something\n')).toEqual([])
  })

  it('ignores a heading indented as code', () => {
    expect(parseOutline('    # indented four spaces\n')).toEqual([])
    expect(parseOutline('   # indented three\n').map((h) => h.text)).toEqual(['indented three'])
  })

  it('skips a heading whose text is only syntax', () => {
    expect(parseOutline('# **__**\n')).toEqual([])
  })

  it('stops at six levels', () => {
    expect(parseOutline('####### seven\n')).toEqual([])
    expect(parseOutline('###### six\n')[0]?.level).toBe(6)
  })

  it('returns nothing for a document with no headings', () => {
    expect(parseOutline('Just a paragraph.\n\nAnd another.')).toEqual([])
    expect(parseOutline('')).toEqual([])
  })
})

describe('activeHeading', () => {
  const outline = parseOutline('# One\n\ntext\n\n## Two\n\nmore\n\n# Three\n')

  it('is the last heading at or above the line', () => {
    expect(activeHeading(outline, 1)?.text).toBe('One')
    expect(activeHeading(outline, 4)?.text).toBe('One')
    expect(activeHeading(outline, 5)?.text).toBe('Two')
    expect(activeHeading(outline, 9)?.text).toBe('Three')
  })

  it('is null above the first heading', () => {
    expect(activeHeading(parseOutline('intro\n\n# One\n'), 1)).toBeNull()
  })

  it('is null when there are no headings', () => {
    expect(activeHeading([], 10)).toBeNull()
  })
})

describe('filterOutline', () => {
  const outline = parseOutline('# Guide\n\n## Install\n\n### Windows\n\n## Usage\n')

  it('returns everything for an empty query', () => {
    expect(filterOutline(outline, '  ')).toHaveLength(4)
  })

  it('keeps the ancestors of a match, so a hit is not orphaned', () => {
    // "Windows" is three levels down; without its parents it would appear to
    // belong to the document root.
    expect(filterOutline(outline, 'windows').map((h) => h.text)).toEqual([
      'Guide',
      'Install',
      'Windows'
    ])
  })

  it('matches case-insensitively', () => {
    expect(filterOutline(outline, 'USAGE').map((h) => h.text)).toEqual(['Guide', 'Usage'])
  })

  it('returns nothing when nothing matches', () => {
    expect(filterOutline(outline, 'zzz')).toEqual([])
  })
})
