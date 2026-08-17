// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

// ── electron ───────────────────────────────────────────────────────────────
import { app } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import type { TrashEntry } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ../util ────────────────────────────────────────────────────────────────
import { JsonStore } from '../util/json-store'
import { logger } from '../util/logger'

/**
 * MarkCraft's own trash.
 *
 * The operating system already has one, and until now deletes went there — but
 * a recycle bin is a black box to the application: it cannot be listed, an item
 * cannot be purged on its own, and none of it is visible without leaving the
 * editor. Keeping deleted documents here instead makes "what did I delete?" and
 * "get rid of it for good" answerable inside the app, which is the whole point
 * of the feature.
 *
 * Entries are moved, never copied: the bytes are the same bytes, so trashing a
 * large file costs nothing and a restore is exact.
 */
const FOLDER = 'trash'

interface TrashFile {
  entries: TrashEntry[]
}

let store: JsonStore<TrashFile> | null = null

function getStore(): JsonStore<TrashFile> {
  store ??= new JsonStore<TrashFile>({
    file: 'trash.json',
    defaults: { entries: [] },
    version: 1,
    debounceMs: 120
  })
  return store
}

function trashRoot(): string {
  return path.join(app.getPath('userData'), FOLDER)
}

/** Where one entry's payload lives, keyed by id so two files may share a name. */
function payloadDir(id: string): string {
  return path.join(trashRoot(), id)
}

export async function listTrash(): Promise<TrashEntry[]> {
  const { entries } = await getStore().read()
  return [...entries].sort((a, b) => b.deletedAt - a.deletedAt)
}

/**
 * Moves one path into the trash and records it.
 *
 * `limit` is applied straight away rather than lazily, so the folder cannot
 * quietly grow past what the user asked to keep.
 */
export async function moveToTrash(target: string, limit: number): Promise<TrashEntry> {
  const resolved = await pathGuard.assert(target)
  const stats = await fs.stat(resolved)

  const id = randomUUID()
  const name = path.basename(resolved)
  const directory = payloadDir(id)
  await fs.mkdir(directory, { recursive: true })

  const destination = path.join(directory, name)
  try {
    await fs.rename(resolved, destination)
  } catch (error) {
    // `rename` cannot cross a volume, and the trash lives on the system drive
    // while the document may not.
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
    await fs.cp(resolved, destination, { recursive: true })
    await fs.rm(resolved, { recursive: true, force: true })
  }

  const entry: TrashEntry = {
    id,
    name,
    originalPath: resolved,
    kind: stats.isDirectory() ? 'directory' : 'file',
    size: stats.isDirectory() ? 0 : stats.size,
    deletedAt: Date.now()
  }

  const { entries } = await getStore().read()
  await getStore().set({ entries: [entry, ...entries] })
  await trim(limit)

  return entry
}

/**
 * Puts an entry back where it came from.
 *
 * If something now occupies the original name the restore is placed beside it
 * rather than over it — a delete-then-restore must never be a way to lose the
 * file that took its place.
 */
export async function restoreFromTrash(id: string): Promise<string> {
  const { entries } = await getStore().read()
  const entry = entries.find((candidate) => candidate.id === id)
  if (!entry) throw new Error('That item is no longer in the trash.')

  const source = path.join(payloadDir(entry.id), entry.name)
  let destination = entry.originalPath

  for (let attempt = 1; attempt < 100 && (await exists(destination)); attempt++) {
    const extension = entry.kind === 'file' ? path.extname(entry.name) : ''
    const stem = entry.name.slice(0, entry.name.length - extension.length)
    destination = path.join(path.dirname(entry.originalPath), `${stem} (${attempt})${extension}`)
  }

  await fs.mkdir(path.dirname(destination), { recursive: true })
  try {
    await fs.rename(source, destination)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
    await fs.cp(source, destination, { recursive: true })
    await fs.rm(source, { recursive: true, force: true })
  }

  // The user just chose to put a file here, so it becomes reachable again.
  pathGuard.grantFile(destination)

  await getStore().set({ entries: entries.filter((candidate) => candidate.id !== id) })
  await fs.rm(payloadDir(id), { recursive: true, force: true }).catch(() => undefined)

  return destination
}

/** Deletes one entry for good. */
export async function purgeFromTrash(id: string): Promise<void> {
  const { entries } = await getStore().read()
  await getStore().set({ entries: entries.filter((entry) => entry.id !== id) })
  await fs.rm(payloadDir(id), { recursive: true, force: true }).catch(() => undefined)
}

export async function clearTrash(): Promise<void> {
  await getStore().set({ entries: [] })
  await fs.rm(trashRoot(), { recursive: true, force: true }).catch(() => undefined)
}

/**
 * Drops the oldest entries past `limit`.
 *
 * Zero means unlimited — the trash then only ever grows on purpose, which is a
 * defensible choice for someone who would rather decide for themselves when
 * something is gone.
 */
export async function trim(limit: number): Promise<void> {
  if (limit <= 0) return

  const { entries } = await getStore().read()
  if (entries.length <= limit) return

  const sorted = [...entries].sort((a, b) => b.deletedAt - a.deletedAt)
  const keep = sorted.slice(0, limit)
  const drop = sorted.slice(limit)

  await getStore().set({ entries: keep })

  for (const entry of drop) {
    await fs.rm(payloadDir(entry.id), { recursive: true, force: true }).catch((error: unknown) => {
      logger.warn(`trash: could not remove ${entry.id}`, error)
    })
  }
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.stat(target)
    return true
  } catch {
    return false
  }
}
