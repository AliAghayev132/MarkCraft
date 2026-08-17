// ── @shared ────────────────────────────────────────────────────────────────
import type { PendingOpen } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ../window ──────────────────────────────────────────────────────────────
import { emitToRenderer } from '../window/main-window'

/**
 * Files the operating system handed us, held until the renderer can take them.
 *
 * The timing problem this solves is real and easy to get wrong: on Windows the
 * paths are on `process.argv` before the window exists, and on macOS `open-file`
 * fires before `whenReady`. Pushing them at `did-finish-load` is still too
 * early — the page has loaded, but React has not yet subscribed, so the event
 * lands in the void and double-clicking a document opens an empty editor.
 *
 * So the renderer *pulls*: it calls `app:takePendingOpen` when its listeners are
 * in place, and that call is also what marks it ready. Anything arriving after
 * that is pushed normally, because by then there is someone listening.
 */
let rendererReady = false
const queue: PendingOpen[] = []

export function isRendererReady(): boolean {
  return rendererReady
}

export function enqueueOpen(paths: string[], reason: PendingOpen['reason']): void {
  if (paths.length === 0) return

  // Granted here rather than on delivery: a file the user double-clicked is as
  // explicit a choice as one picked in a dialog, and the grant must not depend
  // on when the renderer happens to collect it.
  for (const target of paths) pathGuard.grantFile(target)

  if (!rendererReady) {
    queue.push({ paths, reason })
    return
  }

  emitToRenderer('event:openPaths', { paths, reason })
}

/** Drains the queue and marks the renderer as listening. */
export function takePendingOpen(): PendingOpen[] {
  rendererReady = true
  return queue.splice(0)
}
