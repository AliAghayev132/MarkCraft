// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'

// ── electron ───────────────────────────────────────────────────────────────
import { app } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import { pathKey } from '@shared'
import type { HistoryEntry, HistoryVersion } from '@shared'

// ── ../util ────────────────────────────────────────────────────────────────
import { JsonStore } from '../util/json-store'
import { logger } from '../util/logger'

/**
 * Every saved state of a document, kept so a save is never the end of the
 * previous version.
 *
 * Distinct from crash recovery, which answers "what was I typing when the
 * power went out" and is discarded the moment it is offered back. This answers
 * "what did this look like on Tuesday", survives indefinitely, and is the thing
 * that makes an accidental overwrite recoverable rather than final.
 *
 * Snapshots are stored per document under a hash of its path, so listing one
 * file's history never reads another's — the cost of opening the panel does not
 * grow with how much history the user has accumulated elsewhere.
 */
const FOLDER = 'history'

interface IndexFile {
  /** Keyed by the same hash the payload folder uses. */
  documents: Record<string, HistoryEntry[]>
}

let store: JsonStore<IndexFile> | null = null

function getStore(): JsonStore<IndexFile> {
  store ??= new JsonStore<IndexFile>({
    file: 'history.json',
    defaults: { documents: {} },
    version: 1,
    debounceMs: 200
  })
  return store
}

function documentKey(documentPath: string): string {
  return createHash('sha1').update(pathKey(documentPath)).digest('hex').slice(0, 16)
}

function payloadPath(key: string, id: string): string {
  return path.join(app.getPath('userData'), FOLDER, key, `${id}.md`)
}

/**
 * A line that tells one version apart from the next.
 *
 * Prose is preferred over the title, which is the opposite of what a document
 * summary usually does — and it is the right choice here precisely because
 * every version of a document shares its heading. A list of "Note, Note, Note"
 * is a list nobody can navigate; the first sentence of the body changes as the
 * document does. The heading is the fallback for a document that is only
 * headings, and front matter is skipped so nothing is summarised as `---`.
 */
function summarise(content: string): string {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/, '')
  const lines = body.split('\n')

  for (const line of lines) {
    const text = line.trim()
    if (text && !text.startsWith('#')) return text.replace(/^[-*+]\s+/, '').slice(0, 80)
  }

  for (const line of lines) {
    const text = line.replace(/^#{1,6}\s+/, '').trim()
    if (text) return text.slice(0, 80)
  }

  return ''
}

export async function listHistory(documentPath: string): Promise<HistoryEntry[]> {
  const { documents } = await getStore().read()
  const entries = documents[documentKey(documentPath)] ?? []
  return [...entries].sort((a, b) => b.savedAt - a.savedAt)
}

export async function readVersion(
  documentPath: string,
  id: string
): Promise<HistoryVersion | null> {
  const key = documentKey(documentPath)
  const { documents } = await getStore().read()
  const entry = (documents[key] ?? []).find((candidate) => candidate.id === id)
  if (!entry) return null

  try {
    return { entry, content: await fs.readFile(payloadPath(key, id), 'utf8') }
  } catch (error) {
    logger.warn(`history: payload missing for ${id}`, error)
    return null
  }
}

/**
 * Records a version, unless nothing changed since the last one.
 *
 * The identical-content check is what keeps the list meaningful: autosave fires
 * on a timer and on focus loss, and a history full of twenty identical entries
 * is a history nobody can find anything in.
 */
export async function snapshot(
  documentPath: string,
  content: string,
  limit: number
): Promise<HistoryEntry | null> {
  if (limit <= 0) return null

  const key = documentKey(documentPath)
  const { documents } = await getStore().read()
  const entries = documents[key] ?? []

  const newest = entries.reduce<HistoryEntry | null>(
    (latest, entry) => (latest === null || entry.savedAt > latest.savedAt ? entry : latest),
    null
  )

  if (newest) {
    const previous = await readVersion(documentPath, newest.id)
    if (previous?.content === content) return null
  }

  const entry: HistoryEntry = {
    id: randomUUID(),
    path: documentPath,
    savedAt: Date.now(),
    bytes: Buffer.byteLength(content, 'utf8'),
    summary: summarise(content)
  }

  const target = payloadPath(key, entry.id)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, content, 'utf8')

  const next = [entry, ...entries].sort((a, b) => b.savedAt - a.savedAt)
  const keep = next.slice(0, limit)
  const drop = next.slice(limit)

  await getStore().set({ documents: { ...documents, [key]: keep } })

  for (const stale of drop) {
    await fs.rm(payloadPath(key, stale.id), { force: true }).catch(() => undefined)
  }

  return entry
}

export async function purgeVersion(documentPath: string, id: string): Promise<void> {
  const key = documentKey(documentPath)
  const { documents } = await getStore().read()
  const entries = (documents[key] ?? []).filter((entry) => entry.id !== id)

  await getStore().set({ documents: { ...documents, [key]: entries } })
  await fs.rm(payloadPath(key, id), { force: true }).catch(() => undefined)
}

export async function clearHistory(documentPath: string): Promise<void> {
  const key = documentKey(documentPath)
  const { documents } = await getStore().read()

  const remaining = { ...documents }
  delete remaining[key]

  await getStore().set({ documents: remaining })
  await fs
    .rm(path.join(app.getPath('userData'), FOLDER, key), { recursive: true, force: true })
    .catch(() => undefined)
}

/**
 * Follows a document to its new name.
 *
 * Without this a rename looks exactly like a deletion to the history: the old
 * key is never read again and the new one starts empty, so the user loses every
 * version by doing something entirely ordinary.
 */
export async function renameHistory(from: string, to: string): Promise<void> {
  const oldKey = documentKey(from)
  const newKey = documentKey(to)
  if (oldKey === newKey) return

  const { documents } = await getStore().read()
  const entries = documents[oldKey]
  if (!entries || entries.length === 0) return

  const root = path.join(app.getPath('userData'), FOLDER)
  try {
    await fs.rename(path.join(root, oldKey), path.join(root, newKey))
  } catch (error) {
    logger.warn(`history: could not follow the rename to ${to}`, error)
    return
  }

  const moved = { ...documents, [newKey]: entries.map((entry) => ({ ...entry, path: to })) }
  delete moved[oldKey]
  await getStore().set({ documents: moved })
}
