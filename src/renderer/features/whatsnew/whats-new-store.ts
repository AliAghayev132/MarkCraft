/**
 * Whether the release notes are on screen.
 *
 * Held outside React because the two things that open it — the launch check and
 * the button under Settings → About — sit at opposite ends of the tree, and
 * threading a callback between them would mean a prop on every component in
 * between for a dialog that appears once per release.
 */
const listeners = new Set<() => void>()
let visible = false

function emit(): void {
  for (const listener of listeners) listener()
}

export const whatsNew = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get(): boolean {
    return visible
  },
  open(): void {
    visible = true
    emit()
  },
  close(): void {
    visible = false
    emit()
  }
}
