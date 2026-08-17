// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs, type Dirent, type Stats } from 'node:fs'
import path from 'node:path'

// ── @shared ────────────────────────────────────────────────────────────────
import type {
  SearchFileResult,
  SearchMatch,
  WorkspaceReplaceRequest,
  WorkspaceReplaceResponse,
  WorkspaceSearchRequest,
  WorkspaceSearchResponse
} from '@shared'

// ── ./services ─────────────────────────────────────────────────────────────
import { NOISY_DIRECTORIES, readTextFile, writeTextFile } from './fs-service'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

const SEARCHABLE_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.mdown',
  '.mkd',
  '.mdx',
  '.txt',
  '.json',
  '.yml',
  '.yaml',
  '.csv'
])

/** Files above this size are skipped — they are not prose. */
const MAX_SEARCHABLE_BYTES = 4 * 1024 * 1024
const PREVIEW_RADIUS = 120

let cancelToken = { cancelled: false }

export function cancelSearch(): void {
  cancelToken.cancelled = true
}

const REGEX_SPECIALS = new Set(['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'])

/**
 * Single-pass glob to regex-source conversion. Handles `*` (within a segment),
 * `**` (across segments), `**` followed by a slash, and `?`.
 */
function globToRegExpSource(pattern: string): string {
  let out = ''

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i] as string

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') {
          // Spans zero or more directory segments.
          out += '(?:[^/]*\\/)*'
          i += 2
        } else {
          out += '.*'
          i += 1
        }
      } else {
        // A single star never crosses a directory boundary.
        out += '[^/]*'
      }
      continue
    }

    if (char === '?') {
      out += '[^/]'
      continue
    }

    out += REGEX_SPECIALS.has(char) ? `\\${char}` : char
  }

  return out
}

/**
 * Translates a comma-separated glob list into a matcher. Covers what the search
 * panel realistically needs without taking on a glob dependency.
 */
function globMatcher(patterns: string): ((relativePath: string) => boolean) | null {
  const list = patterns
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (list.length === 0) return null

  const regexes = list.map((pattern) => {
    const normalized = pattern.replace(/\\/g, '/')
    const source = globToRegExpSource(normalized)
    // A bare pattern such as "*.md" should match at any depth.
    const anchored = normalized.includes('/') ? `^${source}$` : `^(?:.*/)?${source}$`
    return new RegExp(anchored, 'i')
  })

  return (relativePath: string) => regexes.some((re) => re.test(relativePath.replace(/\\/g, '/')))
}

export function buildQueryRegex(
  query: string,
  options: { caseSensitive: boolean; wholeWord: boolean; regex: boolean }
): RegExp {
  const source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const wrapped = options.wholeWord ? `\\b(?:${source})\\b` : source
  return new RegExp(wrapped, options.caseSensitive ? 'gu' : 'giu')
}

function matchesInText(text: string, regex: RegExp, limit: number): SearchMatch[] {
  const matches: SearchMatch[] = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length && matches.length < limit; i++) {
    const line = lines[i] as string
    regex.lastIndex = 0

    let hit: RegExpExecArray | null
    while ((hit = regex.exec(line)) !== null && matches.length < limit) {
      // A zero-length match (e.g. the regex `a*`) would loop forever.
      if (hit[0].length === 0) {
        regex.lastIndex++
        continue
      }

      const start = Math.max(0, hit.index - PREVIEW_RADIUS)
      const end = Math.min(line.length, hit.index + hit[0].length + PREVIEW_RADIUS)
      const preview =
        (start > 0 ? '…' : '') + line.slice(start, end) + (end < line.length ? '…' : '')

      matches.push({
        line: i + 1,
        column: hit.index,
        length: hit[0].length,
        preview,
        previewOffset: hit.index - start + (start > 0 ? 1 : 0)
      })
    }
  }

  return matches
}

