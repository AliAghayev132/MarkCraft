// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, toastDismissed, toastsCleared, toastShown } from '@store'
import { registerCallback } from '@store/callbacks'

// ── types ──────────────────────────────────────────────────────────────────
import type { ToastInput } from './types'

/**
 * Imperative notifications, usable from anywhere — command handlers, services,
 * action modules, components.
 *
 * The action callback is put in the callback registry and only its id reaches
 * the store, which keeps the Redux state serialisable without giving up the
 * ergonomics of passing a plain function at the call site.
 */
export function showToast(input: ToastInput): void {
  const { action, ...rest } = input

  dispatch(
    toastShown({
      ...rest,
      action: action ? { label: action.label, callbackId: registerCallback(action.onClick) } : undefined
    })
  )
}

export const toast = {
  success: (title: string, description?: string): void =>
    showToast({ tone: 'success', title, description }),
  info: (title: string, description?: string): void =>
    showToast({ tone: 'info', title, description }),
  warning: (title: string, description?: string): void =>
    showToast({ tone: 'warning', title, description }),
  error: (title: string, description?: string): void =>
    showToast({ tone: 'danger', title, description }),
  custom: showToast,
  dismiss: (id: string): void => {
    dispatch(toastDismissed(id))
  },
  clear: (): void => {
    dispatch(toastsCleared())
  }
}
