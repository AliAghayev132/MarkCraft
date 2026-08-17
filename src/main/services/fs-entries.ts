// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs, type Dir, type Stats } from 'node:fs'
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import { type DirEntry, type FileStamp } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { sha256 } from '../security/atomic-write'
import { pathGuard } from '../security/path-guard'

/**
 * What is on disk, described.
 *
 * Reading a directory and identifying a file are the cheap, frequently-called
 * half of the filesystem service; separating them from the half that changes
 * things keeps the risky operations easy to find.
 */

/** Directories never worth walking into for search or tree expansion. */
export const NOISY_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'out',
  'build',
  '.next',
  '.cache',
  '.turbo',
  '.venv',
  '__pycache__',
  '.idea',
  '.DS_Store'
])

function isHidden(name: string): boolean {
  return name.startsWith('.')
}

export function stampFromStats(stats: Stats, hash: string): FileStamp {
  return { mtimeMs: Math.round(stats.mtimeMs), size: stats.size, hash }
}

export async function toDirEntry(fullPath: string, stats?: Stats): Promise<DirEntry> {
  const s = stats ?? (await fs.lstat(fullPath))
  const isSymlink = s.isSymbolicLink()
  const target = isSymlink ? await fs.stat(fullPath).catch(() => s) : s
  const kind = target.isDirectory() ? 'directory' : 'file'
  const name = path.basename(fullPath)

  return {
    name,
    path: fullPath,
    kind,
    size: kind === 'file' ? target.size : 0,
    modifiedAt: Math.round(target.mtimeMs),
    isSymlink,
    hasChildren: kind === 'directory' ? await directoryHasChildren(fullPath) : false,
    ext: kind === 'file' ? path.extname(name).slice(1).toLowerCase() : ''
  }
}

/**
 * Cheap "does this folder have anything in it" probe. Reading only the first
 * entry keeps expanding a large tree responsive — we never enumerate a folder
 * we are not about to display.
 */
async function directoryHasChildren(dir: string): Promise<boolean> {
  let handle: Dir | undefined
  try {
    handle = await fs.opendir(dir)
    const first = await handle.read()
    return first !== null
  } catch {
    return false
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

export async function listDirectory(dirPath: string, showHidden: boolean): Promise<DirEntry[]> {
  const resolved = await pathGuard.assert(dirPath)
  const dirents = await fs.readdir(resolved, { withFileTypes: true })

  const entries = await Promise.all(
    dirents
      .filter((d) => showHidden || !isHidden(d.name))
      .filter((d) => !(d.isDirectory() && NOISY_DIRECTORIES.has(d.name)))
      .map(async (d) => {
        const full = path.join(resolved, d.name)
        try {
          return await toDirEntry(full)
        } catch {
          return null
        }
      })
  )

  return entries.filter((e): e is DirEntry => e !== null)
}

export async function statEntry(target: string): Promise<DirEntry> {
  const resolved = await pathGuard.assert(target)
  return toDirEntry(resolved)
}

export async function stampOf(target: string): Promise<FileStamp | null> {
  const resolved = await pathGuard.assert(target)
  try {
    const buffer = await fs.readFile(resolved)
    const stats = await fs.stat(resolved)
    return stampFromStats(stats, sha256(buffer))
  } catch {
    return null
  }
}

export async function stampOfResolved(resolved: string): Promise<FileStamp | null> {
  try {
    const buffer = await fs.readFile(resolved)
    const stats = await fs.stat(resolved)
    return stampFromStats(stats, sha256(buffer))
  } catch {
    return null
  }
}

export function stampsMatch(a: FileStamp, b: FileStamp): boolean {
  // Hash is authoritative; mtime alone produces false conflicts on some
  // filesystems and false negatives on others.
  return a.hash === b.hash
}
