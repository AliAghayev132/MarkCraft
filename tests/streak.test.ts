import { describe, expect, it } from 'vitest'

import { dayOf, previousDay, recentDays, record, summarise, type DayRecord } from '@shared'

const days = (...list: [string, number][]): DayRecord[] =>
  list.map(([day, words]) => ({ day, words }))

describe('dayOf', () => {
  it('uses the local calendar day', () => {
    const at = new Date(2026, 7, 16, 23, 50).getTime()
    expect(dayOf(at)).toBe('2026-08-16')
  })

  /* 23:50 and 00:10 are two days to the person writing, whatever UTC says. */
  it('separates late night from early morning', () => {
    const late = new Date(2026, 7, 16, 23, 50).getTime()
    const early = new Date(2026, 7, 17, 0, 10).getTime()
    expect(dayOf(late)).not.toBe(dayOf(early))
  })
})

describe('previousDay', () => {
  it('steps back a day', () => {
    expect(previousDay('2026-08-16')).toBe('2026-08-15')
  })

  it('crosses a month boundary', () => {
    expect(previousDay('2026-08-01')).toBe('2026-07-31')
  })

  it('crosses a year boundary', () => {
    expect(previousDay('2026-01-01')).toBe('2025-12-31')
  })

  it('handles a leap day', () => {
    expect(previousDay('2028-03-01')).toBe('2028-02-29')
  })
})

describe('summarise', () => {
  it('counts a run up to today', () => {
    const summary = summarise(days(['2026-08-14', 10], ['2026-08-15', 20], ['2026-08-16', 30]), '2026-08-16')

    expect(summary).toMatchObject({ current: 3, longest: 3, total: 3, wordsToday: 30, writtenToday: true })
  })

  /*
   * The judgement that makes this humane: a writer who has not started this
   * morning has not broken anything. Showing a zero before they have had the
   * chance to write is the opposite of encouragement.
   */
  it('keeps a streak alive on a day not yet written', () => {
    const summary = summarise(days(['2026-08-14', 10], ['2026-08-15', 20]), '2026-08-16')

    expect(summary.current).toBe(2)
    expect(summary.writtenToday).toBe(false)
    expect(summary.wordsToday).toBe(0)
  })

  it('breaks once a whole day has passed unwritten', () => {
    expect(summarise(days(['2026-08-14', 10]), '2026-08-16').current).toBe(0)
  })

  it('remembers the longest run even after it ends', () => {
    const summary = summarise(
      days(['2026-08-01', 1], ['2026-08-02', 1], ['2026-08-03', 1], ['2026-08-10', 1]),
      '2026-08-10'
    )

    expect(summary.current).toBe(1)
    expect(summary.longest).toBe(3)
  })

  it('ignores days with no words', () => {
    const summary = summarise(days(['2026-08-15', 0], ['2026-08-16', 5]), '2026-08-16')
    expect(summary.total).toBe(1)
    expect(summary.current).toBe(1)
  })

  it('is all zeroes for a writer who has not started', () => {
    expect(summarise([], '2026-08-16')).toMatchObject({ current: 0, longest: 0, total: 0 })
  })
})

describe('record', () => {
  it('adds a day that is not there', () => {
    expect(record([], '2026-08-16', 120)).toEqual([{ day: '2026-08-16', words: 120 }])
  })

  /* The caller passes what was added, so a day's work accumulates. */
  it('adds to the day already there', () => {
    const after = record(days(['2026-08-16', 500]), '2026-08-16', 200)
    expect(after).toEqual([{ day: '2026-08-16', words: 700 }])
  })

  /* Cutting three hundred words is not writing minus three hundred. */
  it('never subtracts', () => {
    const after = record(days(['2026-08-16', 700]), '2026-08-16', -400)
    expect(after[0].words).toBe(700)
  })

  it('rounds a fractional delta', () => {
    expect(record([], '2026-08-16', 12.6)[0].words).toBe(13)
  })

  it('keeps the history in order', () => {
    const after = record(days(['2026-08-16', 1]), '2026-08-14', 1)
    expect(after.map((r) => r.day)).toEqual(['2026-08-14', '2026-08-16'])
  })
})

describe('recentDays', () => {
  it('returns the window oldest first, ending today', () => {
    expect(recentDays('2026-08-16', 3)).toEqual(['2026-08-14', '2026-08-15', '2026-08-16'])
  })

  it('crosses month boundaries', () => {
    expect(recentDays('2026-08-02', 3)).toEqual(['2026-07-31', '2026-08-01', '2026-08-02'])
  })
})
