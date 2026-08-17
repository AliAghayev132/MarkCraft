// ── @lib ───────────────────────────────────────────────────────────────────
import { useDispatch, useSelector, useStore, type TypedUseSelectorHook } from '@lib/redux'

// ── @store ─────────────────────────────────────────────────────────────────
import type { AppDispatch, RootState } from '@store'

/**
 * Typed Redux hooks.
 *
 * Components use these rather than the untyped originals so that a selector's
 * argument and a dispatched action are both checked against the real store
 * shape — the whole reason to reach for Redux Toolkit over a hand-rolled store.
 */
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
export const useAppStore: () => { getState: () => RootState } = useStore
