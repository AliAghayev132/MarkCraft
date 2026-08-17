// ── ../services ────────────────────────────────────────────────────────────
import {
  clearHistory,
  listHistory,
  purgeVersion,
  readVersion
} from '../services/history-service'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/**
 * A document's saved versions.
 *
 * Every channel takes the document's own path and puts it through the guard
 * first, so history is reachable exactly when the document is — reading an
 * old version of a file you are not allowed to open would be a way around it.
 */
export function registerHistoryHandlers(): void {
  handle('history:list', async ({ path: target }) =>
    listHistory(await pathGuard.assert(requireString(target, 'path')))
  )

  handle('history:read', async ({ path: target, id }) =>
    readVersion(await pathGuard.assert(requireString(target, 'path')), requireString(id, 'id'))
  )

  handle('history:purge', async ({ path: target, id }) =>
    purgeVersion(await pathGuard.assert(requireString(target, 'path')), requireString(id, 'id'))
  )

  handle('history:clear', async ({ path: target }) =>
    clearHistory(await pathGuard.assert(requireString(target, 'path')))
  )
}
