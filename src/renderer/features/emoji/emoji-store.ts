/**
 * Whether the emoji picker is on screen.
 *
 * Outside React because two very different places open it — a command and a
 * toolbar button that must not re-render the toolbar on every keystroke — and
 * threading a callback between them would put a prop on everything in between.
 */
const listeners = new Set<() => void>()
let visible = false

function emit(): void {
  for (const listener of listeners) listener()
}

export const emojiPicker = {
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
