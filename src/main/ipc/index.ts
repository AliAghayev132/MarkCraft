// ── electron ───────────────────────────────────────────────────────────────
import { ipcMain } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import { INTERNAL_GRANT_PATHS } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { registerAiHandlers } from './ai-ipc'
import { registerDialogHandlers } from './dialog-ipc'
import { registerFileHandlers } from './files-ipc'
import { registerHistoryHandlers } from './history-ipc'
import { registerIconHandlers } from './icons-ipc'
import { registerLocaleHandlers } from './locales-ipc'
import { registerOutputHandlers } from './output-ipc'
import { registerRecoveryHandlers } from './recovery-ipc'
import { registerLinksHandlers } from './links-ipc'
import { registerSearchHandlers } from './search-ipc'
import { registerHttpHandlers } from './http-ipc'
import { registerRunHandlers } from './run-ipc'
import { registerStreakHandlers } from './streak-ipc'
import { registerStudyHandlers } from './study-ipc'
import { registerSettingsHandlers } from './settings-ipc'
import { registerSystemHandlers } from './system-ipc'
import { registerTrashHandlers } from './trash-ipc'
import { registerWatcherHandlers } from './watcher-ipc'
import { registerWorkspaceHandlers } from './workspace-ipc'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

export function registerIpcHandlers(): void {
  registerSystemHandlers()
  registerFileHandlers()
  registerDialogHandlers()
  registerWorkspaceHandlers()
  registerSettingsHandlers()
  registerIconHandlers()
  registerLocaleHandlers()
  registerWatcherHandlers()
  registerRecoveryHandlers()
  registerLinksHandlers()
  registerSearchHandlers()
  registerHttpHandlers()
  registerRunHandlers()
  registerStreakHandlers()
  registerStudyHandlers()
  registerOutputHandlers()
  registerAiHandlers()
  registerTrashHandlers()
  registerHistoryHandlers()
  registerDropGrantHandler()

  logger.debug('ipc: handlers registered')
}

/**
 * Drag-and-drop grant.
 *
 * Only the preload calls this, and only with paths it resolved from real
 * `File` objects via `webUtils.getPathForFile` — a path that could not have
 * been fabricated by renderer script. Dropping a file onto the window is an
 * explicit user gesture, so the dropped file becomes reachable exactly like one
 * chosen in the open dialog.
 */
function registerDropGrantHandler(): void {
  ipcMain.handle(INTERNAL_GRANT_PATHS, (_event, paths: unknown) => {
    if (!Array.isArray(paths)) return []
    const granted: string[] = []

    for (const target of paths) {
      if (typeof target !== 'string' || target.length === 0) continue
      pathGuard.grantFile(target)
      granted.push(target)
    }

    return granted
  })
}
