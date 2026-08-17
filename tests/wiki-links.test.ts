import { describe, expect, it } from 'vitest'

import { withWikiLinks } from '@features/editor/markdown'

import { remarkParse, unified } from '@lib/markdown/unified'

import type { MdastRoot } from '@lib/markdown/unified'

/**
 * `[[note]]` is a text substitution, and the two ways to get it wrong are
 * rewriting something that is not prose — code, an existing link — and losing
 * the text around the match.
 */
function transform(markdown: string): MdastRoot {
  const tree = unified().use(remarkParse).parse(markdown) as unknown as MdastRoot
  return withWikiLinks(tree)
}

/** Every link in the tree, as `[url, label]`. */
function links(tree: MdastRoot): [string, string][] {
  const found: [string, string][] = []

  const walk = (node: { type: string; url?: string; children?: unknown[]; value?: string }): void => {
    if (node.type === 'link') {
      const label = (node.children ?? [])
        .map((child) => (child as { value?: string }).value ?? '')
        .join('')
      found.push([node.url ?? '', label])
    }
    for (const child of (node.children ?? []) as typeof node[]) walk(child)
  }

  walk(tree as never)
  return found
}

function text(tree: MdastRoot): string {
  let out = ''
  const walk = (node: { type: string; value?: string; children?: unknown[] }): void => {
    if (node.type === 'text') out += node.value ?? ''
    for (const child of (node.children ?? []) as typeof node[]) walk(child)
  }
  walk(tree as never)
  return out
}

describe('withWikiLinks', () => {
  it('turns a bare name into a .md link', () => {
    expect(links(transform('See [[Another note]] for more.'))).toEqual([
      ['Another note.md', 'Another note']
    ])
  })

  it('supports an explicit label', () => {
    expect(links(transform('[[targets|the targets]]'))).toEqual([['targets.md', 'the targets']])
  })

  it('keeps an extension the author already wrote', () => {
    expect(links(transform('[[diagram.svg]]'))).toEqual([['diagram.svg', 'diagram.svg']])
  })

  it('keeps the text on either side of the match', () => {
    // The label is a text node inside the link, so the rendered text is
    // unchanged — which is exactly what a reader should see.
    expect(text(transform('before [[x]] after'))).toBe('before x after')
  })

  it('handles two links on one line', () => {
    expect(links(transform('[[one]] and [[two]]'))).toEqual([
      ['one.md', 'one'],
      ['two.md', 'two']
    ])
  })

  it('leaves inline code alone', () => {
    expect(links(transform('use `[[literal]]` here'))).toEqual([])
  })

  it('leaves fenced code alone', () => {
    expect(links(transform('```\n[[not a link]]\n```'))).toEqual([])
  })

  it('does not touch an ordinary link', () => {
    expect(links(transform('[label](file.md)'))).toEqual([['file.md', 'label']])
  })

  it('ignores an unclosed bracket', () => {
    expect(links(transform('[[unclosed'))).toEqual([])
  })

  it('ignores an empty target', () => {
    expect(links(transform('[[]]'))).toEqual([])
  })

  it('finds links inside emphasis and headings', () => {
    expect(links(transform('# A [[heading link]]'))).toHaveLength(1)
    expect(links(transform('*see [[this]]*'))).toHaveLength(1)
  })

  it('leaves a document with no wiki links untouched', () => {
    const markdown = 'Just prose, with [a link](x.md) and `code`.'
    expect(links(transform(markdown))).toEqual([['x.md', 'a link']])
  })
})
