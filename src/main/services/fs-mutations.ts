// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { shell } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import { type DirEntry } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

// ── ./services ─────────────────────────────────────────────────────────────
import { toDirEntry } from './fs-entries'
import { exists } from './fs-assets'

/**
 * The operations that change the tree.
 *
 * Gathered deliberately: these are the calls that can lose a user's work, and
 * every one of them goes through the path guard and — where a name could
 * collide — through `freeDestination` rather than overwriting.
 */
/** `notes.md` -> `notes copy.md` -> `notes copy 2.md`. */
async function nextAvailableName(source: string, isDirectory: boolean): Promise<string> {
  const dir = path.dirname(source)
  const base = path.basename(source)
  const extension = isDirectory ? '' : path.extname(base)
  const stem = isDirectory ? base : base.slice(0, base.length - extension.length)

  for (let i = 1; i < 1000; i++) {
    const suffix = i === 1 ? ' copy' : ` copy ${i}`
    const candidate = path.join(dir, `${stem}${suffix}${extension}`)
    if (!(await exists(candidate))) return candidate
  }
  throw Object.assign(new Error('Could not find an available name'), { code: 'EEXIST' })
}

/** `image.png` -> `image (2).png` when the destination is taken. */
export async function freeDestination(dir: string, name: string): Promise<string> {
  const extension = path.extname(name)
  const stem = name.slice(0, name.length - extension.length)

  let candidate = path.join(dir, name)
  for (let i = 2; (await exists(candidate)) && i < 1000; i++) {
    candidate = path.join(dir, `${stem} (${i})${extension}`)
  }
  return candidate
}

export async function createFile(target: string, content = ''): Promise<DirEntry> {
  const resolved = await pathGuard.assert(target)
  await fs.mkdir(path.dirname(resolved), { recursive: true })

  // 'wx' fails rather than truncating if something is already there.
  const handle = await fs.open(resolved, 'wx')
  try {
    if (content) await handle.write(content)
    await handle.sync()
  } finally {
    await handle.close()
  }

  return toDirEntry(resolved)
}

export async function createDirectory(target: string): Promise<DirEntry> {
  const resolved = await pathGuard.assert(target)
  await fs.mkdir(resolved)
  return toDirEntry(resolved)
}

export async function renameEntry(from: string, to: string): Promise<DirEntry> {
  const resolvedFrom = await pathGuard.assert(from)
  const resolvedTo = await pathGuard.assert(to)

  // Case-only renames on Windows/macOS need a two-step dance, otherwise the
  // filesystem treats source and destination as the same entry.
  if (resolvedFrom.toLowerCase() === resolvedTo.toLowerCase() && resolvedFrom !== resolvedTo) {
    const staging = `${resolvedFrom}.mc-rename-${Date.now()}`
    await fs.rename(resolvedFrom, staging)
    await fs.rename(staging, resolvedTo)
    return toDirEntry(resolvedTo)
  }

  if (await exists(resolvedTo)) {
    throw Object.assign(new Error(`"${path.basename(resolvedTo)}" already exists`), {
      code: 'EEXIST'
    })
  }

  await fs.rename(resolvedFrom, resolvedTo)
  return toDirEntry(resolvedTo)
}

export async function deleteEntries(paths: string[], toTrash: boolean): Promise<void> {
  const resolved = await pathGuard.assertAll(paths)

  for (const target of resolved) {
    if (toTrash) {
      try {
        await shell.trashItem(target)
        continue
      } catch (error) {
        // Network shares and some Windows configurations have no recycle bin.
        logger.warn(`trashItem failed for ${target}, falling back to permanent delete`, error)
      }
    }
    await fs.rm(target, { recursive: true, force: false })
  }
}

export async function duplicateEntry(target: string): Promise<DirEntry> {
  const resolved = await pathGuard.assert(target)
  const stats = await fs.stat(resolved)
  const destination = await nextAvailableName(resolved, stats.isDirectory())

  if (stats.isDirectory()) {
    await fs.cp(resolved, destination, { recursive: true, errorOnExist: true, force: false })
  } else {
    await fs.copyFile(resolved, destination)
  }

  return toDirEntry(destination)
}

export async function moveEntries(sources: string[], targetDir: string): Promise<DirEntry[]> {
  const resolvedDir = await pathGuard.assert(targetDir)
  const resolvedSources = await pathGuard.assertAll(sources)
  const results: DirEntry[] = []

  for (const source of resolvedSources) {
    if (source === resolvedDir || resolvedDir.startsWith(source + path.sep)) {
      throw Object.assign(new Error('Cannot move a folder into itself'), {
        code: 'INVALID_ARGUMENT'
      })
    }

    const destination = await freeDestination(resolvedDir, path.basename(source))
    try {
      await fs.rename(source, destination)
    } catch (error) {
      // Cross-device move: fall back to copy + delete.
      if ((error as NodeJS.ErrnoException).code === 'EXDEV') {
        await fs.cp(source, destination, { recursive: true })
        await fs.rm(source, { recursive: true, force: true })
      } else {
        throw error
      }
    }
    results.push(await toDirEntry(destination))
  }

  return results
}

export async function copyEntries(sources: string[], targetDir: string): Promise<DirEntry[]> {
  const resolvedDir = await pathGuard.assert(targetDir)
  const resolvedSources = await pathGuard.assertAll(sources)
  const results: DirEntry[] = []

  for (const source of resolvedSources) {
    const destination = await freeDestination(resolvedDir, path.basename(source))
    const stats = await fs.stat(source)
    if (stats.isDirectory()) {
      await fs.cp(source, destination, { recursive: true })
    } else {
      await fs.copyFile(source, destination)
    }
    results.push(await toDirEntry(destination))
  }

  return results
}
