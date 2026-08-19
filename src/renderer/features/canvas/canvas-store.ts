/**
 * Which canvas is on screen, if any.
 *
 * Outside React because the two places that open one have nothing else to say
 * to each other: the sidebar's own button, and clicking a `.canvas` row in the
 * file tree — which happens inside `openPath`, far from any component that
 * could hold this in state.
 *
 * The value is the file's path rather than a boolean, because a canvas is a
 * document like any other. Holding a flag here was what limited the whole
 * feature to one canvas per workspace.
 */
const listeners = new Set<() => void>()
let target: string | null = null

function emit(): void {
  for (const listener of listeners) listener()
}

export const canvasTarget = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  get(): string | null {
    return target
  },
  open(path: string): void {
    target = path
    emit()
  },
  close(): void {
    target = null
    emit()
  }
}
