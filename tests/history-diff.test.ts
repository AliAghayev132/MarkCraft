import { describe, expect, it } from 'vitest'

import { collapseUnchanged, diffLines, summariseDiff } from '../src/renderer/features/history/diff'

/**
 * The diff is what the user reads before deciding to overwrite their document,
 * so a wrong one is worse than none. These cover the cases where a hand-rolled
 * LCS walk goes wrong: the prefix/suffix trimming, a change at either end, and
 * a move that a naive line comparison would report as an unrelated add.
 */
describe('diffLines', () => {
  it('reports nothing for identical text', () => {
    const lines = diffLines('a\nb\nc', 'a\nb\nc')
    expect(summariseDiff(lines)).toEqual({ added: 0, removed: 0, unchanged: 3 })
  })

  it('finds a change in the middle', () => {
    const lines = diffLines('a\nb\nc', 'a\nB\nc')
    expect(summariseDiff(lines)).toEqual({ added: 1, removed: 1, unchanged: 2 })
    expect(lines.map((line) => `${line.kind}:${line.text}`)).toEqual([
      'same:a',
      'removed:b',
      'added:B',
      'same:c'
    ])
  })

  it('finds a change at the very start', () => {
    const lines = diffLines('a\nb', 'A\nb')
    expect(summariseDiff(lines)).toEqual({ added: 1, removed: 1, unchanged: 1 })
  })

  it('finds a change at the very end', () => {
    const lines = diffLines('a\nb', 'a\nB')
    expect(summariseDiff(lines)).toEqual({ added: 1, removed: 1, unchanged: 1 })
  })

  it('reports a pure insertion as added only', () => {
    const lines = diffLines('a\nc', 'a\nb\nc')
    expect(summariseDiff(lines)).toEqual({ added: 1, removed: 0, unchanged: 2 })
  })

  it('reports a pure deletion as removed only', () => {
    const lines = diffLines('a\nb\nc', 'a\nc')
    expect(summariseDiff(lines)).toEqual({ added: 0, removed: 1, unchanged: 2 })
  })

  it('handles an empty side', () => {
    expect(summariseDiff(diffLines('', 'a\nb'))).toEqual({ added: 2, removed: 1, unchanged: 0 })
    expect(summariseDiff(diffLines('a\nb', ''))).toEqual({ added: 1, removed: 2, unchanged: 0 })
  })

  it('keeps the common subsequence when a block moves', () => {
    // A naive walk pairs the wrong lines here and reports far more churn.
    const lines = diffLines('one\ntwo\nthree\nfour', 'one\nthree\nfour\ntwo')
    const summary = summariseDiff(lines)
    expect(summary.removed).toBe(1)
    expect(summary.added).toBe(1)
    expect(summary.unchanged).toBe(3)
  })

  it('numbers lines against the side they came from', () => {
    const lines = diffLines('a\nb\nc', 'a\nc')
    const removed = lines.find((line) => line.kind === 'removed')
    expect(removed?.beforeLine).toBe(2)
    expect(removed?.afterLine).toBeNull()
  })
})

describe('collapseUnchanged', () => {
  it('hides long unchanged runs and counts them', () => {
    const before = ['x', ...Array.from({ length: 20 }, (_, i) => `line ${i}`)].join('\n')
    const after = ['y', ...Array.from({ length: 20 }, (_, i) => `line ${i}`)].join('\n')

    const collapsed = collapseUnchanged(diffLines(before, after), 2)
    const gaps = collapsed.filter((line) => line.kind === 'gap')

    expect(gaps).toHaveLength(1)
    expect(Number(gaps[0]?.text)).toBe(18)
    expect(collapsed.length).toBeLessThan(10)
  })

  it('leaves a short diff alone', () => {
    const lines = diffLines('a\nb', 'a\nB')
    expect(collapseUnchanged(lines, 3).filter((line) => line.kind === 'gap')).toHaveLength(0)
  })
})
