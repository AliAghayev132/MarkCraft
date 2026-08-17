import { describe, expect, it } from 'vitest'

import { formatHeaders, isRequestableUrl, parseHeaders, prettyBody, statusTone } from '@shared'

describe('parseHeaders', () => {
  it('reads one header per line', () => {
    expect(parseHeaders('Accept: application/json\nX-Key: abc')).toEqual({
      Accept: 'application/json',
      'X-Key': 'abc'
    })
  })

  it('keeps colons inside the value', () => {
    expect(parseHeaders('Referer: https://example.com/a')).toEqual({
      Referer: 'https://example.com/a'
    })
  })

  /* Commenting out an authorisation header is what anyone testing an API does. */
  it('skips blank lines and comments', () => {
    expect(parseHeaders('\n# Authorization: Bearer x\nAccept: */*\n\n')).toEqual({ Accept: '*/*' })
  })

  it('ignores lines that are not headers', () => {
    expect(parseHeaders('nonsense\n: novalue\nOk: yes')).toEqual({ Ok: 'yes' })
  })

  it('allows an empty value', () => {
    expect(parseHeaders('X-Empty:')).toEqual({ 'X-Empty': '' })
  })

  it('is empty for empty input', () => {
    expect(parseHeaders('')).toEqual({})
  })
})

describe('formatHeaders', () => {
  it('round-trips', () => {
    const headers = { Accept: 'application/json', 'X-Key': 'abc' }
    expect(parseHeaders(formatHeaders(headers))).toEqual(headers)
  })
})

describe('isRequestableUrl', () => {
  it('allows http and https', () => {
    expect(isRequestableUrl('https://example.com')).toBe(true)
    expect(isRequestableUrl('http://127.0.0.1:8080/x')).toBe(true)
  })

  /*
   * The reason this exists: a request box that accepts `file:` is a way to
   * read the machine, and a tester that can read the machine is not a tester.
   */
  it('refuses every other scheme', () => {
    for (const url of ['file:///etc/passwd', 'data:text/plain,x', 'ftp://x/y', 'javascript:alert(1)']) {
      expect(isRequestableUrl(url)).toBe(false)
    }
  })

  it('refuses nonsense', () => {
    expect(isRequestableUrl('')).toBe(false)
    expect(isRequestableUrl('example.com')).toBe(false)
    expect(isRequestableUrl('   ')).toBe(false)
  })

  it('ignores surrounding whitespace', () => {
    expect(isRequestableUrl('  https://example.com  ')).toBe(true)
  })
})

describe('prettyBody', () => {
  it('formats JSON when the type says JSON', () => {
    expect(prettyBody('{"a":1}', 'application/json')).toBe('{\n  "a": 1\n}')
    expect(prettyBody('{"a":1}', 'application/vnd.api+json; charset=utf-8')).toContain('"a": 1')
  })

  it('leaves other types alone', () => {
    expect(prettyBody('{"a":1}', 'text/plain')).toBe('{"a":1}')
    expect(prettyBody('<p>x</p>', 'text/html')).toBe('<p>x</p>')
  })

  /* When the type lies, the raw text is the bug — showing it beats an error. */
  it('leaves malformed JSON as it arrived', () => {
    expect(prettyBody('{oops', 'application/json')).toBe('{oops')
  })
})

describe('statusTone', () => {
  it('maps the ranges', () => {
    expect(statusTone(200)).toBe('success')
    expect(statusTone(204)).toBe('success')
    expect(statusTone(301)).toBe('neutral')
    expect(statusTone(404)).toBe('warning')
    expect(statusTone(500)).toBe('danger')
    expect(statusTone(0)).toBe('neutral')
  })
})
