/**
 * The small conversions a writer of technical documents keeps a second tab
 * open for: pretty-printing a JSON payload before pasting it into a fence,
 * decoding a token to check a claim, escaping a URL.
 *
 * Pure and shared rather than wired into the panel, so each one is testable on
 * its own and none of them can only be reached through the UI.
 *
 * Failures carry a *reason*, not a sentence. The panel translates it, so an
 * Azerbaijani user is not shown an English parser message — the detail from the
 * underlying parser is passed along separately for the cases where the position
 * of the problem is the useful part.
 */
export type ToolFailure =
  | 'json'
  | 'yaml'
  | 'base64'
  | 'url'
  | 'jwt'
  | 'timestamp'
  | 'regex'

export type ToolOutcome =
  | { ok: true; value: string }
  | { ok: false; reason: ToolFailure; detail?: string }

function failed(reason: ToolFailure, error: unknown): ToolOutcome {
  return { ok: false, reason, detail: error instanceof Error ? error.message : undefined }
}

/* ── JSON ─────────────────────────────────────────────────────────────────── */

export function formatJson(text: string, indent = 2): ToolOutcome {
  try {
    return { ok: true, value: JSON.stringify(JSON.parse(text), null, indent) }
  } catch (error) {
    return failed('json', error)
  }
}

export function minifyJson(text: string): ToolOutcome {
  try {
    return { ok: true, value: JSON.stringify(JSON.parse(text)) }
  } catch (error) {
    return failed('json', error)
  }
}

/* ── Base64 ───────────────────────────────────────────────────────────────── */

/*
 * `btoa` is defined over bytes, not characters, and throws on anything above
 * U+00FF — which is most of an Azerbaijani or Russian sentence. Encoding to
 * UTF-8 first is what makes this usable in a localised editor at all.
 */
function bytesToBinary(bytes: Uint8Array): string {
  let binary = ''
  // Chunked: spreading a large array into `fromCharCode` overflows the stack.
  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000))
  }
  return binary
}

export function encodeBase64(text: string): ToolOutcome {
  try {
    return { ok: true, value: btoa(bytesToBinary(new TextEncoder().encode(text))) }
  } catch (error) {
    return failed('base64', error)
  }
}

export function decodeBase64(text: string): ToolOutcome {
  try {
    // Accept the URL-safe alphabet and missing padding; both are common in the
    // tokens and query strings this gets pasted from.
    const normalised = text.trim().replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalised.padEnd(Math.ceil(normalised.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

    return { ok: true, value: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch (error) {
    return failed('base64', error)
  }
}

/* ── URLs ─────────────────────────────────────────────────────────────────── */

export function encodeUrl(text: string): ToolOutcome {
  try {
    return { ok: true, value: encodeURIComponent(text) }
  } catch (error) {
    return failed('url', error)
  }
}

export function decodeUrl(text: string): ToolOutcome {
  try {
    return { ok: true, value: decodeURIComponent(text) }
  } catch (error) {
    return failed('url', error)
  }
}

/* ── JWT ──────────────────────────────────────────────────────────────────── */

/**
 * Decodes the two readable segments of a token.
 *
 * The signature is shown but deliberately not checked: verifying it needs the
 * secret, and a panel that displayed "valid" without one would be lying about
 * the only thing the word means.
 */
export function decodeJwt(token: string): ToolOutcome {
  const parts = token.trim().split('.')
  if (parts.length !== 3) return { ok: false, reason: 'jwt' }

  const segments: string[] = []
  for (const [index, name] of ['header', 'payload'].entries()) {
    const decoded = decodeBase64(parts[index])
    if (!decoded.ok) return { ok: false, reason: 'jwt' }

    const pretty = formatJson(decoded.value)
    if (!pretty.ok) return { ok: false, reason: 'jwt' }

    segments.push(`// ${name}\n${pretty.value}`)
  }

  return { ok: true, value: segments.join('\n\n') }
}

/* ── Timestamps ───────────────────────────────────────────────────────────── */

/**
 * Reads a Unix timestamp or an ISO date and shows the other forms.
 *
 * Seconds and milliseconds are told apart by magnitude: ten digits has been
 * seconds and thirteen milliseconds for decades either side of now, and asking
 * the user which one they pasted would defeat the point of the tool.
 */
export function convertTimestamp(input: string): ToolOutcome {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, reason: 'timestamp' }

  let date: Date
  if (/^-?\d+$/.test(trimmed)) {
    const number = Number(trimmed)
    date = new Date(Math.abs(number) < 1e11 ? number * 1000 : number)
  } else {
    date = new Date(trimmed)
  }

  if (Number.isNaN(date.getTime())) return { ok: false, reason: 'timestamp' }

  return {
    ok: true,
    value: [
      `ISO 8601   ${date.toISOString()}`,
      `Unix (s)   ${Math.floor(date.getTime() / 1000)}`,
      `Unix (ms)  ${date.getTime()}`,
      `Local      ${date.toString()}`
    ].join('\n')
  }
}

/* ── Regular expressions ──────────────────────────────────────────────────── */

export interface RegexMatch {
  /** Character offset in the subject, so a match can be located. */
  index: number
  text: string
  groups: string[]
}

export interface RegexOutcome {
  ok: boolean
  matches: RegexMatch[]
  detail?: string
}

/**
 * Runs a pattern against a subject and reports every match.
 *
 * `g` is forced on, because a tester that stopped at the first match would
 * answer a different question than the one being asked. A zero-length match is
 * stepped past by hand — `exec` would otherwise spin on it forever.
 */
export function testRegex(pattern: string, flags: string, subject: string): RegexOutcome {
  let expression: RegExp
  try {
    expression = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`)
  } catch (error) {
    return { ok: false, matches: [], detail: error instanceof Error ? error.message : undefined }
  }

  const matches: RegexMatch[] = []
  const LIMIT = 500

  for (let found = expression.exec(subject); found; found = expression.exec(subject)) {
    matches.push({ index: found.index, text: found[0], groups: found.slice(1).map(String) })

    if (found[0] === '') expression.lastIndex++
    if (matches.length >= LIMIT) break
  }

  return { ok: true, matches }
}

/* ── Identifiers ──────────────────────────────────────────────────────────── */

/** A v4 UUID from the platform's CSPRNG — never `Math.random`. */
export function uuid(): string {
  return crypto.randomUUID()
}
