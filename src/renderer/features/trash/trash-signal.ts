/**
 * A nudge for anything showing the deleted list.
 *
 * The panel loads on mount, which covers switching to it — but not the case
 * where it is *already* open and a delete happens in the tree behind it, where
 * a stale list is exactly the thing a user would call broken. Deletes are rare
 * and the payload is nothing, so a bare notification is the whole mechanism.
 */
const listeners = new Set<() => void>()
let revision = 0

export const trashSignal = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get(): number {
    return revision
  },
  bump(): void {
    revision += 1
    for (const listener of listeners) listener()
  }
}
