/**
 * The parsing an HTTP tester needs, kept away from the socket.
 *
 * MarkCraft makes no network requests of its own. This is the second feature
 * that reaches the network at all — the first being the AI assistant — and like
 * that one it only ever fires because the user pressed a button. Nothing here
 * runs on its own, on a timer, or on startup.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export interface HttpRequest {
  method: HttpMethod
  url: string
  headers: Record<string, string>
  body?: string
}

export interface HttpResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  /** Milliseconds from send to the body being read. */
  durationMs: number
  bytes: number
  /** True when the body was cut short at the ceiling. */
  truncated: boolean
}

/**
 * Reads headers typed one per line as `Name: value`.
 *
 * Blank lines and `#` comments are skipped so a set of headers can be kept in
 * the box with one of them commented out — which is what anyone testing an API
 * actually does with an authorisation header.
 */
export function parseHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {}

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue

    const colon = trimmed.indexOf(':')
    if (colon <= 0) continue

    const name = trimmed.slice(0, colon).trim()
    const value = trimmed.slice(colon + 1).trim()
    if (name !== '') headers[name] = value
  }

  return headers
}

/** Back to text, for showing a response's headers. */
export function formatHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n')
}

/**
 * Whether an address may be requested.
 *
 * Only HTTP and HTTPS. Anything else — `file:`, `data:`, a Windows UNC path —
 * would turn a request box into a way to read the machine, and a tester that
 * can read the machine is not a tester.
 */
export function isRequestableUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** A body worth pretty-printing gets pretty-printed; anything else is left. */
export function prettyBody(body: string, contentType: string): string {
  if (!/\bjson\b/i.test(contentType)) return body

  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    // Content-Type said JSON and it is not. Showing the raw text is more
    // useful than an error, because the raw text is the bug.
    return body
  }
}

/** `200 OK` is green, `404` amber, `500` red — the shape every client uses. */
export function statusTone(status: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status >= 200 && status < 300) return 'success'
  if (status >= 300 && status < 400) return 'neutral'
  if (status >= 400 && status < 500) return 'warning'
  if (status >= 500) return 'danger'
  return 'neutral'
}
