// ── @shared ────────────────────────────────────────────────────────────────
import { record, type DayRecord } from '@shared'

// ── ../util ────────────────────────────────────────────────────────────────
import { JsonStore } from '../util/json-store'

/**
 * Days written on, and how much.
 *
 * One row per day the user wrote — a hundred rows for a hundred days, not one
 * per save. Kept for two years and then dropped: a streak nobody can remember
 * is not motivating, and an unbounded file for a feature this small would be
 * the tail wagging the dog.
 */
interface StreakFile {
  days: DayRecord[]
}

const KEEP_DAYS = 730

let store: JsonStore<StreakFile> | null = null

function getStore(): JsonStore<StreakFile> {
  store ??= new JsonStore<StreakFile>({
    file: 'streak.json',
    defaults: { days: [] },
    version: 1,
    debounceMs: 500
  })

  return store
}

export async function loadStreak(): Promise<DayRecord[]> {
  return (await getStore().read()).days
}

export async function addWords(day: string, added: number): Promise<DayRecord[]> {
  const next = await getStore().update((current) => ({
    days: record(current.days, day, added).slice(-KEEP_DAYS)
  }))

  return next.days
}

export async function resetStreak(): Promise<void> {
  await getStore().set({ days: [] })
}