async function* walk(
  root: string,
  showHidden: boolean,
  signal: { cancelled: boolean }
): AsyncGenerator<string> {
  const stack: string[] = [root]

  while (stack.length > 0) {
    if (signal.cancelled) return
    const dir = stack.pop() as string

    let dirents: Dirent[]
    try {
      dirents = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    for (const dirent of dirents) {
      if (!showHidden && dirent.name.startsWith('.')) continue
      const full = path.join(dir, dirent.name)

      if (dirent.isDirectory()) {
        if (NOISY_DIRECTORIES.has(dirent.name)) continue
        stack.push(full)
      } else if (dirent.isFile()) {
        yield full
      }
    }
  }
}

export async function searchWorkspace(
  request: WorkspaceSearchRequest
): Promise<WorkspaceSearchResponse> {
  const started = Date.now()
  cancelToken = { cancelled: false }
  const signal = cancelToken

  const root = await pathGuard.assert(request.root)
  const results: SearchFileResult[] = []
  let filesScanned = 0
  let totalMatches = 0
  let truncated = false

  if (!request.query) {
    return { results, filesScanned: 0, totalMatches: 0, truncated: false, durationMs: 0 }
  }

  const regex = buildQueryRegex(request.query, request)
  const include = globMatcher(request.include)
  const exclude = globMatcher(request.exclude)

  for await (const file of walk(root, false, signal)) {
    if (signal.cancelled) {
      truncated = true
      break
    }
    if (totalMatches >= request.maxTotalMatches) {
      truncated = true
      break
    }

    const relative = path.relative(root, file)
    if (include && !include(relative)) continue
    if (exclude && exclude(relative)) continue
    if (!include && !SEARCHABLE_EXTENSIONS.has(path.extname(file).toLowerCase())) continue

    let stats: Stats
    try {
      stats = await fs.stat(file)
    } catch {
      continue
    }
    if (stats.size > MAX_SEARCHABLE_BYTES) continue

    let text: string
    try {
      text = await fs.readFile(file, 'utf8')
    } catch {
      continue
    }
    filesScanned++

    // Cheap reject before the (much costlier) per-line regex sweep.
    if (!request.regex) {
      const haystack = request.caseSensitive ? text : text.toLowerCase()
      const needle = request.caseSensitive ? request.query : request.query.toLowerCase()
      if (!haystack.includes(needle)) continue
    }

    const matches = matchesInText(text.replace(/\r\n/g, '\n'), regex, request.maxFileMatches)
    if (matches.length === 0) continue

    totalMatches += matches.length
    results.push({
      path: file,
      name: path.basename(file),
      directory: path.dirname(file),
      matches,
      truncated: matches.length >= request.maxFileMatches
    })
  }

  results.sort((a, b) => a.path.localeCompare(b.path))

  return {
    results,
    filesScanned,
    totalMatches,
    truncated,
    durationMs: Date.now() - started
  }
}

export async function replaceInWorkspace(
  request: WorkspaceReplaceRequest
): Promise<WorkspaceReplaceResponse> {
  const targets =
    request.files.length > 0
      ? request.files
      : (await searchWorkspace(request)).results.map((r) => r.path)

  const skipped: { path: string; reason: string }[] = []
  let filesChanged = 0
  let replacements = 0

  for (const target of targets) {
    try {
      const file = await readTextFile(target)
      const regex = buildQueryRegex(request.query, request)

      let count = 0
      const next = file.content.replace(regex, (...args) => {
        count++
        if (!request.regex) return request.replacement
        // Support $& and $1..$9 backreferences for regex searches.
        const groups = args.slice(0, -2) as string[]
        return request.replacement.replace(/\$(\d|&)/g, (_, token: string) =>
          token === '&' ? (groups[0] ?? '') : (groups[Number(token)] ?? '')
        )
      })

      if (count === 0 || next === file.content) continue

      const outcome = await writeTextFile({
        path: target,
        content: next,
        eol: file.eol,
        bom: file.bom,
        expect: file.stamp
      })

      if (outcome.status === 'conflict') {
        skipped.push({ path: target, reason: 'Changed on disk during replace' })
        continue
      }

      filesChanged++
      replacements += count
    } catch (error) {
      skipped.push({ path: target, reason: (error as Error).message })
    }
  }

  return { filesChanged, replacements, skipped }
}
