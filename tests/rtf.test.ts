import { describe, expect, it } from 'vitest'

import { markdownToRtf } from '@shared'

const body = (markdown: string): string => markdownToRtf(markdown).split('\n').slice(1, -1).join('\n')

describe('markdownToRtf', () => {
  it('opens and closes a valid document', () => {
    const rtf = markdownToRtf('Hello.')
    expect(rtf.startsWith('{\\rtf1\\ansi')).toBe(true)
    expect(rtf.endsWith('}')).toBe(true)
    expect(rtf).toContain('\\fonttbl')
  })

  it('writes a paragraph', () => {
    expect(body('Hello there.')).toBe('{\\pard Hello there.\\par}')
  })

  /*
   * The reason this file exists rather than a dependency: RTF predates
   * Unicode, so an unescaped `ə` or `Заголовок` arrives as mojibake — the one
   * failure a "rich text" export must not have.
   */
  it('escapes every character above ASCII', () => {
    expect(body('Qeyd əlavə et')).toContain('Qeyd \\u601?lav\\u601? et')
    expect(body('Заголовок')).toContain('\\u1047?\\u1072?')
    expect(body('naïve')).toContain('na\\u239?ve')
  })

  it('escapes characters above the BMP as a surrogate pair', () => {
    // 🎉 is U+1F389, which RTF can only carry as two escaped surrogates.
    const out = body('🎉')
    expect(out).toContain('\\u-10180?') // D83C, as a signed 16-bit value
    expect(out).toContain('\\u-8311?') // DF89
  })

  it('escapes RTF syntax in the document text', () => {
    expect(body('a \\ b { c } d')).toBe('{\\pard a \\\\ b \\{ c \\} d\\par}')
  })

  it('sizes headings by level and makes them bold', () => {
    expect(body('# Title')).toContain('\\b\\fs36 Title')
    expect(body('### Third')).toContain('\\b\\fs26 Third')
  })

  it('marks up emphasis, code and strikethrough', () => {
    expect(body('**bold** and *italic*')).toContain('{\\b bold}')
    expect(body('**bold** and *italic*')).toContain('{\\i italic}')
    expect(body('`code`')).toContain('{\\f1 code}')
    expect(body('~~gone~~')).toContain('{\\strike gone}')
  })

  it('keeps link text and drops the target', () => {
    const out = body('See [the docs](https://example.com).')
    expect(out).toContain('{\\ul the docs}')
    expect(out).not.toContain('example.com')
  })

  it('drops images, which have no place in a text conversion', () => {
    expect(body('![alt](picture.png)')).not.toContain('picture.png')
  })

  it('numbers an ordered list and restarts it after a blank line', () => {
    const out = body('1. one\n1. two\n\n1. fresh')
    expect(out).toContain('1.  one')
    expect(out).toContain('2.  two')
    expect(out).toMatch(/1\. {2}fresh/)
  })

  it('renders bullets and task boxes', () => {
    expect(body('- item')).toContain('\\u8226?  item')
    expect(body('- [ ] todo')).toContain('\\u9744?')
    expect(body('- [x] done')).toContain('\\u9745?')
  })

  it('indents quotes and code, and keeps code unstyled', () => {
    expect(body('> quoted')).toContain('\\li360')
    const code = body('```js\nconst a = **not bold**\n```')
    expect(code).toContain('\\f1\\fs20')
    expect(code).not.toContain('{\\b ')
  })

  it('leaves front matter out', () => {
    expect(body('---\ntitle: x\n---\nBody.')).toBe('{\\pard Body.\\par}')
  })

  it('puts an escaped title in the info block', () => {
    expect(markdownToRtf('x', 'Sənəd')).toContain('{\\title S\\u601?n\\u601?d}')
  })
})
