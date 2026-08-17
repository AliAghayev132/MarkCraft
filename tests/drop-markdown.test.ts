import { describe, expect, it } from 'vitest'

import { dropKindFor, dropMarkdown } from '../src/shared/utils/drop-markdown'

/**
 * A drop writes into the user's document immediately, so getting the syntax
 * wrong corrupts it in front of them. The cases below are the ones where a
 * naive mapping breaks the file: a fence inside the dropped file, a space in
 * the path, and a name with more than one dot.
 */
describe('dropKindFor', () => {
  it('recognises images', () => {
    expect(dropKindFor('a.png')).toBe('image')
    expect(dropKindFor('DIAGRAM.SVG')).toBe('image')
  })

  it('recognises source files', () => {
    expect(dropKindFor('server.ts')).toBe('code')
    expect(dropKindFor('config.yaml')).toBe('code')
  })

  it('falls back to a link for anything else', () => {
    expect(dropKindFor('spec.pdf')).toBe('link')
    expect(dropKindFor('data.xlsx')).toBe('link')
    expect(dropKindFor('README')).toBe('link')
  })
})

describe('dropMarkdown', () => {
  it('embeds an image with the file name as alt text', () => {
    expect(dropMarkdown('architecture.png', 'assets/architecture.png')).toBe(
      '![architecture](assets/architecture.png)'
    )
  })

  it('links a document', () => {
    expect(dropMarkdown('API.pdf', 'assets/API.pdf')).toBe('[API.pdf](assets/API.pdf)')
  })

  it('fences source with its language', () => {
    expect(dropMarkdown('server.js', 'x', 'const a = 1\n')).toBe(
      '```javascript\nconst a = 1\n```'
    )
  })

  it('lengthens the fence past any backticks in the file', () => {
    const contents = 'text\n```\ninner\n```\n'
    const result = dropMarkdown('notes.md', 'x', contents)

    // `md` is not a fenced language, so this is a link — the guard below covers
    // the fencing rule on a file that *is* fenced.
    expect(result).toBe('[notes.md](x)')

    const fenced = dropMarkdown('script.sh', 'x', contents)
    expect(fenced.startsWith('````bash')).toBe(true)
    expect(fenced.endsWith('````')).toBe(true)
  })

  it('links a source file when its text was not read', () => {
    expect(dropMarkdown('huge.sql', 'assets/huge.sql')).toBe('[huge.sql](assets/huge.sql)')
  })

  it('wraps a path containing spaces in angle brackets', () => {
    expect(dropMarkdown('a.png', 'my assets/a.png')).toBe('![a](<my assets/a.png>)')
  })

  it('strips only the last extension from the label', () => {
    expect(dropMarkdown('archive.tar.png', 'x')).toBe('![archive.tar](x)')
  })

  it('does not leave a trailing blank line inside a fence', () => {
    expect(dropMarkdown('a.py', 'x', 'print(1)\n\n\n')).toBe('```python\nprint(1)\n```')
  })
})
