import { describe, expect, it } from 'vitest'

import { backlinksOf, buildLinkGraph, extractLinks } from '@shared'

describe('extractLinks', () => {
  it('finds wiki links and relative Markdown links', () => {
    const found = extractLinks('See [[Idea]] and [notes](../notes/plan.md).')
    expect(found).toEqual([
      { target: 'Idea', wiki: true, line: 1 },
      { target: '../notes/plan.md', wiki: false, line: 1 }
    ])
  })

  it('ignores external targets and bare anchors', () => {
    const found = extractLinks('[a](https://x.com) [b](mailto:x@y.z) [c](#section) [d](//cdn/x)')
    expect(found).toEqual([])
  })

  it('ignores images', () => {
    expect(extractLinks('![alt](picture.png)')).toEqual([])
  })

  /*
   * The two ways a link-scanner embarrasses itself: counting the examples in
   * its own documentation, and counting the contents of a code sample.
   */
  it('ignores links inside fences and inline code', () => {
    const markdown = ['`[[not a link]]`', '', '```md', '[[also not]]', '```', '', '[[real]]'].join('\n')
    expect(extractLinks(markdown).map((link) => link.target)).toEqual(['real'])
  })

  it('reports the line, and decodes escaped spaces', () => {
    const found = extractLinks('one\n\n[x](my%20note.md)')
    expect(found[0]).toEqual({ target: 'my note.md', wiki: false, line: 3 })
  })

  it('takes the file from a labelled wiki link', () => {
    expect(extractLinks('[[idea|see this]]')[0].target).toBe('idea')
  })
})

const FILES = [
  { path: 'index.md', markdown: 'Start at [[Idea]] and [plan](notes/plan.md).' },
  { path: 'notes/idea.md', markdown: 'Back to [home](../index.md) and [[Plan]].' },
  { path: 'notes/plan.md', markdown: 'Nothing here links out.' }
]

describe('buildLinkGraph', () => {
  const graph = buildLinkGraph(FILES)

  it('resolves a wiki link by file name from any folder', () => {
    expect(graph.edges).toContainEqual({ from: 'index.md', to: 'notes/idea.md' })
  })

  it('resolves a relative link, including one that walks up', () => {
    expect(graph.edges).toContainEqual({ from: 'index.md', to: 'notes/plan.md' })
    expect(graph.edges).toContainEqual({ from: 'notes/idea.md', to: 'index.md' })
  })

  it('counts links in both directions', () => {
    const idea = graph.nodes.find((node) => node.path === 'notes/idea.md')
    expect(idea).toMatchObject({ title: 'idea', outgoing: 2, incoming: 1 })
  })

  it('resolves an extension-less link', () => {
    const built = buildLinkGraph([
      { path: 'a.md', markdown: '[x](b)' },
      { path: 'b.md', markdown: '' }
    ])
    expect(built.edges).toEqual([{ from: 'a.md', to: 'b.md' }])
  })

  it('reports a target that resolves to nothing', () => {
    const built = buildLinkGraph([{ path: 'a.md', markdown: 'go to [[nowhere]]' }])
    expect(built.broken).toEqual([{ from: 'a.md', target: 'nowhere', line: 1 }])
    expect(built.edges).toEqual([])
  })

  /*
   * Picking one of two files with the same name would send the user somewhere
   * plausible and wrong — much harder to notice than a link reported broken.
   */
  it('refuses to guess when a wiki name is ambiguous', () => {
    const built = buildLinkGraph([
      { path: 'a.md', markdown: '[[note]]' },
      { path: 'one/note.md', markdown: '' },
      { path: 'two/note.md', markdown: '' }
    ])
    expect(built.edges).toEqual([])
    expect(built.broken).toHaveLength(1)
  })

  it('counts two links to the same document once', () => {
    const built = buildLinkGraph([
      { path: 'a.md', markdown: '[[b]] and again [[b]] and [x](b.md)' },
      { path: 'b.md', markdown: '' }
    ])
    expect(built.edges).toEqual([{ from: 'a.md', to: 'b.md' }])
  })

  it('does not make a self-link an edge or a break', () => {
    const built = buildLinkGraph([{ path: 'a.md', markdown: '[[a]]' }])
    expect(built.edges).toEqual([])
    expect(built.broken).toEqual([])
  })
})

describe('backlinksOf', () => {
  it('lists the documents pointing at one', () => {
    const graph = buildLinkGraph(FILES)
    expect(backlinksOf(graph, 'notes/plan.md').map((node) => node.path)).toEqual([
      'index.md',
      'notes/idea.md'
    ])
  })

  it('is empty for a document nothing links to', () => {
    expect(backlinksOf(buildLinkGraph(FILES), 'index.md').map((n) => n.path)).toEqual([
      'notes/idea.md'
    ])
  })
})
