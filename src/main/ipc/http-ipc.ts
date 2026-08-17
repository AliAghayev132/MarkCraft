// ── ../services ────────────────────────────────────────────────────────────
import { sendRequest } from '../services/http-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/**
 * The HTTP tester.
 *
 * No path guard applies — nothing here touches the filesystem — but the URL is
 * checked in the service before a socket is opened, and again at every redirect.
 */
export function registerHttpHandlers(): void {
  handle('http:send', (request) => {
    requireString(request.url, 'url')
    return sendRequest(request)
  })
}
