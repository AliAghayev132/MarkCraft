import { describe, expect, it } from 'vitest'

import { fuzzyMatch, rankFuzzy } from '@shared'

/**
 * Finding a file by a few letters of its name.
 *
 * Any subsequence matches; what makes a quick-open useful is that the *right*
 * file comes first. Almost everything below is about ordering rather than about
 * whether something matched.
 */
const best = (query: string, names: string[]): string =>
  rankFuzzy(query, names, (name) => name)[0]?.item ?? '(nothing)'

describe('matching', () => {
  it('takes the letters in order, with gaps', () => {
    expect(fuzzyMatch('usrv', 'user-service.ts').score).toBeGreaterThan(0)
  })

  it('refuses letters that are not there', () => {
    expect(fuzzyMatch('xyz', 'user-service.ts').score).toBe(0)
  })

  it('refuses letters that are there in the wrong order', () => {
    expect(fuzzyMatch('vrsu', 'user').score).toBe(0)
  })

  it('refuses a query longer than the name', () => {
    expect(fuzzyMatch('abcdefgh', 'ab.md').score).toBe(0)
  })

  it('matches everything when nothing is typed', () => {
    expect(fuzzyMatch('', 'anything').score).toBeGreaterThan(0)
  })

  it('says which characters it matched, for highlighting', () => {
    // u at 0, r at 3 — the gap is the point.
    expect(fuzzyMatch('ur', 'user').positions).toEqual([0, 3])
  })
})

describe('which one comes first', () => {
  it('prefers letters that are together', () => {
    expect(best('user', ['u-s-e-r-x.md', 'user.md'])).toBe('user.md')
  })

  it('prefers a letter that starts a word', () => {
    // How people abbreviate: `usrv` means user-service.
    expect(best('usrv', ['unusual-serviette.md', 'user-service.md'])).toBe('user-service.md')
  })

  it('prefers the shorter name for the same letters', () => {
    expect(best('todo', ['a-very-long-todo-list-for-later.md', 'todo.md'])).toBe('todo.md')
  })

  it('prefers a match in the name over one in the folder', () => {
    expect(best('notes', ['notes/other-file.md', 'archive/notes.md'])).toBe('archive/notes.md')
  })

  it('settles a tie the way anybody would expect', () => {
    expect(best('README', ['readme.md', 'README.md'])).toBe('README.md')
  })

  it('finds a name in a deep folder', () => {
    const files = ['src/renderer/features/canvas/CanvasView.tsx', 'src/main/index.ts']
    expect(best('canvview', files)).toBe('src/renderer/features/canvas/CanvasView.tsx')
  })
})

describe('the ranked list', () => {
  it('leaves everything in order when nothing is typed', () => {
    const names = ['c.md', 'a.md', 'b.md']
    expect(rankFuzzy('', names, (name) => name).map((r) => r.item)).toEqual(names)
  })

  it('drops what did not match', () => {
    const names = ['alpha.md', 'beta.md']
    expect(rankFuzzy('alp', names, (name) => name)).toHaveLength(1)
  })

  it('stops at the limit', () => {
    const names = Array.from({ length: 200 }, (_, at) => `file-${at}.md`)
    expect(rankFuzzy('file', names, (name) => name, 10)).toHaveLength(10)
  })

  it('is empty when nothing matches', () => {
    expect(rankFuzzy('zzz', ['a.md'], (name) => name)).toEqual([])
  })
})
