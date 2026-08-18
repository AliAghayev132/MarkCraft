/**
 * Util contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

export interface JsonStoreOptions<T> {
  /**
   * Paths, dotted from the root, whose value is a user-keyed map rather than a
   * fixed set of fields. These are taken from the patch wholesale so a key can
   * actually be removed — see `deepMerge`.
   */
  replaceWhole?: ReadonlySet<string>
  /** File name relative to the app's userData directory. */
  file: string
  defaults: T
  /** Bumped whenever the on-disk shape changes; drives `migrate`. */
  version?: number
  migrate?: (raw: unknown, fromVersion: number) => T
  /** Milliseconds of idle before the in-memory value is flushed. */
  debounceMs?: number
}
