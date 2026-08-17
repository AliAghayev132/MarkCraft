// ── @lib ───────────────────────────────────────────────────────────────────
import { nanoid } from '@lib/redux'

/**
 * A side table for callbacks that belong to a piece of Redux state.
 *
 * A toast's action button needs a function to run, but a function is not
 * serialisable and has no business sitting in the store — it would break time
 * travel, persistence and the serialisability check that makes Redux state
 * trustworthy in the first place.
 *
 * So the store holds a `callbackId: string` and the function lives here. The
 * pairing is created and destroyed together, so there is no way to leak one
 * without the other.
 */
const callbacks = new Map<string, () => void>()

export function registerCallback(callback: () => void): string {
  const id = nanoid()
  callbacks.set(id, callback)
  return id
}

export function runCallback(id: string | undefined): void {
  if (!id) return
  callbacks.get(id)?.()
}

export function releaseCallback(id: string | undefined): void {
  if (!id) return
  callbacks.delete(id)
}

/** Test/reset hook — the registry must not outlive a full store reset. */
export function clearCallbacks(): void {
  callbacks.clear()
}
