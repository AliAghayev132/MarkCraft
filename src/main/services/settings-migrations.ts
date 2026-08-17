// ── @shared ────────────────────────────────────────────────────────────────
import { DEFAULT_SETTINGS, SETTINGS_VERSION, type Settings } from '@shared'

// ── ../util ────────────────────────────────────────────────────────────────
import { deepMerge } from '../util/json-store'
import { logger } from '../util/logger'

/**
 * Settings migrations, one step per version.
 *
 * Adding a *key* needs nothing here: `JsonStore` merges the defaults on read,
 * so a new setting appears with its default and the file is left alone. This
 * exists for the other case — when a key changes shape, moves, or is replaced —
 * where a merge would silently keep a value that no longer means what it did.
 *
 * A step is `(settings) => settings` and runs when the file is *older* than its
 * index. `MIGRATIONS[1]` upgrades a version-1 file to version 2, and so on, so
 * `SETTINGS_VERSION` and the length of this array stay in step by construction
 * — which the tests assert, because the failure mode otherwise is a migration
 * that never runs.
 *
 * Steps take and return a loose record: the shape they read is by definition
 * *not* the current `Settings`, so typing them as such would be a lie.
 */
type LooseSettings = Record<string, unknown>
type MigrationStep = (settings: LooseSettings) => LooseSettings

/**
 * Index `n` migrates a file written at version `n` to version `n + 1`.
 * Index 0 covers files written before versioning existed.
 */
const MIGRATIONS: MigrationStep[] = [
  // 0 → 1: pre-versioned files. Nothing to do beyond the defaults merge; the
  // shape has not changed since, and every key it could be missing has a
  // default.
  (settings) => settings
]

export function migrateSettings(raw: unknown, fromVersion: number): Settings {
  const start = Number.isFinite(fromVersion) ? Math.max(0, fromVersion) : 0

  let working: LooseSettings =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as LooseSettings) } : {}

  for (let version = start; version < SETTINGS_VERSION; version++) {
    const step = MIGRATIONS[version]
    if (!step) continue

    try {
      working = step(working)
    } catch (error) {
      // A failed step must not cost the user every other preference, so the
      // partially migrated object carries on into the defaults merge.
      logger.error(`settings: migration ${version} → ${version + 1} failed`, error)
    }
  }

  // The defaults merge is what fills in everything a step did not have to
  // touch, and what makes adding a key a no-op here.
  return deepMerge(structuredClone(DEFAULT_SETTINGS), working)
}

/** Exposed for the test that keeps the chain and the version number honest. */
export const MIGRATION_COUNT = MIGRATIONS.length
