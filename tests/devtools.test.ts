import { describe, expect, it } from 'vitest'

import {
  convertTimestamp,
  decodeBase64,
  decodeJwt,
  decodeUrl,
  encodeBase64,
  encodeUrl,
  formatJson,
  minifyJson,
  testRegex,
  uuid
} from '@shared'

function value(outcome: ReturnType<typeof formatJson>): string {
  if (!outcome.ok) throw new Error(`expected success, got ${outcome.reason}`)
  return outcome.value
}

describe('JSON', () => {
  it('pretty-prints and minifies', () => {
    expect(value(formatJson('{"a":1}'))).toBe('{\n  "a": 1\n}')
    expect(value(minifyJson('{\n  "a": 1\n}'))).toBe('{"a":1}')
  })

  it('reports a reason and keeps the parser detail', () => {
    const outcome = formatJson('{oops}')
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.reason).toBe('json')
      expect(outcome.detail).toBeTruthy()
    }
  })
})

describe('Base64', () => {
  it('round-trips ASCII', () => {
    expect(value(encodeBase64('hello'))).toBe('aGVsbG8=')
    expect(value(decodeBase64('aGVsbG8='))).toBe('hello')
  })

  /*
   * The case that makes this usable in a localised editor: `btoa` alone throws
   * on any character above U+00FF, which is most of these sentences.
   */
  it('round-trips non-Latin text', () => {
    for (const text of ['Qeyd bloku əlavə et', 'Заголовок', '日本語', '🎉 emoji']) {
      expect(value(decodeBase64(value(encodeBase64(text))))).toBe(text)
    }
  })

  it('accepts the URL-safe alphabet and missing padding', () => {
    expect(value(decodeBase64('aGVsbG8'))).toBe('hello')
    expect(value(decodeBase64(value(encodeBase64('~~~?')).replace(/\+/g, '-').replace(/\//g, '_')))).toBe('~~~?')
  })

  it('rejects bytes that are not valid UTF-8', () => {
    expect(decodeBase64('////').ok).toBe(false)
  })
})

describe('URLs', () => {
  it('round-trips', () => {
    expect(value(encodeUrl('a b&c=d'))).toBe('a%20b%26c%3Dd')
    expect(value(decodeUrl('a%20b%26c%3Dd'))).toBe('a b&c=d')
  })

  it('reports a malformed escape rather than throwing', () => {
    expect(decodeUrl('%E0%A4%A').ok).toBe(false)
  })
})

describe('decodeJwt', () => {
  // {"alg":"HS256","typ":"JWT"} / {"sub":"1234","name":"Ali"}
  const TOKEN =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6IkFsaSJ9.c2ln'

  it('decodes the header and the payload', () => {
    const decoded = value(decodeJwt(TOKEN))
    expect(decoded).toContain('"alg": "HS256"')
    expect(decoded).toContain('"name": "Ali"')
  })

  it('rejects anything that is not three segments', () => {
    expect(decodeJwt('a.b').ok).toBe(false)
    expect(decodeJwt('not a token').ok).toBe(false)
  })
})

describe('convertTimestamp', () => {
  it('reads seconds and milliseconds by magnitude', () => {
    expect(value(convertTimestamp('1700000000'))).toContain('2023-11-14T22:13:20.000Z')
    expect(value(convertTimestamp('1700000000000'))).toContain('2023-11-14T22:13:20.000Z')
  })

  it('reads an ISO date', () => {
    expect(value(convertTimestamp('2023-11-14T22:13:20Z'))).toContain('Unix (s)   1700000000')
  })

  it('rejects what is not a date', () => {
    expect(convertTimestamp('tomorrow').ok).toBe(false)
    expect(convertTimestamp('   ').ok).toBe(false)
  })
})

describe('testRegex', () => {
  it('finds every match, not just the first', () => {
    const result = testRegex('\\d+', '', 'a1 b22 c333')
    expect(result.matches.map((match) => match.text)).toEqual(['1', '22', '333'])
    expect(result.matches[1].index).toBe(4) // "a1 b" — "22" starts at 4
  })

  it('reports capture groups', () => {
    expect(testRegex('(\\w)(\\d)', '', 'a1').matches[0].groups).toEqual(['a', '1'])
  })

  /* An empty match would leave `lastIndex` where it was and loop for ever. */
  it('terminates on a zero-length match', () => {
    const result = testRegex('a*', '', 'bb')
    expect(result.ok).toBe(true)
    expect(result.matches.length).toBeLessThan(10)
  })

  it('reports an invalid pattern instead of throwing', () => {
    const result = testRegex('(unclosed', '', 'x')
    expect(result.ok).toBe(false)
    expect(result.detail).toBeTruthy()
  })
})

describe('uuid', () => {
  it('produces distinct v4 identifiers', () => {
    const one = uuid()
    expect(one).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(one).not.toBe(uuid())
  })
})
