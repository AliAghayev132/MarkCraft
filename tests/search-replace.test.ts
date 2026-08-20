import { describe, expect, it } from 'vitest'

import { buildQueryRegex, expandReplacement, replaceAll, replacementFor } from '@shared'

/**
 * What a search matches, and what a replacement makes of it.
 *
 * The panel shows a writer what "Replace in 40 files" is about to do, and the
 * main process then does it. These tests exist to keep those two answers the
 * same: a preview that disagrees with the outcome is worse than no preview,
 * because it is the one somebody trusted.
 */

const plain = { caseSensitive: false, wholeWord: false, regex: false }
const asRegex = { ...plain, regex: true }

describe('buildQueryRegex', () => {
  it('takes a plain query literally', () => {
    expect(buildQueryRegex('a.b', plain).test('axb')).toBe(false)
    expect(buildQueryRegex('a.b', plain).test('a.b')).toBe(true)
  })

  it('takes a regex query as one', () => {
    expect(buildQueryRegex('a.b', asRegex).test('axb')).toBe(true)
  })

  it('ignores case unless asked not to', () => {
    expect(buildQueryRegex('march', plain).test('March')).toBe(true)
    expect(buildQueryRegex('march', { ...plain, caseSensitive: true }).test('March')).toBe(false)
  })

  it('holds to whole words when asked', () => {
    const whole = buildQueryRegex('due', { ...plain, wholeWord: true })

    expect(whole.test('due')).toBe(true)
    whole.lastIndex = 0
    expect(whole.test('overdue')).toBe(false)
  })

  /* A pattern that stopped at the first astral character would quietly skip
     matches in any document with an emoji in it. */
  it('is always global and always Unicode', () => {
    const regex = buildQueryRegex('x', plain)

    expect(regex.global).toBe(true)
    expect(regex.unicode).toBe(true)
  })
})

describe('expandReplacement', () => {
  it('leaves a plain replacement exactly as written', () => {
    expect(expandReplacement('$1 costs $5', ['whatever'], plain)).toBe('$1 costs $5')
  })

  it('fills in a numbered group', () => {
    expect(expandReplacement('$2-$1', ['ab', 'a', 'b'], asRegex)).toBe('b-a')
  })

  it('fills in the whole match', () => {
    expect(expandReplacement('[$&]', ['found'], asRegex)).toBe('[found]')
  })

  it('empties a group that did not take part', () => {
    expect(expandReplacement('<$1>', ['x', undefined], asRegex)).toBe('<>')
  })

  /*
   * `$'` and `` $` `` mean "everything after" and "everything before" in
   * JavaScript's own replace. In a whole-workspace replacement that means
   * inserting the rest of the file into the match, which nobody has ever meant.
   */
  it('leaves the tokens that would splice in the whole file alone', () => {
    expect(expandReplacement("a$'b", ['x'], asRegex)).toBe("a$'b")
    expect(expandReplacement('a$`b', ['x'], asRegex)).toBe('a$`b')
  })
})

describe('replaceAll', () => {
  it('replaces every match and says how many', () => {
    const { text, count } = replaceAll('a a a', 'a', 'b', plain)

    expect(text).toBe('b b b')
    expect(count).toBe(3)
  })

  it('changes nothing when nothing matches', () => {
    const { text, count } = replaceAll('hello', 'zzz', 'x', plain)

    expect(text).toBe('hello')
    expect(count).toBe(0)
  })

  it('carries groups through a regex replacement', () => {
    const { text } = replaceAll('2024-03-05', '(\\d{4})-(\\d{2})', '$2/$1', asRegex)

    expect(text).toBe('03/2024-05')
  })

  it('does not treat a plain query as a pattern', () => {
    const { text, count } = replaceAll('a+b', 'a+', 'X', plain)

    expect(text).toBe('Xb')
    expect(count).toBe(1)
  })
})

describe('replacementFor', () => {
  it('is the replacement itself for a plain search', () => {
    expect(replacementFor('March', 'March', 'April', plain)).toBe('April')
  })

  /* The preview and the outcome, on the same input. */
  it('agrees with what the replacement will actually do', () => {
    const before = 'Due 2024-03-05 and 2025-11-30.'
    const query = '(\\d{4})-(\\d{2})-(\\d{2})'
    const template = '$3.$2.$1'

    const after = replaceAll(before, query, template, asRegex).text
    const first = replacementFor('2024-03-05', query, template, asRegex)
    const second = replacementFor('2025-11-30', query, template, asRegex)

    expect(after).toBe(`Due ${first} and ${second}.`)
  })

  it('differs per match, which is why it is asked per match', () => {
    const query = '(\\w+)@example\\.com'

    expect(replacementFor('ada@example.com', query, '$1', asRegex)).toBe('ada')
    expect(replacementFor('bob@example.com', query, '$1', asRegex)).toBe('bob')
  })

  it('shows the template unexpanded rather than guessing at a pattern still being typed', () => {
    expect(replacementFor('anything', '(foo', '$1', asRegex)).toBe('$1')
  })

  it('shows the template unexpanded when the pattern does not own the whole match', () => {
    expect(replacementFor('abc', 'b', '[$&]', asRegex)).toBe('[$&]')
  })
})
