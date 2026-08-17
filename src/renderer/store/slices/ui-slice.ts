// ── @lib ───────────────────────────────────────────────────────────────────
import { createSlice, type PayloadAction } from '@lib/redux'

// ── types ──────────────────────────────────────────────────────────────────
import type { InsertDialogId, UiState } from '@store/slices/types'

const initialState: UiState = {
  insertDialog: null,
  readerMode: false
}

/**
 * Interface state that more than one place needs to agree on.
 *
 * Deliberately small. Overlay open/closed flags that only `App` reads live in
 * `App` as component state — putting them here would be two sources of truth
 * for one boolean, which is how the earlier version of this slice ended up with
 * four fields nothing consumed. What remains is genuinely shared:
 *
 * - `insertDialog` is opened by a *command* and rendered by a layer, so the two
 *   ends never meet in a component tree.
 * - `readerMode` is set from the main-process event, read by `App` to choose a
 *   shell, and toggled from the command palette.
 *
 * Only serialisable descriptors, as everywhere else in the store: overlays that
 * carry JSX or callbacks (the context menu, the promise-based dialogs) have
 * their own imperative layer.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    insertDialogOpened(state, action: PayloadAction<Exclude<InsertDialogId, null>>) {
      state.insertDialog = action.payload
    },

    insertDialogClosed(state) {
      state.insertDialog = null
    },

    readerModeEntered(state) {
      state.readerMode = true
    },

    readerModeExited(state) {
      state.readerMode = false
    }
  }
})

export const { insertDialogOpened, insertDialogClosed, readerModeEntered, readerModeExited } =
  uiSlice.actions

export const uiReducer = uiSlice.reducer

interface WithUi {
  ui: UiState
}

export const selectInsertDialog = (state: WithUi): InsertDialogId => state.ui.insertDialog
export const selectReaderMode = (state: WithUi): boolean => state.ui.readerMode
