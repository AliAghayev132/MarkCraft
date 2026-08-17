// ── node: ──────────────────────────────────────────────────────────────────
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import { pathKey } from '@shared'
import type { WatchEvent } from '@shared'

// ── ./services ─────────────────────────────────────────────────────────────
import { NOISY_DIRECTORIES, stampOf } from './fs-service'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

// ── chokidar ───────────────────────────────────────────────────────────────
import { type FSWatcher, watch } from 'chokidar'

type Emit = (event: WatchEvent) => void

/**
 * Two narrow watchers instead of one recursive watch over the workspace:
 *
 *  - `fileWatcher` follows exactly the documents that are open, so an external
 *    edit to a file the user is looking at is detected immediately.
 *  - `dirWatcher` follows only the folders currently expanded in the explorer,
 *    at depth 0, so the tree stays truthful without walking `node_modules`.
 *
 * Watching a whole tree recursively is what makes editors melt on large repos;
 * this keeps the descriptor count proportional to what is actually on screen.
 */
const MAX_WATCHED_PATHS = 512

class WatcherService {
  private fileWatcher: FSWatcher | null = null
  private dirWatcher: FSWatcher | null = null
  private readonly watchedFiles = new Set<string>()
  private readonly watchedDirs = new Set<string>()
  private emit: Emit = () => undefined
  private atCapacity = false

  setEmitter(emit: Emit): void {
    this.emit = emit
  }

  get capacityReached(): boolean {
    return this.atCapacity
  }

  async watchFiles(paths: string[]): Promise<void> {
    const resolved = await this.resolveAllowed(paths)
    const fresh = resolved.filter((p) => !this.watchedFiles.has(pathKey(p)))
    if (fresh.length === 0) return

    this.ensureFileWatcher()
    for (const target of fresh) {
      if (this.totalWatched() >= MAX_WATCHED_PATHS) {
        this.atCapacity = true
        logger.warn('watcher: capacity reached, further paths are unwatched')
        break
      }
      this.watchedFiles.add(pathKey(target))
      this.fileWatcher?.add(target)
    }
  }

  unwatchFiles(paths: string[]): void {
    for (const target of paths) {
      if (this.watchedFiles.delete(pathKey(target))) {
        this.fileWatcher?.unwatch(target)
      }
    }
    this.atCapacity = this.totalWatched() >= MAX_WATCHED_PATHS
  }

  async watchDirectories(paths: string[]): Promise<void> {
    const resolved = await this.resolveAllowed(paths)
    const fresh = resolved.filter((p) => !this.watchedDirs.has(pathKey(p)))
    if (fresh.length === 0) return

    this.ensureDirWatcher()
    for (const target of fresh) {
      if (this.totalWatched() >= MAX_WATCHED_PATHS) {
        this.atCapacity = true
        break
      }
      this.watchedDirs.add(pathKey(target))
      this.dirWatcher?.add(target)
    }
  }

  unwatchDirectories(paths: string[]): void {
    for (const target of paths) {
      if (this.watchedDirs.delete(pathKey(target))) {
        this.dirWatcher?.unwatch(target)
      }
    }
    this.atCapacity = this.totalWatched() >= MAX_WATCHED_PATHS
  }

  async reset(): Promise<void> {
    this.watchedFiles.clear()
    this.watchedDirs.clear()
    this.atCapacity = false
    await Promise.all([this.fileWatcher?.close(), this.dirWatcher?.close()])
    this.fileWatcher = null
    this.dirWatcher = null
  }

  async dispose(): Promise<void> {
    await this.reset()
  }

  private totalWatched(): number {
    return this.watchedFiles.size + this.watchedDirs.size
  }

  private async resolveAllowed(paths: string[]): Promise<string[]> {
    const resolved: string[] = []
    for (const target of paths) {
      try {
        resolved.push(await pathGuard.assert(target))
      } catch {
        // Silently skip: watching is best-effort and never a security boundary.
      }
    }
    return resolved
  }

  private ensureFileWatcher(): void {
    if (this.fileWatcher) return

    this.fileWatcher = watch([], {
      ignoreInitial: true,
      persistent: true,
      // Wait for the writer to finish before reporting, otherwise editors that
      // truncate-then-write produce a spurious "file emptied" event.
      awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 60 }
    })

    this.fileWatcher.on('change', (target) => {
      void this.emitFileChanged(target)
    })
    this.fileWatcher.on('unlink', (target) => {
      this.emit({ type: 'file-removed', path: target })
    })
    this.fileWatcher.on('error', (error) => logger.warn('watcher(file) error', error))
  }

  private ensureDirWatcher(): void {
    if (this.dirWatcher) return

    this.dirWatcher = watch([], {
      ignoreInitial: true,
      persistent: true,
      depth: 0,
      ignored: (target: string) => NOISY_DIRECTORIES.has(path.basename(target))
    })

    const notifyParent = (target: string): void => {
      this.emit({ type: 'dir-changed', path: path.dirname(target) })
    }

    this.dirWatcher.on('add', notifyParent)
    this.dirWatcher.on('unlink', notifyParent)
    this.dirWatcher.on('addDir', notifyParent)
    this.dirWatcher.on('unlinkDir', notifyParent)
    this.dirWatcher.on('error', (error) => logger.warn('watcher(dir) error', error))
  }

  private async emitFileChanged(target: string): Promise<void> {
    try {
      const stamp = await stampOf(target)
      if (stamp) this.emit({ type: 'file-changed', path: target, stamp })
    } catch (error) {
      logger.debug(`watcher: could not stamp ${target}`, error)
    }
  }
}

export const watcherService = new WatcherService()
