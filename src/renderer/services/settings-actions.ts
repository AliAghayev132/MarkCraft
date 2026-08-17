// ── @shared ────────────────────────────────────────────────────────────────
import type { DeepPartial, ResolvedTheme, Settings } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { settingsService } from './app-services'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, getState, resolveTheme, settingsPatched, settingsReceived } from '@store'

/**
 * Settings orchestration.
 *
 * A change is applied to the store immediately and persisted in the main
 * process afterwards, so a toggle feels instant. If the write fails the value
 * is simply not remembered next launch — never a control that refuses to move.
 */

/** Returns what it loaded, so a caller can act on the stored state at once. */
export async function loadSettings(): Promise<Settings> {
  const settings = await settingsService.get()
  dispatch(settingsReceived(settings))
  return settings
}

export async function updateSettings(patch: DeepPartial<Settings>): Promise<void> {
  dispatch(settingsPatched(patch))
  const persisted = await settingsService.update(patch)
  dispatch(settingsReceived(persisted))
}

export async function resetSettings(section?: keyof Settings): Promise<void> {
  const persisted = await settingsService.reset(section)
  dispatch(settingsReceived(persisted))
}

/** Non-reactive read, for code outside React — commands, services, actions. */
export function getSettings(): Settings {
  return getState().settings.values
}

/** The theme actually in effect, with `system` already resolved. */
export function currentTheme(): ResolvedTheme {
  const state = getState().settings
  return resolveTheme(state.values, state.systemPrefersDark)
}
