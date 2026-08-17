// ── @shared ────────────────────────────────────────────────────────────────
import type { HistoryEntry, HistoryVersion } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { soft, unwrap } from './ipc'

export const historyService = {
  list(path: string): Promise<HistoryEntry[]> {
    return soft(window.api.history.list({ path }), [])
  },
  read(path: string, id: string): Promise<HistoryVersion | null> {
    return soft(window.api.history.read({ path, id }), null)
  },
  purge(path: string, id: string): Promise<void> {
    return unwrap(window.api.history.purge({ path, id }))
  },
  clear(path: string): Promise<void> {
    return unwrap(window.api.history.clear({ path }))
  }
}
