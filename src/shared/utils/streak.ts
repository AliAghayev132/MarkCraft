/**
 * Writing streaks.
 *
 * The one form of gamification that suits a text editor: it counts days the
 * user actually wrote, and nothing else. No points, no levels, no badges for
 * opening the application — those reward using the tool rather than doing the
 * work, and a writer notices the difference immediately.
 *
 * Days are local calendar days, not 24-hour periods. Someone who writes at
 * 23:50 and again at 00:10 has written on two days, and telling them otherwise
 * would be arguing with their own sense of what a day is.
 */
export interface DayRecord {
  /** `YYYY-MM-DD` in the writer's own timezone. */
  day: string
  words: number
}

export interface StreakSummary {
  /** Days in a row up to and including today, or yesterday if today is unwritten. */
  current: number
  longest: number
  /** Days written at all. */
  total: number
  wordsToday: number
  /** True when today has already been written on. */
  writtenToday: boolean
}

/** The local calendar day of a timestamp, as `YYYY-MM-DD`. */
export function dayOf(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/** The day before a `YYYY-MM-DD`, handling months and leap years. */
export function previousDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number)
  // Midday avoids the hour a daylight-saving shift could move the date across.
  const at = new Date(year, month - 1, date, 12)
  at.setDate(at.getDate() - 1)

  return dayOf(at.getTime())
}

/**
 * Reads the streak out of the days written on.
 *
 * A streak that ended yesterday still counts today: a writer who has not yet
 * started this morning has not broken anything, and showing them a zero before
 * they have had a chance to write is the opposite of encouragement. It breaks
 * only once a whole day has passed unwritten.
 */
export function summarise(records: DayRecord[], today: string): StreakSummary {
  const written = new Map(records.filter((r) => r.words > 0).map((r) => [r.day, r.words]))

  const writtenToday = written.has(today)
  let cursor = writtenToday ? today : previousDay(today)
  let current = 0

  while (written.has(cursor)) {
    current++
    cursor = previousDay(cursor)
  }

  // The longest run anywhere in the history, which needs the days in order.
  const days = [...written.keys()].sort()
  let longest = 0
  let run = 0
  let last: string | null = null

  for (const day of days) {
    run = last !== null && previousDay(day) === last ? run + 1 : 1
    longest = Math.max(longest, run)
    last = day
  }

  return {
    current,
    longest: Math.max(longest, current),
    total: written.size,
    wordsToday: written.get(today) ?? 0,
    writtenToday
  }
}

/**
 * Adds words written to today's total.
 *
 * The caller passes what was *added* since the last save, not the document's
 * length — summing lengths would count the same paragraph again on every save,
 * and taking the maximum would credit a writer with one long document rather
 * than a day's work across five short ones.
 *
 * A negative delta is dropped rather than subtracted: someone who cut three
 * hundred words in an afternoon has not written minus three hundred, and
 * editing down is work too.
 */
export function record(records: DayRecord[], day: string, added: number): DayRecord[] {
  const words = Math.max(0, Math.round(added))
  const existing = records.find((r) => r.day === day)

  if (!existing) return [...records, { day, words }].sort((a, b) => a.day.localeCompare(b.day))

  return records.map((r) => (r.day === day ? { ...r, words: r.words + words } : r))
}

/** The last `days` calendar days, oldest first — for a contribution strip. */
export function recentDays(today: string, days: number): string[] {
  const out: string[] = []
  let cursor = today

  for (let at = 0; at < days; at++) {
    out.unshift(cursor)
    cursor = previousDay(cursor)
  }

  return out
}
