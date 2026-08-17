/**
 * Redux Toolkit.
 *
 * Only the bindings the application uses are re-exported, which keeps the state
 * layer's dependency surface explicit and swappable in one place — the same
 * contract every other module in `@lib` follows.
 */

// ── Store and slices ───────────────────────────────────────────────────────
export { configureStore, createSelector, createSlice, nanoid } from '@reduxjs/toolkit'
export type { PayloadAction, Middleware, Reducer, ThunkAction, UnknownAction } from '@reduxjs/toolkit'

// ── React bindings ─────────────────────────────────────────────────────────
export { Provider, useDispatch, useSelector, useStore } from 'react-redux'
export type { TypedUseSelectorHook } from 'react-redux'
