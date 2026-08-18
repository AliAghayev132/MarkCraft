// ── electron ───────────────────────────────────────────────────────────────
import { shell } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import type { DeepPartial } from '@shared'
import { DEFAULT_SETTINGS, SETTINGS_VERSION, type Settings } from '@shared'

// ── ./services ─────────────────────────────────────────────────────────────
import { migrateSettings } from './settings-migrations'

// ── ../util ────────────────────────────────────────────────────────────────
import { JsonStore, deepMerge } from '../util/json-store'

/*
 * The two settings whose keys the user creates and deletes. Everything else in
 * the file is a fixed set of fields, where merging is what you want.
 */
const USER_KEYED_MAPS: ReadonlySet<string> = new Set([
  'appearance.customColors',
  'keyboard.overrides'
])

let store: JsonStore<Settings> | null = null

function getStore(): JsonStore<Settings> {
  store ??= new JsonStore<Settings>({
    file: 'settings.json',
    defaults: DEFAULT_SETTINGS,
    version: SETTINGS_VERSION,
    debounceMs: 150,
    migrate: migrateSettings,
    replaceWhole: USER_KEYED_MAPS
  })
  return store
}

export async function getSettings(): Promise<Settings> {
  return getStore().read()
}

export async function updateSettings(patch: DeepPartial<Settings>): Promise<Settings> {
  return getStore().update((current) => {
    const next = deepMerge(structuredClone(current), patch, USER_KEYED_MAPS)
    return { ...next, version: SETTINGS_VERSION }
  })
}

export async function resetSettings(section?: keyof Settings): Promise<Settings> {
  if (!section) {
    return getStore().set(structuredClone(DEFAULT_SETTINGS))
  }
  return getStore().update((current) => ({
    ...current,
    [section]: structuredClone(DEFAULT_SETTINGS[section])
  }))
}

export async function revealSettingsFile(): Promise<void> {
  await getStore().flush()
  shell.showItemInFolder(getStore().path)
}

export async function flushSettings(): Promise<void> {
  await getStore().flush()
}
