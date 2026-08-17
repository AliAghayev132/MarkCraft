import { describe, expect, it } from 'vitest'

import { toPlainText } from '../src/shared/utils/markdown-text'

/**
 * A `.txt` export is the one output nobody reviews before sending, so the
 * transform is covered where it would quietly do the wrong thing: keeping a URL
 * instead of the link text, eating a word that happens to contain an asterisk,
 * or leaving front matter at the top of what should be prose.
 */
describe('toPlainText', () => {
  it('drops heading markers but keeps the words', () => {
    expect(toPlainText('# Title\n\n## Section')).toBe('Title\n\nSection\n')
  })

  it('keeps a link’s text and drops its target', () => {
    expect(toPlainText('See [the docs](https://example.com/a/b).')).toBe('See the docs.\n')
  })

  it('keeps an image’s alt text', () => {
    expect(toPlainText('![architecture](assets/a.png)')).toBe('architecture\n')
  })

  it('removes emphasis, strong, strike and inline code marks', () => {
    expect(toPlainText('**bold** _em_ ~~gone~~ `code`')).toBe('bold em gone code\n')
  })

  it('strips front matter', () => {
    expect(toPlainText('---\ntitle: X\n---\n\nBody')).toBe('Body\n')
  })

  it('drops fences but keeps the code inside them', () => {
    expect(toPlainText('```js\nconst a = 1\n```')).toBe('const a = 1\n')
  })

  it('unwraps list items and task boxes', () => {
    expect(toPlainText('- one\n- [ ] two\n- [x] three')).toBe('one\ntwo\nthree\n')
  })

  it('unwraps block quotes', () => {
    expect(toPlainText('> quoted\n> more')).toBe('quoted\nmore\n')
  })

  it('collapses runs of blank lines', () => {
    expect(toPlainText('a\n\n\n\n\nb')).toBe('a\n\nb\n')
  })

  it('ends with exactly one newline', () => {
    expect(toPlainText('text\n\n\n')).toBe('text\n')
    expect(toPlainText('text')).toBe('text\n')
  })

  it('leaves plain prose untouched', () => {
    expect(toPlainText('Just a sentence.')).toBe('Just a sentence.\n')
  })
})
