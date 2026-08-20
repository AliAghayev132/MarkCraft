// ── ../services ────────────────────────────────────────────────────────────
import { buildWorkspaceGraph, collectWorkspaceTags } from '../services/links-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

export function registerLinksHandlers(): void {
  handle('links:tags', ({ root }) => collectWorkspaceTags(requireString(root, 'root')))

  handle('links:graph', (request) => {
    requireString(request.root, 'root')
    return buildWorkspaceGraph(request.root)
  })
}
