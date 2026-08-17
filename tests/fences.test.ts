import { describe, expect, it } from 'vitest'

import { fenceAt, setFenceLanguage } from '@shared'

const DOC = ['# Title', '', '```js', 'const a = 1', '```', '', 'after'].join('\n')

describe('fenceAt', () => {
  it('finds the fence from the opening line, the body and the closing line', () => {
    for (const line of [2, 3, 4]) {
      expect(fenceAt(DOC, line)).toMatchObject({ open: 2, close: 4, marker: '```', language: 'js' })
    }
  })

  it('returns nothing outside a fence', () => {
    for (const line of [0, 1, 5, 6]) expect(fenceAt(DOC, line)).toBeNull()
  })

  it('reports an empty language when the fence has no info string', () => {
    expect(fenceAt('```\nx\n```', 1)?.language).toBe('')
  })

  /* Still typing it is exactly when someone reaches for the language. */
  it('finds a block that was never closed', () => {
    expect(fenceAt('```py\nprint(1)', 1)).toMatchObject({ open: 0, close: null, language: 'py' })
  })

  it('handles tildes and indentation', () => {
    const fence = fenceAt('  ~~~ruby\n  puts 1\n  ~~~', 1)
    expect(fence).toMatchObject({ marker: '~~~', language: 'ruby', infoFrom: 5 })
  })

  it('picks the right one of several blocks', () => {
    const many = ['```a', '1', '```', '', '```b', '2', '```'].join('\n')
    expect(fenceAt(many, 1)?.language).toBe('a')
    expect(fenceAt(many, 5)?.language).toBe('b')
    expect(fenceAt(many, 3)).toBeNull()
  })

  it('is null for a line outside the document', () => {
    expect(fenceAt(DOC, -1)).toBeNull()
    expect(fenceAt(DOC, 99)).toBeNull()
  })
})

describe('setFenceLanguage', () => {
  it('replaces the language', () => {
    expect(setFenceLanguage(DOC, 3, 'python')).toContain('```python')
    expect(setFenceLanguage(DOC, 3, 'python')).not.toContain('```js')
  })

  it('adds one where there was none', () => {
    expect(setFenceLanguage('```\nx\n```', 1, 'ts')).toBe('```ts\nx\n```')
  })

  it('clears one when given nothing', () => {
    expect(setFenceLanguage(DOC, 3, '')).toContain('```\nconst a = 1')
  })

  it('keeps indentation and the marker it found', () => {
    expect(setFenceLanguage('  ~~~ruby\n  puts 1\n  ~~~', 1, 'go')).toBe('  ~~~go\n  puts 1\n  ~~~')
  })

  it('leaves the document alone when the caret is not in a fence', () => {
    expect(setFenceLanguage(DOC, 0, 'python')).toBe(DOC)
  })

  it('changes only the block the caret is in', () => {
    const many = ['```a', '1', '```', '', '```b', '2', '```'].join('\n')
    const changed = setFenceLanguage(many, 5, 'rust')
    expect(changed).toContain('```a')
    expect(changed).toContain('```rust')
  })

  it('does not disturb the body', () => {
    expect(setFenceLanguage(DOC, 3, 'python').split('\n')[3]).toBe('const a = 1')
  })
})
