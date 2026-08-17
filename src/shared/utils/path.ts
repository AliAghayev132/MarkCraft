// ── @shared ────────────────────────────────────────────────────────────────
import type { NameValidation } from './types'

/**
 * Minimal, dependency-free path helpers that work identically in the renderer
 * (where `node:path` is deliberately unavailable) and in main. They handle both
 * separators because Windows paths routinely mix them.
 */
const SEP_RE = /[\\/]/

export function isWindowsPath(p: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('\\\\')
}

export function normalizeSeparators(p: string): string {
  return isWindowsPath(p) ? p.replace(/\//g, '\\') : p.replace(/\\/g, '/')
}

export function separatorFor(p: string): string {
  return isWindowsPath(p) ? '\\' : '/'
}

export function basename(p: string): string {
  if (!p) return ''
  const trimmed = p.replace(/[\\/]+$/, '')
  const parts = trimmed.split(SEP_RE)
  return parts[parts.length - 1] ?? ''
}

export function dirname(p: string): string {
  if (!p) return ''
  const trimmed = p.replace(/[\\/]+$/, '')
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  if (idx < 0) return ''
  if (idx === 0) return trimmed.slice(0, 1)
  // Preserve the drive root, e.g. "C:\" rather than "C:".
  if (isWindowsPath(trimmed) && idx === 2) return trimmed.slice(0, 3)
  return trimmed.slice(0, idx)
}

export function extname(p: string): string {
  const name = basename(p)
  const idx = name.lastIndexOf('.')
  if (idx <= 0) return ''
  return name.slice(idx).toLowerCase()
}

/** Extension without the leading dot, lowercased. */
export function ext(p: string): string {
  return extname(p).replace(/^\./, '')
}

export function stem(p: string): string {
  const name = basename(p)
  const idx = name.lastIndexOf('.')
  return idx <= 0 ? name : name.slice(0, idx)
}

export function joinPath(...parts: string[]): string {
  const cleaned = parts.filter(Boolean)
  if (cleaned.length === 0) return ''
  const sep = separatorFor(cleaned[0] as string)
  return cleaned
    .map((part, i) => (i === 0 ? part.replace(/[\\/]+$/, '') : part.replace(/^[\\/]+|[\\/]+$/g, '')))
    .filter((part, i) => i === 0 || part.length > 0)
    .join(sep)
}

/** Case-insensitive comparison on Windows, exact elsewhere. */
export function pathKey(p: string): string {
  const normalized = normalizeSeparators(p).replace(/[\\/]+$/, '')
  return isWindowsPath(p) ? normalized.toLowerCase() : normalized
}

export function pathsEqual(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b
  return pathKey(a) === pathKey(b)
}

export function isDescendantPath(parent: string, child: string): boolean {
  const p = pathKey(parent)
  const c = pathKey(child)
  if (p === c) return true
  const sep = separatorFor(parent) === '\\' ? '\\' : '/'
  return c.startsWith(p.endsWith(sep) ? p : p + sep)
}

export function splitPath(p: string): string[] {
  return normalizeSeparators(p).split(SEP_RE).filter(Boolean)
}

/** Presentation helper: `C:\Users\me\Docs` -> `~\Docs` when under `home`. */
export function tildify(p: string, home: string | null): string {
  if (!home) return p
  if (!isDescendantPath(home, p)) return p
  const sep = separatorFor(p)
  const rest = p.slice(home.length).replace(/^[\\/]+/, '')
  return rest ? `~${sep}${rest}` : '~'
}

/**
 * Relative path from `fromDir` to `toPath`, always emitted with forward
 * slashes because the result is destined for Markdown link syntax.
 */
export function relativeFrom(fromDir: string, toPath: string): string {
  const from = splitPath(fromDir)
  const to = splitPath(toPath)
  const ci = isWindowsPath(fromDir)
  const eq = (a: string, b: string): boolean => (ci ? a.toLowerCase() === b.toLowerCase() : a === b)

  let i = 0
  while (i < from.length && i < to.length && eq(from[i] as string, to[i] as string)) i++

  // No shared root at all (different drives) — a relative path is meaningless.
  if (i === 0 && ci) return normalizeSeparators(toPath).replace(/\\/g, '/')

  const up = from.slice(i).map(() => '..')
  const down = to.slice(i)
  const joined = [...up, ...down].join('/')
  if (!joined) return '.'
  return up.length === 0 ? `./${joined}` : joined
}

export function ensureExtension(name: string, extension: string): string {
  const dotted = extension.startsWith('.') ? extension : `.${extension}`
  return name.toLowerCase().endsWith(dotted.toLowerCase()) ? name : `${name}${dotted}`
}

// Control characters are genuinely illegal in filenames on every platform,
// so matching them here is the point rather than an oversight.
// eslint-disable-next-line no-control-regex
const INVALID_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/
const RESERVED_WINDOWS_NAMES =
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i

/**
 * Shared by every rename/create modal so the rules are stated in one place.
 *
 * Surrounding whitespace is trimmed rather than rejected — every caller saves
 * the trimmed value, so complaining about a stray space the user cannot see
 * would be pedantic. A trailing period is different: it is invisible on
 * Windows *and* silently changes the filename, so it is refused.
 */
export function validateFileName(name: string): NameValidation {
  const trimmed = name.trim()
  if (!trimmed) return { valid: false, reason: 'Name cannot be empty.' }
  if (trimmed === '.' || trimmed === '..') return { valid: false, reason: 'Reserved name.' }
  if (INVALID_NAME_CHARS.test(trimmed))
    return { valid: false, reason: 'Cannot contain \\ / : * ? " < > |' }
  if (RESERVED_WINDOWS_NAMES.test(trimmed))
    return { valid: false, reason: `"${trimmed}" is reserved by Windows.` }
  if (trimmed.endsWith('.')) return { valid: false, reason: 'Cannot end with a period.' }
  if (trimmed.length > 255) return { valid: false, reason: 'Name is too long.' }
  return { valid: true }
}
