// ── @lib ───────────────────────────────────────────────────────────────────
import { createSlice, nanoid, type PayloadAction } from '@lib/redux'

// ── types ──────────────────────────────────────────────────────────────────
import type { Toast, ToastTone, ToastsState } from '@store/slices/types'

const initialState: ToastsState = { items: [] }

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 2600,
  info: 3200,
  warning: 5200,
  // Failures stay until acknowledged — they usually need a decision.
  danger: 0
}

const MAX_VISIBLE = 4

const toastsSlice = createSlice({
  name: 'toasts',
  initialState,
  reducers: {
    toastShown: {
      reducer(state, action: PayloadAction<Toast>) {
        const toast = action.payload
        const withoutDuplicate = toast.key
          ? state.items.filter((entry) => entry.key !== toast.key)
          : state.items

        state.items = [...withoutDuplicate, toast].slice(-MAX_VISIBLE)
      },
      prepare(input: Omit<Toast, 'id' | 'duration'> & { duration?: number }) {
        return {
          payload: {
            id: nanoid(),
            duration: input.duration ?? DEFAULT_DURATION[input.tone],
            ...input
          } satisfies Toast
        }
      }
    },

    toastDismissed(state, action: PayloadAction<string>) {
      state.items = state.items.filter((entry) => entry.id !== action.payload)
    },

    toastsCleared(state) {
      state.items = []
    }
  }
})

export const { toastShown, toastDismissed, toastsCleared } = toastsSlice.actions
export const toastsReducer = toastsSlice.reducer
