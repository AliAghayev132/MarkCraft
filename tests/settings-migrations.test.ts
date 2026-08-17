import { describe, expect, it } from 'vitest'

import { MIGRATION_COUNT, migrateSettings } from '@main/services/settings-migrations'

import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '@shared'

/**
 * Settings are the one file the application must never lose. Migration is the
 * only code path that rewrites it wholesale, and until now it existed but had
 * never been exercised — so this is the test that will catch the first real
 * shape change, whenever that comes.
 */

describe('migration chain', () => {
  it('has a step for every version gap', () => {
    // Off by one and a migration silently never runs. This is the assertion
    // that makes bumping SETTINGS_VERSION without writing the step a failure.
    expect(MIGRATION_COUNT).toBe(SETTINGS_VERSION)
  })
})

describe('migrateSettings', () => {
  it('fills in every default for an empty file', () => {
    expect(migrateSettings({}, 0)).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps values the user actually set', () => {
    const migrated = migrateSettings(
      { appearance: { theme: 'light', accent: 'rose' }, editor: { fontSize: 19 } },
      SETTINGS_VERSION
    )

    expect(migrated.appearance.theme).toBe('light')
    expect(migrated.appearance.accent).toBe('rose')
    expect(migrated.editor.fontSize).toBe(19)
  })

  it('adds a key the stored file predates, without touching its neighbours', () => {
    // The exact situation every past release created: a file written before
    // `uiScale` and `markdownOnly` existed.
    const migrated = migrateSettings({ appearance: { theme: 'dark' } }, 1)

    expect(migrated.appearance.theme).toBe('dark')
    expect(migrated.appearance.uiScale).toBe(DEFAULT_SETTINGS.appearance.uiScale)
    expect(migrated.files.markdownOnly).toBe(DEFAULT_SETTINGS.files.markdownOnly)
    expect(migrated.icons.rules).toEqual([])
  })

  it('survives a pre-versioning file', () => {
    const migrated = migrateSettings({ editor: { fontSize: 15 } }, 0)
    expect(migrated.editor.fontSize).toBe(15)
    expect(migrated.version).toBe(DEFAULT_SETTINGS.version)
  })

  it('survives a file that is not an object at all', () => {
    for (const junk of [null, undefined, 'nonsense', 42, []]) {
      expect(migrateSettings(junk, 0)).toEqual(DEFAULT_SETTINGS)
    }
  })

  it('survives a section that is the wrong type', () => {
    const migrated = migrateSettings({ appearance: 'broken', editor: { fontSize: 21 } }, 1)
    expect(migrated.editor.fontSize).toBe(21)
    expect(migrated.appearance).toEqual(DEFAULT_SETTINGS.appearance)
  })

  it('does not mutate the defaults', () => {
    const before = structuredClone(DEFAULT_SETTINGS)
    migrateSettings({ appearance: { accent: 'teal' } }, 1)
    expect(DEFAULT_SETTINGS).toEqual(before)
  })

  it('treats a version from the future as up to date', () => {
    // A file written by a newer build, opened by an older one. Running no step
    // and merging defaults is the only safe thing left.
    const migrated = migrateSettings({ editor: { fontSize: 17 } }, SETTINGS_VERSION + 5)
    expect(migrated.editor.fontSize).toBe(17)
  })
})
