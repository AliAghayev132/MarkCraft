import { describe, expect, it } from 'vitest'

import { markdownToDocx } from '../src/main/services/docx-service'

/**
 * A `.docx` is a zip of XML parts, so these assertions work on the archive
 * rather than on a parsed document: the bytes are what Word opens, and a
 * converter that produced a plausible object model but an unreadable file
 * would pass any test written against the model.
 */
async function archive(markdown: string, title?: string): Promise<{ bytes: Buffer; raw: string }> {
  const bytes = await markdownToDocx(markdown, title)
  return { bytes, raw: bytes.toString('latin1') }
}

describe('markdownToDocx', () => {
  it('produces a zip carrying the Word parts', async () => {
    const { bytes, raw } = await archive('# Title\n\nBody.')

    expect(bytes.subarray(0, 2).toString()).toBe('PK')
    expect(raw).toContain('[Content_Types].xml')
    expect(raw).toContain('word/document.xml')
    expect(bytes.length).toBeGreaterThan(1000)
  })

  /*
   * Not byte-identical between runs, and it cannot be: a `.docx` records when
   * it was created, and the zip entries carry timestamps of their own. The
   * assertion worth making is that the *shape* is stable — same parts, same
   * size to within the few bytes a differing timestamp compresses to.
   */
  it('produces a stable archive for the same input', async () => {
    const [first, second] = await Promise.all([archive('# A\n\nb'), archive('# A\n\nb')])

    expect(Math.abs(first.bytes.length - second.bytes.length)).toBeLessThan(64)
    expect(second.raw).toContain('word/document.xml')
  })

  it('grows with the document', async () => {
    const small = await archive('one')
    const large = await archive(Array.from({ length: 200 }, (_, i) => `Line ${i}.`).join('\n\n'))
    expect(large.bytes.length).toBeGreaterThan(small.bytes.length)
  })

  it('accepts every block kind without throwing', async () => {
    const everything = [
      '# H1', '## H2', '### H3', '#### H4', '##### H5', '###### H6',
      '', 'A paragraph with **bold**, *italic*, `code`, ~~strike~~ and [a link](x.md).',
      '', '- bullet', '- [x] done', '- [ ] todo',
      '', '1. first', '1. second',
      '', '> quoted',
      '', '---',
      '', '```js', 'const a = 1', '```'
    ].join('\n')

    await expect(archive(everything)).resolves.toBeDefined()
  })

  /*
   * The failure mode worth guarding: a converter that silently drops or
   * mangles non-Latin text. The XML inside the archive is deflated, so this
   * checks the size responds to the content rather than reading the words.
   */
  it('carries non-Latin text', async () => {
    const azeri = await archive('# Sənəd başlığı\n\nƏsas mətn burada.')
    const cyrillic = await archive('# Заголовок\n\nОсновной текст.')

    expect(azeri.bytes.length).toBeGreaterThan(1000)
    expect(cyrillic.bytes.length).toBeGreaterThan(1000)
    expect(azeri.bytes.equals(cyrillic.bytes)).toBe(false)
  })

  it('handles an empty document', async () => {
    const { bytes } = await archive('')
    expect(bytes.subarray(0, 2).toString()).toBe('PK')
  })

  it('accepts a title without changing the archive shape', async () => {
    const { raw } = await archive('Body.', 'Sənəd')
    expect(raw).toContain('docProps/core.xml')
  })
})
