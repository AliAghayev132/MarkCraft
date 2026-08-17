// ── ../services ────────────────────────────────────────────────────────────
import { buildWorkspaceGraph } from '../services/links-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

export function registerLinksHandlers(): void {
  handle('links:graph', (request) => {
    requireString(request.root, 'root')
    return buildWorkspaceGraph(request.root)
  })
}
