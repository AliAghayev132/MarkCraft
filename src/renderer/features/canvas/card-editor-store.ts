// ── @lib ───────────────────────────────────────────────────────────────────
import type { RichEditorInstance } from '@lib/editor/tiptap'

/**
 * The editor inside the card being written in, if there is one.
 *
 * The formatting bar is docked to the canvas surface — it has to be, or on a
 * card near the top of the window it sits under the header — and the editor it
 * formats is several components away inside the card. The same shape the
 * document editor already uses for the same problem: the surface that owns the
 * text publishes it, and whatever needs to act on it reads it here.
 */
const listeners = new Set<() => void>()
let instance: RichEditorInstance | null = null

/** Bumped on every transaction, so a toolbar re-reads which marks are on. */
let revision = 0

function emit(): void {
  for (const listener of listeners) listener()
}

export const cardEditor = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  /**
   * A number rather than the instance itself: the instance is mutable and never
   * changes identity while it lives, so returning it would tell React nothing
   * had happened when the selection moved.
   */
  version(): number {
    return revision
  },
  get(): RichEditorInstance | null {
    return instance
  },
  set(next: RichEditorInstance | null): void {
    instance = next
    revision++
    emit()
  },
  /** Called on every transaction; the bar reads the marks again. */
  touch(): void {
    revision++
    emit()
  }
}
