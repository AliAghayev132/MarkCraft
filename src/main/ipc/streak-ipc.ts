// ── ../services ────────────────────────────────────────────────────────────
import { addWords, loadStreak, resetStreak } from '../services/streak-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/** The writing streak. No paths, so nothing to guard. */
export function registerStreakHandlers(): void {
  handle('streak:load', () => loadStreak())

  handle('streak:add', ({ day, added }) =>
    addWords(requireString(day, 'day'), Number.isFinite(added) ? added : 0)
  )

  handle('streak:reset', () => resetStreak())
}
