// ── ../services ────────────────────────────────────────────────────────────
import { watcherService } from '../services/watcher-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireStringArray } from './register'

// ── ../window ──────────────────────────────────────────────────────────────
import { emitToRenderer } from '../window/main-window'

export function registerWatcherHandlers(): void {
  watcherService.setEmitter((event) => emitToRenderer('event:watch', event))

  handle('watcher:watchFiles', ({ paths }) =>
    watcherService.watchFiles(requireStringArray(paths, 'paths'))
  )
  handle('watcher:unwatchFiles', ({ paths }) => {
    watcherService.unwatchFiles(requireStringArray(paths, 'paths'))
  })
  handle('watcher:watchDirectories', ({ paths }) =>
    watcherService.watchDirectories(requireStringArray(paths, 'paths'))
  )
  handle('watcher:unwatchDirectories', ({ paths }) => {
    watcherService.unwatchDirectories(requireStringArray(paths, 'paths'))
  })
  handle('watcher:reset', () => watcherService.reset())
}
