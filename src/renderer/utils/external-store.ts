// ── @lib ───────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from '@lib/react'

// ── types ──────────────────────────────────────────────────────────────────
import type { ExternalStore } from '@utils/types'

/**
 * A minimal store for transient overlay state.
 *
 * Application state lives in Redux. These do not: the context menu and the
 * promise-based dialogs carry React elements and callbacks, which are not
 * serialisable and would defeat the guarantees that make a Redux store worth
 * having. They are also genuinely ephemeral — nothing outside the overlay ever
 * needs to read them.
 *
 * They still need to be settable from outside React (`dialogs.confirm()` is
 * awaited by command handlers and services), which is what rules out plain
 * component state and makes an external store the right shape.
 */
export function createExternalStore<T>(initial: T): ExternalStore<T> {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    get: () => state,
    set(next) {
      if (Object.is(next, state)) return
      state = next
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

/** Subscribes a component to an external store. */
export function useExternalStore<T>(store: ExternalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
