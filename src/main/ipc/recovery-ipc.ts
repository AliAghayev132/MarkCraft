// ── ../services ────────────────────────────────────────────────────────────
import {
  clearRecovery,
  dropRecovery,
  listRecovery,
  putRecovery
} from '../services/recovery-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

export function registerRecoveryHandlers(): void {
  handle('recovery:list', () => listRecovery())

  handle('recovery:put', (record) => {
    requireString(record.id, 'id')
    if (typeof record.content !== 'string') {
      throw Object.assign(new Error('"content" must be a string'), { code: 'INVALID_ARGUMENT' })
    }
    return putRecovery(record)
  })

  handle('recovery:drop', ({ id }) => dropRecovery(requireString(id, 'id')))
  handle('recovery:clear', () => clearRecovery())
}
