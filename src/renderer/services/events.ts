// ── @shared ────────────────────────────────────────────────────────────────
import type { IpcEventName, IpcEvents } from '@shared'

/**
 * Thin re-export of the preload event bridge so that no feature module imports
 * `window.api` directly. Returns an unsubscribe function suitable for a
 * `useEffect` cleanup.
 */
export function onMainEvent<E extends IpcEventName>(
  event: E,
  listener: (payload: IpcEvents[E]) => void
): () => void {
  return window.api.events.on(event, listener)
}
