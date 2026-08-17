import { describe, expect, it } from 'vitest'

import { slideTitle, splitSlides } from '../src/shared/utils/slides'

/**
 * The splitter decides what the audience sees, so the cases that matter are the
 * ones where a rule is *not* a slide break: inside a fence, and in front matter.
 */
describe('splitSlides', () => {
  it('splits on thematic breaks', () => {
    const slides = splitSlides('# One\n\n---\n\n# Two\n\n---\n\n# Three')
    expect(slides.map((s) => s.markdown)).toEqual(['# One', '# Two', '# Three'])
  })

  it('treats a document with no breaks as one slide', () => {
    expect(splitSlides('# Only\n\ntext')).toHaveLength(1)
  })

  it('returns nothing for an empty document', () => {
    expect(splitSlides('')).toEqual([])
    expect(splitSlides('\n\n   \n')).toEqual([])
  })

  it('ignores a rule inside a fence', () => {
    const slides = splitSlides('# One\n\n```\n---\n```\n\n---\n\n# Two')
    expect(slides).toHaveLength(2)
    expect(slides[0]?.markdown).toContain('---')
  })

  it('does not treat front matter as a break', () => {
    const slides = splitSlides('---\ntitle: x\n---\n\n# One\n\n---\n\n# Two')
    expect(slides.map((s) => s.markdown)).toEqual(['# One', '# Two'])
  })

  it('accepts the other rule characters', () => {
    expect(splitSlides('a\n\n***\n\nb')).toHaveLength(2)
    expect(splitSlides('a\n\n___\n\nb')).toHaveLength(2)
  })

  it('reports the line each slide starts on', () => {
    const slides = splitSlides('# One\n\n---\n\n# Two')
    expect(slides[0]?.line).toBe(1)
    expect(slides[1]?.line).toBe(4)
  })

  it('drops slides that are only whitespace', () => {
    expect(splitSlides('# One\n\n---\n\n   \n\n---\n\n# Two')).toHaveLength(2)
  })
})

describe('slideTitle', () => {
  it('uses the first heading', () => {
    expect(slideTitle({ markdown: 'text\n\n## Real Title', line: 1 })).toBe('Real Title')
  })

  it('falls back to the first non-empty line', () => {
    expect(slideTitle({ markdown: '\n\nJust prose here', line: 1 })).toBe('Just prose here')
  })

  it('is empty for an empty slide', () => {
    expect(slideTitle({ markdown: '   ', line: 1 })).toBe('')
  })
})
