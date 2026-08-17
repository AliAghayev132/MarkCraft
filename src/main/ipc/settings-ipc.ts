// ── ../services ────────────────────────────────────────────────────────────
import { getSettings, resetSettings, updateSettings } from '../services/settings-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle } from './register'

export function registerSettingsHandlers(): void {
  handle('settings:get', () => getSettings())
  handle('settings:update', ({ patch }) => updateSettings(patch ?? {}))
  handle('settings:reset', ({ section }) => resetSettings(section))
}
