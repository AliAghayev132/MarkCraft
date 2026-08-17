// ── @lib ───────────────────────────────────────────────────────────────────
import { createSlice, type PayloadAction } from '@lib/redux'

// ── types ──────────────────────────────────────────────────────────────────
import type { I18nState } from '@store/slices/types'

const initialState: I18nState = {
  preference: 'system',
  language: 'en',
  direction: 'ltr',
  available: []
}

/**
 * The active language.
 *
 * Only the *identity* of the language lives in Redux. The message trees and the
 * `t` function are held by the i18n module: they are large, static and
 * non-serialisable, and putting them in the store would mean every keystroke
 * anywhere walked past a few thousand translation strings.
 */
const i18nSlice = createSlice({
  name: 'i18n',
  initialState,
  reducers: {
    languageResolved(
      state,
      action: PayloadAction<{ preference: string; language: string; direction: 'ltr' | 'rtl' }>
    ) {
      state.preference = action.payload.preference
      state.language = action.payload.language
      state.direction = action.payload.direction
    },

    localesRegistered(state, action: PayloadAction<I18nState['available']>) {
      state.available = action.payload
    }
  }
})

export const { languageResolved, localesRegistered } = i18nSlice.actions
export const i18nReducer = i18nSlice.reducer

interface WithI18n {
  i18n: I18nState
}

export const selectLanguage = (state: WithI18n): string => state.i18n.language
export const selectLanguagePreference = (state: WithI18n): string => state.i18n.preference
export const selectAvailableLocales = (state: WithI18n): I18nState['available'] =>
  state.i18n.available
