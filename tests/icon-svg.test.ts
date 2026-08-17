// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'

import { sanitiseSvg } from '@main/security/sanitise-svg'
import { parseSvg } from '@features/icons'

/**
 * The imported-icon path is the only place MarkCraft renders markup it did not
 * write, so it gets the closest scrutiny in the suite.
 *
 * There are two independent lines of defence and both are tested here:
 * `sanitiseSvg` runs in main when the file is read, and `parseIconSource` runs
 * in the renderer and decides what actually reaches the DOM. The second is the
 * one that matters — the first could be bypassed by a file edited in place
 * after import — so it is tested against markup that has *not* been sanitised.
 */

/** The icon profile is the strict one; the diagram profile is wider. */
const parseIcon = (source: string): ReturnType<typeof parseSvg> => parseSvg(source, 'icon')

describe('sanitiseSvg (main, on read)', () => {
  it('removes a script element and its contents', () => {
    const out = sanitiseSvg('<svg><script>alert(1)</script><path d="M0 0"/></svg>')
    expect(out).not.toMatch(/script/i)
    expect(out).toContain('<path')
  })

  it('removes a self-closing script element', () => {
    expect(sanitiseSvg('<svg><script src="x.js"/></svg>')).not.toMatch(/script/i)
  })

  it('strips inline event handlers in either quote style', () => {
    const out = sanitiseSvg(`<svg onload="steal()"><path onclick='go()' d="M0 0"/></svg>`)
    expect(out).not.toMatch(/onload/i)
    expect(out).not.toMatch(/onclick/i)
    expect(out).toContain('d="M0 0"')
  })

  it('strips javascript: and data: hrefs', () => {
    const out = sanitiseSvg(`<svg><a href="javascript:alert(1)"><use xlink:href='data:x'/></a></svg>`)
    expect(out).not.toMatch(/javascript:/i)
    expect(out).not.toMatch(/href\s*=\s*['"]\s*data:/i)
  })

  it('removes foreignObject, which can carry arbitrary HTML', () => {
    const out = sanitiseSvg('<svg><foreignObject><iframe src="x"></iframe></foreignObject></svg>')
    expect(out).not.toMatch(/foreignObject/i)
    expect(out).not.toMatch(/iframe/i)
  })

  it('removes remote images', () => {
    expect(sanitiseSvg('<svg><image href="http://x/y.png"/></svg>')).not.toMatch(/<image/i)
  })

  it('drops the XML prolog, doctype and comments', () => {
    const out = sanitiseSvg(
      `<?xml version="1.0"?><!DOCTYPE svg><!-- note --><svg><path d="M0 0"/></svg>`
    )
    expect(out.startsWith('<svg')).toBe(true)
    expect(out).not.toContain('<!--')
  })

  it('leaves ordinary geometry untouched', () => {
    const source = '<svg viewBox="0 0 24 24"><path d="M1 2 L3 4" stroke="currentColor"/></svg>'
    expect(sanitiseSvg(source)).toBe(source)
  })
})

describe('parseIconSource (renderer, decides what reaches the DOM)', () => {
  it('keeps allowlisted shapes', () => {
    const parsed = parseIcon(
      '<svg viewBox="0 0 24 24"><path d="M1 1"/><circle cx="5" cy="5" r="2"/></svg>'
    )
    expect(parsed).not.toBeNull()
    expect(parsed?.viewBox).toBe('0 0 24 24')
  })

  it('falls back to a 24-unit viewBox when the file omits one', () => {
    expect(parseIcon('<svg><path d="M1 1"/></svg>')?.viewBox).toBe('0 0 24 24')
  })

  it('refuses markup whose root is not an svg', () => {
    expect(parseIcon('<div><path d="M1 1"/></div>')).toBeNull()
  })

  it('refuses an svg with nothing renderable in it', () => {
    expect(parseIcon('<svg></svg>')).toBeNull()
    expect(parseIcon('<svg><title>Name</title></svg>')).toBeNull()
  })

  it('refuses malformed XML rather than rendering half of it', () => {
    expect(parseIcon('<svg><path d="M1 1"></svg>')).toBeNull()
  })

  /*
   * The important ones: these inputs skipped `sanitiseSvg` entirely, which is
   * what would happen if a file were edited in the icons folder after import.
   */
  it('drops a script element even when it was never sanitised', () => {
    const parsed = parseIcon('<svg><script>alert(1)</script><path d="M1 1"/></svg>')
    expect(JSON.stringify(parsed)).not.toMatch(/script|alert/i)
  })

  it('drops foreignObject and its payload', () => {
    const parsed = parseIcon(
      '<svg><foreignObject><div onclick="x()">hi</div></foreignObject><path d="M1 1"/></svg>'
    )
    expect(JSON.stringify(parsed)).not.toMatch(/foreignObject|onclick/i)
  })

  it('keeps no event-handler attributes', () => {
    const parsed = parseIcon('<svg><path d="M1 1" onclick="go()" onmouseover="x()"/></svg>')
    expect(JSON.stringify(parsed)).not.toMatch(/onclick|onmouseover/i)
  })

  it('rejects url(...) values, which could reference something not carried over', () => {
    const parsed = parseIcon('<svg><path d="M1 1" fill="url(#leak)"/></svg>')
    expect(JSON.stringify(parsed)).not.toContain('url(')
  })

  it('rejects a javascript: value on an allowed attribute', () => {
    const parsed = parseIcon('<svg><path d="M1 1" fill="javascript:alert(1)"/></svg>')
    expect(JSON.stringify(parsed)).not.toMatch(/javascript:/i)
  })

  it('converts hyphenated SVG attributes to the names React expects', () => {
    const parsed = parseIcon(
      '<svg><path d="M1 1" stroke-width="2" stroke-linecap="round" fill-rule="evenodd"/></svg>'
    )
    const json = JSON.stringify(parsed)

    expect(json).toContain('strokeWidth')
    expect(json).toContain('strokeLinecap')
    expect(json).toContain('fillRule')
    expect(json).not.toContain('stroke-width')
  })

  it('keeps nested groups', () => {
    const parsed = parseIcon('<svg><g stroke="red"><path d="M1 1"/></g></svg>')
    expect(JSON.stringify(parsed)).toContain('path')
  })
})
