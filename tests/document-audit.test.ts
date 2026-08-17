import { describe, expect, it } from 'vitest'

import { auditDocument, slugFor } from '../src/shared/utils/document-audit'

/**
 * The audit tells the user their document is broken, so a false positive is
 * expensive: report enough of them and the panel gets ignored. These cover the
 * cases where a naive scan cries wolf — links inside code samples, anchors that
 * do resolve, and reference-style syntax that is not a link at all.
 */
describe('auditDocument', () => {
  it('counts the structure of a document', () => {
    const audit = auditDocument(
      ['# One', '', 'Some words here.', '', '## Two', '', '```js', 'const a = 1', '```'].join('\n')
    )

    expect(audit.headings).toBe(2)
    expect(audit.codeBlocks).toBe(1)
    expect(audit.words).toBeGreaterThan(0)
  })

  it('ignores links inside fenced code', () => {
    const audit = auditDocument(
      ['[real](./a.md)', '', '```md', '[example](./nope.md)', '```'].join('\n')
    )

    expect(audit.links).toHaveLength(1)
    expect(audit.links[0]?.target).toBe('./a.md')
  })

  it('keeps line numbers right despite blanked code', () => {
    const audit = auditDocument(['```', 'x', '```', '', '[a](./a.md)'].join('\n'))
    expect(audit.links[0]?.line).toBe(5)
  })

  it('classifies each kind of target', () => {
    const audit = auditDocument(
      [
        '[a](https://example.com)',
        '[b](#section)',
        '[c](./relative.md)',
        '[d](mailto:x@y.z)'
      ].join('\n')
    )

    expect(audit.links.map((link) => link.kind)).toEqual([
      'external',
      'anchor',
      'relative',
      'mail'
    ])
  })

  it('tells an image from a link', () => {
    const audit = auditDocument('![alt](a.png)\n\n[text](b.md)')
    expect(audit.images).toBe(1)
    expect(audit.links.filter((link) => !link.image)).toHaveLength(1)
  })

  it('reports an anchor with no matching heading', () => {
    const audit = auditDocument(['# Getting Started', '', '[go](#getting-started)', '[bad](#nope)'].join('\n'))

    expect(audit.danglingAnchors.map((link) => link.target)).toEqual(['#nope'])
  })

  it('finds headings that would collide as anchors', () => {
    const audit = auditDocument('# Install\n\n## Install\n\n### Other')
    expect(audit.duplicateHeadings).toEqual(['install'])
  })

  it('counts tasks and how many are done', () => {
    const audit = auditDocument('- [ ] one\n- [x] two\n- [X] three\n- plain')
    expect(audit.tasks).toEqual({ total: 3, done: 2 })
  })

  it('skips front matter', () => {
    const audit = auditDocument('---\ntitle: X\n---\n\n# Real')
    expect(audit.headings).toBe(1)
  })

  it('returns empty results for an empty document', () => {
    const audit = auditDocument('')
    expect(audit.headings).toBe(0)
    expect(audit.links).toEqual([])
    expect(audit.tasks).toEqual({ total: 0, done: 0 })
  })
})

describe('slugFor', () => {
  it('matches the renderer’s heading ids, including non-Latin scripts', () => {
    expect(slugFor('Getting Started')).toBe('getting-started')
    expect(slugFor('Quraşdırma!')).toBe('quraşdırma')
    expect(slugFor('Установка')).toBe('установка')
  })
})
