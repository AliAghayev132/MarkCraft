import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared'
import {
  findLossyConstructs,
  markdownToRichHtml,
  richHtmlToMarkdown
} from '@features/editor/rich'

const markdown = DEFAULT_SETTINGS.markdown

/**
 * The WYSIWYG contract.
 *
 * Markdown -> HTML -> Markdown is exactly the path a document takes when it is
 * edited in the rich editor. If a construct does not survive this trip, editing
 * a document in rich mode silently damages it — which is the single worst
 * failure this application could have (§5).
 */
function roundTrip(source: string): string {
  return richHtmlToMarkdown(markdownToRichHtml(source, markdown), markdown)
}

describe('rich editor round-trip', () => {
  const cases: [string, string, string][] = [
    ['heading', '# Title\n', '# Title'],
    ['nested heading', '### Third level\n', '### Third level'],
    ['paragraph', 'Just some prose.\n', 'Just some prose.'],
    ['bold', 'A **bold** word.\n', '**bold**'],
    ['italic', 'An _italic_ word.\n', '_italic_'],
    ['inline code', 'Use `render()`.\n', '`render()`'],
    ['link', '[Docs](https://example.com)\n', '[Docs](https://example.com)'],
    ['image', '![Alt](./a.png)\n', '![Alt](./a.png)'],
    ['blockquote', '> Quoted line.\n', '> Quoted line.'],
    ['bullet list', '- one\n- two\n', '- one'],
    ['ordered list', '1. one\n2. two\n', '1. one'],
    ['thematic break', '---\n', '---'],
    ['strikethrough', 'Gone: ~~text~~\n', '~~text~~']
  ]

  for (const [name, source, expected] of cases) {
    it(`preserves ${name}`, () => {
      expect(roundTrip(source)).toContain(expected)
    })
  }

  it('preserves fenced code blocks with their language', () => {
    const output = roundTrip('```js\nconst a = 1\n```\n')
    expect(output).toContain('```js')
    expect(output).toContain('const a = 1')
  })

  it('preserves GFM task lists including checked state', () => {
    const output = roundTrip('- [ ] todo\n- [x] done\n')
    expect(output).toContain('[ ] todo')
    expect(output).toContain('[x] done')
  })

  it('preserves table content', () => {
    const output = roundTrip('| a | b |\n| - | - |\n| 1 | 2 |\n')
    expect(output).toContain('a')
    expect(output).toContain('b')
    expect(output).toContain('1')
    expect(output).toContain('2')
    expect(output).toContain('|')
  })

  it('keeps underline as inline HTML, since Markdown has no syntax for it', () => {
    const output = roundTrip('An <u>underlined</u> word.\n')
    expect(output).toContain('<u>underlined</u>')
  })

  it('is idempotent across a second trip', () => {
    const source = '# Title\n\nText with **bold** and a [link](https://example.com).\n\n- a\n- b\n'
    const once = roundTrip(source)
    expect(roundTrip(once)).toBe(once)
  })
})

describe('findLossyConstructs', () => {
  it('reports nothing for plain Markdown', () => {
    expect(findLossyConstructs('# Title\n\nText **here**.\n')).toEqual([])
  })

  it('flags footnotes', () => {
    expect(findLossyConstructs('Text[^1]\n\n[^1]: The note\n')).toContain('footnotes')
  })

  it('flags link reference definitions', () => {
    expect(findLossyConstructs('[ref]: https://example.com\n')).toContain(
      'link reference definitions'
    )
  })

  it('flags front matter', () => {
    expect(findLossyConstructs('---\ntitle: A\n---\n\nBody\n')).toContain('front matter')
  })

  it('flags raw HTML blocks but not common inline tags', () => {
    expect(findLossyConstructs('<div class="x">block</div>\n')).toContain('raw HTML blocks')
    expect(findLossyConstructs('Press <kbd>Ctrl</kbd>.\n')).not.toContain('raw HTML blocks')
  })
})
