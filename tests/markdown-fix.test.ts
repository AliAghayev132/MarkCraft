import { describe, expect, it } from 'vitest'

import { fixCount, fixMarkdown, lintMarkdown } from '@shared'

const fix = (markdown: string, tabWidth?: number): string =>
  fixMarkdown(markdown, tabWidth === undefined ? {} : { tabWidth }).text

describe('fixMarkdown', () => {
  it('reports a clean document as clean and changes nothing', () => {
    const markdown = '# Title\n\nA paragraph.\n'
    const outcome = fixMarkdown(markdown)

    expect(outcome.clean).toBe(true)
    expect(outcome.text).toBe(markdown)
    expect(fixCount(outcome)).toBe(0)
  })

  it('separates a jammed heading from its hashes', () => {
    expect(fix('#Title')).toBe('# Title')
    expect(fix('###Third')).toBe('### Third')
  })

  it('leaves a heading that is already correct', () => {
    expect(fix('## Fine')).toBe('## Fine')
  })

  it('expands tabs to the editor width', () => {
    expect(fix('a\tb', 4)).toBe('a    b')
    expect(fix('a\tb')).toBe('a  b')
  })

  /*
   * The judgement this encodes: exactly two trailing spaces is a hard break
   * someone asked for. Three is someone who meant two — turning it into none
   * would silently delete their line break.
   */
  it('keeps a deliberate hard break, tidies a botched one, removes stray space', () => {
    expect(fix('line  ')).toBe('line  ')
    expect(fix('line   ')).toBe('line  ')
    expect(fix('line ')).toBe('line')
  })

  it('empties a line that held nothing but whitespace', () => {
    expect(fix('a\n   \nb')).toBe('a\n\nb')
  })

  it('closes a fence that was never closed', () => {
    expect(fix('```js\nconst a = 1')).toBe('```js\nconst a = 1\n```')
    expect(fix('~~~\ntext')).toBe('~~~\ntext\n~~~')
  })

  /* Whitespace inside a fence is the content; touching it changes the code. */
  it('never edits inside a fence', () => {
    const code = '```\n\tindented\ntrailing   \n#NotAHeading\n```'
    expect(fix(code)).toBe(code)
  })

  it('counts each repair', () => {
    const outcome = fixMarkdown('#A\na\tb\nc   ')
    expect(outcome.applied).toEqual({ MD018: 1, MD010: 1, MD009: 1 })
    expect(fixCount(outcome)).toBe(3)
  })

  /*
   * Order matters: expanding a trailing tab first would turn it into two
   * spaces — a hard break the author never asked for, invented by the tool
   * that was supposed to be tidying up.
   */
  it('removes a trailing tab rather than turning it into a hard break', () => {
    expect(fix('line\t')).toBe('line')
    expect(fixMarkdown('line\t').applied).toEqual({ MD009: 1 })
  })

  /*
   * The property that matters more than any single case: what the fixer
   * produces must not still be reported by the linter for a rule it claims to
   * repair.
   */
  it('leaves nothing behind for the rules it handles', () => {
    const messy = ['#Jammed', 'text\t here   ', '  ', 'more    ', '```js', 'const a = 1'].join('\n')
    const repairable = new Set(['MD009', 'MD010', 'MD018', 'MD046'])

    const before = lintMarkdown(messy).filter((p) => repairable.has(p.rule))
    expect(before.length).toBeGreaterThan(0)

    const after = lintMarkdown(fix(messy)).filter((p) => repairable.has(p.rule))
    expect(after).toEqual([])
  })

  it('is idempotent', () => {
    const messy = '#A\nb\t\nc   \n```\nx'
    const once = fix(messy)
    expect(fix(once)).toBe(once)
  })
})
