// ── @shared ────────────────────────────────────────────────────────────────
import type { TrashEntry } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { soft, unwrap } from './ipc'

export const trashService = {
  list(): Promise<TrashEntry[]> {
    return soft(window.api.trash.list(), [])
  },
  restore(id: string): Promise<string> {
    return unwrap(window.api.trash.restore({ id })).then((result) => result.path)
  },
  purge(id: string): Promise<void> {
    return unwrap(window.api.trash.purge({ id }))
  },
  clear(): Promise<void> {
    return unwrap(window.api.trash.clear())
  }
}
