// ── @shared ────────────────────────────────────────────────────────────────
import { isRequestableUrl, type HttpRequest, type HttpResponse } from '@shared'

/**
 * The one place, besides the AI assistant, where MarkCraft touches the network.
 *
 * Every guard here exists because a request box is a powerful thing to hand a
 * program: it can be pointed anywhere, and whatever it fetches is shown back to
 * the user as if the application had produced it.
 *
 * The rules, in the order they matter:
 *
 *   1. HTTP and HTTPS only. `file:` would make this a file reader.
 *   2. No credentials, ever — no cookies, no auth carried from anywhere else.
 *      A header the user typed is the only credential that travels.
 *   3. A timeout, so a request to a host that accepts and never answers cannot
 *      hold a handle open for the life of the application.
 *   4. A size ceiling, so pointing it at a large file cannot exhaust memory.
 *   5. Redirects are followed but capped, and re-checked at each hop — a
 *      redirect to `file:` is exactly how rule 1 gets bypassed.
 */
const TIMEOUT_MS = 30_000
const MAX_BYTES = 5 * 1024 * 1024
const MAX_REDIRECTS = 5

export async function sendRequest(request: HttpRequest): Promise<HttpResponse> {
  const url = request.url.trim()

  if (!isRequestableUrl(url)) {
    throw Object.assign(new Error('Only http:// and https:// addresses can be requested.'), {
      code: 'INVALID_ARGUMENT'
    })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const started = Date.now()

  try {
    const response = await fetchFollowing(url, request, controller.signal)

    const headers: Record<string, string> = {}
    response.headers.forEach((value, name) => {
      headers[name] = value
    })

    // Read as bytes so the ceiling is a real byte count, not a character count
    // that a multi-byte response would blow straight through.
    const buffer = await response.arrayBuffer()
    const truncated = buffer.byteLength > MAX_BYTES
    const body = new TextDecoder('utf-8').decode(buffer.slice(0, MAX_BYTES))

    return {
      status: response.status,
      statusText: response.statusText,
      headers,
      body,
      durationMs: Date.now() - started,
      bytes: buffer.byteLength,
      truncated
    }
  } catch (error) {
    if (controller.signal.aborted) {
      throw Object.assign(new Error(`No answer within ${TIMEOUT_MS / 1000} seconds.`), {
        code: 'TIMEOUT'
      })
    }
    throw withCause(error)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Follows redirects by hand so each hop can be checked against rule 1.
 *
 * `redirect: 'follow'` would hand that decision to the runtime, which has no
 * opinion about which schemes this application is willing to visit.
 */
async function fetchFollowing(
  url: string,
  request: HttpRequest,
  signal: AbortSignal
): Promise<Response> {
  let target = url

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(target, {
      method: request.method,
      headers: request.headers,
      // HEAD and GET carry no body; sending one is a protocol error.
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
      // No cookie jar, no cached credentials — only what the user typed.
      credentials: 'omit',
      signal
    })

    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) return response

    const next = new URL(location, target).toString()
    if (!isRequestableUrl(next)) {
      throw Object.assign(new Error(`Refused to follow a redirect to ${next}`), {
        code: 'INVALID_ARGUMENT'
      })
    }

    target = next
  }

  throw Object.assign(new Error(`More than ${MAX_REDIRECTS} redirects.`), { code: 'INVALID_ARGUMENT' })
}

/**
 * The reason behind a failed `fetch`.
 *
 * Node's fetch reports every network failure as the single word "fetch failed"
 * and puts what actually happened — the host that did not resolve, the refused
 * connection, the certificate — in `cause`. Shown as-is, the user is told their
 * request failed and nothing else; the one thing they need in order to fix a
 * typed-in URL is the part that was being hidden.
 */
export function withCause(error: unknown): unknown {
  if (!(error instanceof Error) || error.message !== 'fetch failed') return error

  const cause = error.cause
  if (!(cause instanceof Error)) return error

  const detail = 'code' in cause && typeof cause.code === 'string' ? cause.code : null
  const message = detail === null ? cause.message : `${cause.message} (${detail})`

  return Object.assign(new Error(message), { code: 'NETWORK', cause })
}
