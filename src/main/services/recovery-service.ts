// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { app } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import type { RecoveryRecord } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { atomicWriteFile } from '../security/atomic-write'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

/**
 * The crash-recovery journal.
 *
 * While a document is dirty the renderer pushes its content here on an idle
 * tick; the record is deleted the moment the document is saved or closed
 * cleanly. Anything still present at startup is, by definition, work that was
 * never committed to disk — the recovery modal offers it back.
 *
 * Untitled documents live here entirely (`path: null`), which is what makes it
 * safe to quit with unsaved scratch buffers open.
 */
function journalDir(): string {
  return path.join(app.getPath('userData'), 'recovery')
}

function fileFor(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return path.join(journalDir(), `${safe}.json`)
}

export async function listRecovery(): Promise<RecoveryRecord[]> {
  try {
    const names = await fs.readdir(journalDir())
    const records = await Promise.all(
      names
        .filter((name) => name.endsWith('.json'))
        .map(async (name) => {
          try {
            const raw = await fs.readFile(path.join(journalDir(), name), 'utf8')
            return JSON.parse(raw) as RecoveryRecord
          } catch {
            return null
          }
        })
    )
    return records
      .filter((r): r is RecoveryRecord => r !== null && typeof r.content === 'string')
      .sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn('recovery: unable to read journal', error)
    }
    return []
  }
}

export async function putRecovery(record: RecoveryRecord): Promise<void> {
  await fs.mkdir(journalDir(), { recursive: true })
  await atomicWriteFile(fileFor(record.id), JSON.stringify(record))
}

export async function dropRecovery(id: string): Promise<void> {
  await fs.rm(fileFor(id), { force: true }).catch(() => undefined)
}

export async function clearRecovery(): Promise<void> {
  await fs.rm(journalDir(), { recursive: true, force: true }).catch(() => undefined)
}
