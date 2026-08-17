import { describe, expect, it } from 'vitest'

import { lintMarkdown } from '../src/shared/utils/markdown-lint'

const rules = (markdown: string): string[] => lintMarkdown(markdown).map((p) => p.rule)

/**
 * The linter is only worth having if it is quiet on correct documents. Half of
 * these tests assert that nothing is reported — a false positive costs more
 * than a missed warning, because it is what makes people stop reading the list.
 */
describe('lintMarkdown', () => {
  it('says nothing about a well-formed document', () => {
    const markdown = [
      '# Title',
      '',
      'Some prose with a [link](https://example.com).',
      '',
      '## Section',
      '',
      '```js',
      'const a = 1',
      '```',
      '',
      '![a diagram](a.png)',
      ''
    ].join('\n')

    expect(rules(markdown)).toEqual([])
  })

  it('flags a heading with no space after the hashes', () => {
    expect(rules('#Title')).toContain('MD018')
  })

  it('flags a skipped heading level', () => {
    expect(rules('# One\n\n### Three')).toContain('MD001')
    expect(rules('# One\n\n## Two\n\n### Three')).not.toContain('MD001')
  })

  it('flags a second top-level heading', () => {
    expect(rules('# One\n\n# Two')).toContain('MD025')
    expect(rules('# One\n\n## Two')).not.toContain('MD025')
  })

  it('flags a fence with no language', () => {
    expect(rules('```\ncode\n```')).toContain('MD040')
    expect(rules('```js\ncode\n```')).not.toContain('MD040')
  })

  it('flags an unclosed fence', () => {
    expect(rules('```js\ncode')).toContain('MD046')
  })

  it('flags an image with no alt text', () => {
    expect(rules('![](a.png)')).toContain('MD045')
    expect(rules('![diagram](a.png)')).not.toContain('MD045')
  })

  it('flags a link with an empty target', () => {
    expect(rules('[text]()')).toContain('MD042')
  })

  it('flags hard tabs and trailing whitespace', () => {
    expect(rules('a\tb')).toContain('MD010')
    expect(rules('text   ')).toContain('MD009')
  })

  it('leaves a deliberate hard break alone', () => {
    // Two trailing spaces mean a line break in Markdown, not sloppiness.
    expect(rules('line one  \nline two')).not.toContain('MD009')
  })

  it('ignores everything inside a fence', () => {
    const markdown = ['```bash', '#not-a-heading', 'a\tb', '![](x)', '```'].join('\n')
    expect(rules(markdown)).toEqual([])
  })

  it('skips front matter', () => {
    expect(rules('---\ntitle: x\n---\n\n# Real')).toEqual([])
  })

  it('reports problems in line order', () => {
    const found = lintMarkdown('# One\n\n### Three\n\n```\nx\n```')
    expect(found.map((p) => p.line)).toEqual([...found.map((p) => p.line)].sort((a, b) => a - b))
  })
})
