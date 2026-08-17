// ── node: ──────────────────────────────────────────────────────────────────
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import { pathKey } from '@shared'
import type { PinnedFile, RecentFile, RecentWorkspace } from '@shared'

// ── ./services ─────────────────────────────────────────────────────────────
import { getSettings } from './settings-service'
import { exists } from './fs-service'

// ── ../util ────────────────────────────────────────────────────────────────
import { JsonStore } from '../util/json-store'

interface RecentData {
  files: RecentFile[]
  workspaces: RecentWorkspace[]
  pins: PinnedFile[]
}

const DEFAULTS: RecentData = { files: [], workspaces: [], pins: [] }

let store: JsonStore<RecentData> | null = null

function getStore(): JsonStore<RecentData> {
  store ??= new JsonStore<RecentData>({ file: 'recent.json', defaults: DEFAULTS, version: 1 })
  return store
}

/**
 * Entries whose file has since been deleted are dropped lazily on read rather
 * than eagerly on a timer — the list is short and only read when it is shown.
 */
async function prune<T extends { path: string }>(entries: T[]): Promise<T[]> {
  const checks = await Promise.all(entries.map((entry) => exists(entry.path)))
  return entries.filter((_, index) => checks[index])
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  const data = await getStore().read()
  const alive = await prune(data.files)
  if (alive.length !== data.files.length) {
    await getStore().update((current) => ({ ...current, files: alive }))
  }
  return alive
}

export async function addRecentFile(target: string): Promise<RecentFile[]> {
  const settings = await getSettings()
  const entry: RecentFile = {
    path: target,
    name: path.basename(target),
    directory: path.dirname(target),
    openedAt: Date.now()
  }

  const next = await getStore().update((current) => ({
    ...current,
    files: [entry, ...current.files.filter((f) => pathKey(f.path) !== pathKey(target))].slice(
      0,
      Math.max(1, settings.files.recentLimit)
    )
  }))

  return next.files
}

export async function removeRecentFile(target: string): Promise<RecentFile[]> {
  const next = await getStore().update((current) => ({
    ...current,
    files: current.files.filter((f) => pathKey(f.path) !== pathKey(target))
  }))
  return next.files
}

export async function clearRecentFiles(): Promise<RecentFile[]> {
  const next = await getStore().update((current) => ({ ...current, files: [] }))
  return next.files
}

export async function getRecentWorkspaces(): Promise<RecentWorkspace[]> {
  const data = await getStore().read()
  const alive = await prune(data.workspaces)
  if (alive.length !== data.workspaces.length) {
    await getStore().update((current) => ({ ...current, workspaces: alive }))
  }
  return alive
}

export async function addRecentWorkspace(target: string): Promise<RecentWorkspace[]> {
  const entry: RecentWorkspace = {
    path: target,
    name: path.basename(target) || target,
    openedAt: Date.now()
  }

  const next = await getStore().update((current) => ({
    ...current,
    workspaces: [
      entry,
      ...current.workspaces.filter((w) => pathKey(w.path) !== pathKey(target))
    ].slice(0, 12)
  }))

  return next.workspaces
}

export async function removeRecentWorkspace(target: string): Promise<RecentWorkspace[]> {
  const next = await getStore().update((current) => ({
    ...current,
    workspaces: current.workspaces.filter((w) => pathKey(w.path) !== pathKey(target))
  }))
  return next.workspaces
}

export async function clearRecentWorkspaces(): Promise<RecentWorkspace[]> {
  const next = await getStore().update((current) => ({ ...current, workspaces: [] }))
  return next.workspaces
}

/**
 * True if `target` is a path this application recorded the user opening — a
 * recent file, a pinned file, or a recent workspace folder.
 *
 * This is the check that lets the recent list survive a restart without
 * weakening the path guard: the guard starts empty each launch, and a path is
 * re-granted only because *main's own store* says the user chose it before, not
 * because the renderer asked nicely.
 */
export async function isRemembered(
  target: string
): Promise<{ remembered: boolean; kind: 'file' | 'workspace' | null }> {
  const data = await getStore().read()
  const key = pathKey(target)

  if (data.files.some((f) => pathKey(f.path) === key)) return { remembered: true, kind: 'file' }
  if (data.pins.some((p) => pathKey(p.path) === key)) return { remembered: true, kind: 'file' }
  if (data.workspaces.some((w) => pathKey(w.path) === key)) {
    return { remembered: true, kind: 'workspace' }
  }

  return { remembered: false, kind: null }
}

export async function getPins(): Promise<PinnedFile[]> {
  const data = await getStore().read()
  const alive = await prune(data.pins)
  if (alive.length !== data.pins.length) {
    await getStore().update((current) => ({ ...current, pins: alive }))
  }
  return alive
}

export async function togglePin(target: string): Promise<PinnedFile[]> {
  const next = await getStore().update((current) => {
    const isPinned = current.pins.some((p) => pathKey(p.path) === pathKey(target))
    if (isPinned) {
      return { ...current, pins: current.pins.filter((p) => pathKey(p.path) !== pathKey(target)) }
    }
    const entry: PinnedFile = {
      path: target,
      name: path.basename(target),
      directory: path.dirname(target),
      pinnedAt: Date.now()
    }
    return { ...current, pins: [...current.pins, entry] }
  })

  return next.pins
}

export async function flushRecent(): Promise<void> {
  await getStore().flush()
}
