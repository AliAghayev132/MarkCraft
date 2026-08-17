import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared'
import {
  checkNormalization,
  normalizeMarkdown,
  parseMarkdown,
  serializeMarkdown
} from '@features/editor/markdown'
import { computeStats } from '@features/editor/markdown'

const markdown = DEFAULT_SETTINGS.markdown

/**
 * The round-trip contract.
 *
 * The rich editor serialises through this path, so anything that survives a
 * round-trip here is safe to edit in WYSIWYG mode — and anything that does not
 * is a real risk of data loss. These are the highest-value tests in the suite.
 */
describe('markdown round-trip', () => {
  const stable = [
    ['heading', '# Title\n'],
    ['paragraph', 'Some ordinary prose.\n'],
    ['bold and italic', 'A **bold** and _italic_ sentence.\n'],
    ['inline code', 'Call `render()` first.\n'],
    ['bullet list', '- one\n- two\n- three\n'],
    ['nested list', '- one\n  - nested\n- two\n'],
    ['ordered list', '1. one\n2. two\n'],
    ['task list', '- [ ] todo\n- [x] done\n'],
    ['blockquote', '> A quotation.\n'],
    ['fenced code', '```js\nconsole.log(1)\n```\n'],
    ['link', 'See [the docs](https://example.com).\n'],
    ['image', '![Diagram](./images/a.png)\n'],
    ['thematic break', '---\n'],
    ['strikethrough', 'This is ~~gone~~.\n'],
    ['table', '| a | b |\n| - | - |\n| 1 | 2 |\n']
  ] as const

  for (const [name, source] of stable) {
    it(`is idempotent for ${name}`, () => {
      const once = normalizeMarkdown(source, markdown)
      const twice = normalizeMarkdown(once, markdown)
      // Idempotence is the property that matters: normalising an already
      // normalised document must never keep changing it.
      expect(twice).toBe(once)
    })
  }

  it('preserves document structure through parse and serialize', () => {
    const source = '# Title\n\nText with **bold**.\n\n- a\n- b\n'
    const output = serializeMarkdown(parseMarkdown(source, true), markdown)

    expect(output).toContain('# Title')
    expect(output).toContain('**bold**')
    expect(output).toContain('- a')
    expect(output).toContain('- b')
  })

  it('honours the configured bullet and emphasis markers', () => {
    const asterisks = serializeMarkdown(parseMarkdown('* item\n', true), {
      ...markdown,
      bullet: '*'
    })
    expect(asterisks.trim()).toBe('* item')

    const underscores = serializeMarkdown(parseMarkdown('*word*\n', true), {
      ...markdown,
      emphasis: '_'
    })
    expect(underscores.trim()).toBe('_word_')
  })

  it('keeps raw HTML rather than dropping it', () => {
    const output = normalizeMarkdown('Press <kbd>Ctrl</kbd> to continue.\n', markdown)
    expect(output).toContain('<kbd>Ctrl</kbd>')
  })
})

describe('checkNormalization', () => {
  it('reports no change for already canonical text', () => {
    const result = checkNormalization('# Title\n\nBody text.\n', markdown)
    expect(result.changed).toBe(false)
    expect(result.differences).toEqual([])
  })

  it('detects a setext heading being rewritten', () => {
    const result = checkNormalization('Title\n=====\n', markdown)
    expect(result.changed).toBe(true)
    expect(result.normalized).toContain('# Title')
  })

  it('detects non-canonical list markers', () => {
    const result = checkNormalization('* one\n* two\n', markdown)
    expect(result.changed).toBe(true)
    expect(result.differences.length).toBeGreaterThan(0)
  })
})

describe('computeStats', () => {
  it('counts prose words, not markup', () => {
    const stats = computeStats('# Title\n\nHello brave new world.\n')
    // "Title" plus the four words of the sentence.
    expect(stats.words).toBe(5)
  })

  it('excludes fenced code blocks from the word count', () => {
    const withCode = computeStats('Intro text here.\n\n```js\nconst a = 1\nconst b = 2\n```\n')
    expect(withCode.words).toBe(3)
  })

  it('excludes inline code and image syntax', () => {
    // The code span is dropped entirely, leaving "Run" and "now.".
    expect(computeStats('Run `npm install` now.').words).toBe(2)
    expect(computeStats('![A picture](./a.png)').words).toBe(0)
  })

  it('keeps link text but drops the target', () => {
    expect(computeStats('Read [the manual](https://example.com/very/long/path).').words).toBe(3)
  })

  it('counts characters including markup', () => {
    const stats = computeStats('ab cd')
    expect(stats.characters).toBe(5)
    expect(stats.charactersNoSpaces).toBe(4)
  })

  it('reports at least one line for an empty document', () => {
    expect(computeStats('').lines).toBe(1)
    expect(computeStats('').words).toBe(0)
  })
})
