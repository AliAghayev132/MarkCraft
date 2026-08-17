import { describe, expect, it } from 'vitest'

import { htmlToMarkdown, looksLikeHtml } from '@features/editor/markdown'

const md = (html: string): string => htmlToMarkdown(html)

describe('looksLikeHtml', () => {
  it('recognises real markup', () => {
    expect(looksLikeHtml('<p>text</p>')).toBe(true)
    expect(looksLikeHtml('<div class="a"><span>x</span></div>')).toBe(true)
    expect(looksLikeHtml('a<br/>b')).toBe(true)
  })

  it('is not fooled by prose containing angle brackets', () => {
    expect(looksLikeHtml('5 < 7 and 9 > 2')).toBe(false)
    expect(looksLikeHtml('use the -> operator')).toBe(false)
    expect(looksLikeHtml('')).toBe(false)
  })
})

describe('htmlToMarkdown', () => {
  it('converts headings and paragraphs', () => {
    expect(md('<h1>Title</h1><p>Body.</p>')).toBe('# Title\n\nBody.')
    expect(md('<h3>Third</h3>')).toBe('### Third')
  })

  it('converts emphasis and code', () => {
    expect(md('<p><strong>b</strong> and <em>i</em></p>')).toBe('**b** and _i_')
    expect(md('<p><code>x</code></p>')).toBe('`x`')
  })

  it('converts links and images', () => {
    expect(md('<p><a href="https://x.com">docs</a></p>')).toBe('[docs](https://x.com)')
    expect(md('<p><img src="a.png" alt="alt"></p>')).toBe('![alt](a.png)')
  })

  it('converts lists, nesting included', () => {
    expect(md('<ul><li>one</li><li>two</li></ul>')).toBe('- one\n- two')
    expect(md('<ol><li>first</li></ol>')).toBe('1. first')
    expect(md('<ul><li>a<ul><li>b</li></ul></li></ul>')).toContain('  - b')
  })

  it('converts a fenced code block and keeps its text intact', () => {
    const out = md('<pre><code>const a = 1\nconst b = 2</code></pre>')
    expect(out).toContain('```')
    expect(out).toContain('const a = 1\nconst b = 2')
  })

  it('converts blockquotes and rules', () => {
    expect(md('<blockquote><p>quoted</p></blockquote>')).toBe('> quoted')
    expect(md('<hr>')).toBe('---')
  })

  /* GFM on both ends is what stops a table becoming a run of paragraphs. */
  it('carries a table across', () => {
    const out = md('<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>')
    expect(out).toContain('| a')
    expect(out).toContain('| 1')
  })

  /*
   * The failure that makes people abandon a converter: pasting an article and
   * getting the site's navigation, banner and footer along with it.
   */
  it('drops a page’s chrome', () => {
    const page = '<nav>Home About</nav><article><p>Real content.</p></article><footer>© 2026</footer>'
    const out = md(page)

    expect(out).toBe('Real content.')
    expect(out).not.toContain('Home')
    expect(out).not.toContain('2026')
  })

  it('drops scripts and styles without leaving their source behind', () => {
    const out = md('<p>keep</p><script>alert(1)</script><style>p{color:red}</style>')
    expect(out).toBe('keep')
  })

  it('handles an empty or whitespace-only input', () => {
    expect(md('')).toBe('')
    expect(md('   ')).toBe('')
  })

  it('leaves plain text as text', () => {
    expect(md('just words')).toBe('just words')
  })

  it('round-trips text copied out of a rendered document', () => {
    const out = md('<h2>Note</h2><p>See <a href="b.md">b</a>.</p><ul><li>x</li></ul>')
    expect(out).toBe('## Note\n\nSee [b](b.md).\n\n- x')
  })
})
