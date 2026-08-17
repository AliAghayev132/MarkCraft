// ── @lib ───────────────────────────────────────────────────────────────────
import { configureStore } from '@lib/redux'

// ── @store ─────────────────────────────────────────────────────────────────
import { documentsReducer } from '@store/slices/documents-slice'
import { i18nReducer } from '@store/slices/i18n-slice'
import { settingsReducer } from '@store/slices/settings-slice'
import { toastsReducer } from '@store/slices/toasts-slice'
import { uiReducer } from '@store/slices/ui-slice'
import { workspaceReducer } from '@store/slices/workspace-slice'

/**
 * The application store.
 *
 * State is split by domain, and every slice holds only serialisable data:
 * callbacks live in `store/callbacks.ts` keyed by id, translation trees live in
 * the i18n module, and editor instances stay in the editor registry. That is
 * what keeps the store inspectable and its integrity checks meaningful.
 */
export const store = configureStore({
  reducer: {
    settings: settingsReducer,
    documents: documentsReducer,
    workspace: workspaceReducer,
    toasts: toastsReducer,
    ui: uiReducer,
    i18n: i18nReducer
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      /*
       * A large document is a single string, and the explorer holds one entry
       * per visible file. Both are cheap to store but expensive to deep-freeze
       * and deep-scan on every dispatch, so the development-only checks are
       * given a budget rather than being switched off outright — they still
       * catch a genuine mistake, without adding a stall to every keystroke.
       */
      immutableCheck: { warnAfter: 128 },
      serializableCheck: { warnAfter: 128 }
    }),

  devTools: import.meta.env.DEV
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

/** Non-reactive access for code outside React — commands, services, actions. */
export const getState = (): RootState => store.getState()
export const dispatch: AppDispatch = store.dispatch

/*
 * The slices, the selectors and the hooks are one graph — a caller needing an
 * action almost always needs a selector and `useAppSelector` too, and making
 * them ask for three different paths bought nothing.
 */
export * from './slices/documents-slice'
export * from './slices/settings-slice'
export * from './slices/workspace-slice'
export * from './slices/ui-slice'
export * from './slices/toasts-slice'
export * from './slices/i18n-slice'
export * from './selectors'
export * from './hooks'
