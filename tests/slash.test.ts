import { describe, expect, it } from 'vitest'

import { matchSlash, rankSlash } from '@shared'

describe('matchSlash', () => {
  it('triggers at the start of a line', () => {
    expect(matchSlash('/')).toEqual({ query: '', length: 1 })
    expect(matchSlash('/head')).toEqual({ query: 'head', length: 5 })
  })

  it('triggers after a space', () => {
    expect(matchSlash('Some text /tab')).toEqual({ query: 'tab', length: 4 })
  })

  /*
   * The cases that would make the menu a nuisance rather than a feature: each
   * of these is ordinary Markdown that a writer types without wanting a menu.
   */
  it('stays closed inside paths, URLs and words', () => {
    for (const before of ['src/renderer', 'https://example.com', 'and/or', '24/7', 'a/b/c']) {
      expect(matchSlash(before)).toBeNull()
    }
  })

  it('closes once the query becomes a sentence', () => {
    expect(matchSlash('/head ing')).toBeNull()
  })

  it('reports the length to delete, including the slash', () => {
    const trigger = matchSlash('- /code')
    expect(trigger?.length).toBe(5)
    expect('- /code'.slice(0, -(trigger?.length ?? 0))).toBe('- ')
  })
})

const ITEMS = [
  { id: 'code', label: 'Inline code' },
  { id: 'bullet', label: 'Bullet list', keywords: ['ul', 'unordered'] },
  { id: 'link', label: 'Link' }
]

describe('rankSlash', () => {
  it('returns everything for an empty query, in definition order', () => {
    expect(rankSlash(ITEMS, '').map((item) => item.id)).toEqual(['code', 'bullet', 'link'])
  })

  it('puts a label prefix ahead of a mid-word match', () => {
    // "Link" starts with `l`; "Inline code" and "Bullet list" only contain one.
    expect(rankSlash(ITEMS, 'l')[0].id).toBe('link')
  })

  it('matches keywords', () => {
    expect(rankSlash(ITEMS, 'ul').map((item) => item.id)).toEqual(['bullet'])
  })

  it('ranks a keyword prefix above a label substring', () => {
    // "Ta-bl-e" contains it; "blockquote" starts with it, so Quote comes first.
    const items = [{ id: 'a', label: 'Table' }, { id: 'b', label: 'Quote', keywords: ['blockquote'] }]
    expect(rankSlash(items, 'bl').map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('drops what does not match at all', () => {
    expect(rankSlash(ITEMS, 'zzz')).toEqual([])
  })

  it('ignores case and surrounding space', () => {
    expect(rankSlash(ITEMS, ' BULLET ').map((item) => item.id)).toEqual(['bullet'])
  })
})
