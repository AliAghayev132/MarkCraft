// ── ../services ────────────────────────────────────────────────────────────
import { loadStudy, resetStudy, saveStudy } from '../services/study-service'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/**
 * A document's review schedule.
 *
 * Guarded on the document's own path, like history: a schedule for a file the
 * user may not open would be a way to learn that the file exists.
 */
export function registerStudyHandlers(): void {
  handle('study:load', async ({ path: target }) =>
    loadStudy(await pathGuard.assert(requireString(target, 'path')))
  )

  handle('study:save', async ({ path: target, card, state, due }) =>
    saveStudy(await pathGuard.assert(requireString(target, 'path')), requireString(card, 'card'), state, due)
  )

  handle('study:reset', async ({ path: target }) =>
    resetStudy(await pathGuard.assert(requireString(target, 'path')))
  )
}
