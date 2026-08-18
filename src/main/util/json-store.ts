// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { app } from 'electron'

// ── ../security ────────────────────────────────────────────────────────────
import { atomicWriteFile } from '../security/atomic-write'

// ── ./util ─────────────────────────────────────────────────────────────────
import { logger } from './logger'

// ── types ──────────────────────────────────────────────────────────────────
import type { JsonStoreOptions } from './types'

interface Envelope<T> {
  __version: number
  data: T
}

/**
 * A tiny persistence primitive: read-through cache over an atomically written
 * JSON file, with debounced flushes and explicit versioning/migration.
 *
 * Deliberately hand-rolled rather than pulling in a dependency — it is ~100
 * lines and gives us the migration hook and flush-on-quit guarantee we need.
 */
export class JsonStore<T> {
  private readonly filePath: string
  private readonly version: number
  private readonly debounceMs: number
  private cache: T | null = null
  private timer: NodeJS.Timeout | null = null
  private writing: Promise<void> = Promise.resolve()

  constructor(private readonly options: JsonStoreOptions<T>) {
    this.filePath = path.join(app.getPath('userData'), options.file)
    this.version = options.version ?? 1
    this.debounceMs = options.debounceMs ?? 250
  }

  get path(): string {
    return this.filePath
  }

  async read(): Promise<T> {
    if (this.cache !== null) return this.cache

    try {
      const raw = await fs.readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Envelope<T> | T
      const envelope = this.asEnvelope(parsed)

      this.cache =
        envelope.__version === this.version
          ? this.merge(envelope.data)
          : this.runMigration(envelope)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code
      if (code && code !== 'ENOENT') {
        logger.warn(`json-store: unreadable ${this.options.file} (${code}), using defaults`)
        await this.quarantine().catch(() => undefined)
      }
      this.cache = structuredClone(this.options.defaults)
    }

    return this.cache
  }

  /** Applies `mutator` to the cached value and schedules a flush. */
  async update(mutator: (current: T) => T): Promise<T> {
    const current = await this.read()
    const next = mutator(current)
    this.cache = next
    this.schedule()
    return next
  }

  async set(value: T): Promise<T> {
    this.cache = value
    this.schedule()
    return value
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.cache === null) return

    const envelope: Envelope<T> = { __version: this.version, data: this.cache }
    this.writing = this.writing
      .then(() => atomicWriteFile(this.filePath, JSON.stringify(envelope, null, 2)))
      .catch((error) => {
        logger.error(`json-store: failed to write ${this.options.file}`, error)
      })

    await this.writing
  }

  async delete(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.cache = structuredClone(this.options.defaults)
    await fs.rm(this.filePath, { force: true }).catch(() => undefined)
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      void this.flush()
    }, this.debounceMs)
  }

  private asEnvelope(parsed: Envelope<T> | T): Envelope<T> {
    if (parsed && typeof parsed === 'object' && '__version' in (parsed as object)) {
      return parsed as Envelope<T>
    }
    // Pre-versioning file, or hand-edited by the user.
    return { __version: 0, data: parsed as T }
  }

  private runMigration(envelope: Envelope<T>): T {
    if (this.options.migrate) {
      try {
        return this.options.migrate(envelope.data, envelope.__version)
      } catch (error) {
        logger.error(`json-store: migration failed for ${this.options.file}`, error)
      }
    }
    return this.merge(envelope.data)
  }

  /** Shallow-per-section merge so a new setting appears without wiping the file. */
  private merge(data: T): T {
    return deepMerge(structuredClone(this.options.defaults), data, this.options.replaceWhole)
  }

  private async quarantine(): Promise<void> {
    await fs.rename(this.filePath, `${this.filePath}.corrupt`)
  }
}

/**
 * Merge a patch into a settings object, section by section.
 *
 * `replaceWhole` names the paths that are *data* rather than structure — maps
 * whose keys the user creates and deletes, like the custom colours or the
 * keyboard overrides. Merging those can only ever add a key, so without this a
 * patch could never remove one: "reset this colour" would write a patch with
 * the key absent, the merge would keep the old value, and the button would
 * appear to do nothing. Paths are dotted from the root, e.g.
 * `appearance.customColors`.
 */
export function deepMerge<T>(
  base: T,
  patch: unknown,
  replaceWhole: ReadonlySet<string> = new Set(),
  path = ''
): T {
  if (patch === null || patch === undefined) return base
  if (path !== '' && replaceWhole.has(path)) return patch as T
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return patch as T

  /*
   * The base is a section and the patch is not. That means a hand-edited or
   * corrupted file — `"appearance": "broken"` — and taking the patch would
   * hand the application a string where it expects an object, at which point
   * every read below it is `undefined`.
   *
   * The settings file is user-editable by design (Settings → Files → "Show
   * settings file"), so this is reachable, and keeping the known-good section
   * is the only outcome that leaves a working application.
   */
  if (typeof patch !== 'object' || Array.isArray(patch)) return base

  const result = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue
    const at = path === '' ? key : `${path}.${key}`
    result[key] = key in result ? deepMerge(result[key], value, replaceWhole, at) : value
  }
  return result as T
}
