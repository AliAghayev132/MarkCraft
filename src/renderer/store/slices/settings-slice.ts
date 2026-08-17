// ── @lib ───────────────────────────────────────────────────────────────────
import { createSlice, type PayloadAction } from '@lib/redux'

// ── @shared ────────────────────────────────────────────────────────────────
import type { DeepPartial } from '@shared'
import { DEFAULT_SETTINGS, type ResolvedTheme, type Settings } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { SettingsState } from '@store/slices/types'

const initialState: SettingsState = {
  values: DEFAULT_SETTINGS,
  loaded: false,
  systemPrefersDark:
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Application preferences.
 *
 * Changes are applied here immediately and persisted by a thunk, so a toggle
 * feels instant and a failed write only means the value is not remembered next
 * launch — never a frozen control.
 */
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /** Replaces the whole object — used after load and after a reset. */
    settingsReceived(state, action: PayloadAction<Settings>) {
      state.values = action.payload
      state.loaded = true
    },

    /** Optimistic local update, merged section by section. */
    settingsPatched(state, action: PayloadAction<DeepPartial<Settings>>) {
      state.values = mergeSettings(state.values, action.payload)
    },

    systemThemeChanged(state, action: PayloadAction<boolean>) {
      state.systemPrefersDark = action.payload
    }
  }
})

export const { settingsReceived, settingsPatched, systemThemeChanged } = settingsSlice.actions
export const settingsReducer = settingsSlice.reducer

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function mergeSettings(base: Settings, patch: DeepPartial<Settings>): Settings {
  const next = { ...base } as unknown as Record<string, unknown>

  for (const [section, values] of Object.entries(patch)) {
    if (values === undefined) continue
    if (typeof values === 'object' && values !== null && !Array.isArray(values)) {
      next[section] = { ...(next[section] as object), ...values }
    } else {
      next[section] = values
    }
  }

  return next as unknown as Settings
}

/** Resolves `system` against the OS preference. */
export function resolveTheme(settings: Settings, systemPrefersDark: boolean): ResolvedTheme {
  if (settings.appearance.theme === 'system') return systemPrefersDark ? 'dark' : 'light'
  return settings.appearance.theme
}
