// ── ../services ────────────────────────────────────────────────────────────
import { cancelSearch, replaceInWorkspace, searchWorkspace } from '../services/search-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

export function registerSearchHandlers(): void {
  handle('search:workspace', (request) => {
    requireString(request.root, 'root')
    return searchWorkspace({
      ...request,
      maxFileMatches: clamp(request.maxFileMatches, 1, 500, 50),
      maxTotalMatches: clamp(request.maxTotalMatches, 1, 20000, 2000)
    })
  })

  handle('search:replace', (request) => {
    requireString(request.root, 'root')
    requireString(request.query, 'query')
    return replaceInWorkspace(request)
  })

  handle('search:cancel', () => {
    cancelSearch()
  })
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}
