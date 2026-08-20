/**
 * Tags — `#project`, `#urgent`, `#reading/fiction`.
 *
 * The graph already shows which documents point at which. A tag is the other
 * kind of connection: the one that runs through documents which never mention
 * each other, and that nobody would draw a line for because there is no line to
 * draw. Both are needed and neither replaces the other.
 *
 * Everything here is text in and text out. What a tag *means* is the user's
 * business; what one *is* has to be decided exactly once, and this is where.
 */

// ── ./shared ───────────────────────────────────────────────────────────────
import { fencedLines } from './fences'

/**
 * What counts as a tag.
 *
 * Preceded by whitespace or the start of the line, so `C#` and a URL fragment
 * are not tags. Letters, digits, dash, underscore and a slash for nesting;
 * ending on anything else, so `#done.` is `#done` followed by a full stop.
 * At least one non-digit, because `#1` in "issue #1" is a number, not a tag —
 * which is the single most common false positive there is.
 */
const TAG = /(^|[\s(])#([\p{L}\p{N}_-]*[\p{L}_-][\p{L}\p{N}_/-]*)/gu

/**
 * A colour, not a tag.
 *
 * Three, four, six or eight hex characters with at least one digit among them.
 * The digit is what makes this safe: without it the same rule would rule out
 * `#decade`, `#beefed` and `#facade`, which are words somebody would tag with.
 * `#ffffff` therefore comes out as a tag, and that is the better mistake — a
 * colour written in prose is far rarer than a word, and colours in code are
 * already invisible, since fences and inline code are skipped.
 */
const HEX_COLOUR = /^(?=.*\d)[0-9a-f]{3,4}$|^(?=.*\d)[0-9a-f]{6}$|^(?=.*\d)[0-9a-f]{8}$/i

export interface TagUse {
  /** Without the hash, exactly as written. */
  tag: string
  /** Line number, counting from one, for jumping to it. */
  line: number
}

/**
 * Every tag in a document, in the order they appear.
 *
 * Code is skipped: `#include` is not a tag, and neither is a colour in a CSS
 * block. The same fenced-range machinery the rest of the pipeline uses, so a
 * tag inside a fence is invisible here for the same reason a heading is.
 */
export function extractTags(markdown: string): TagUse[] {
  const fenced = fencedLines(markdown)
  const uses: TagUse[] = []

  markdown.split('\n').forEach((text, index) => {
    const line = index + 1
    if (fenced.has(line)) return

    // Inline code spans, for the same reason.
    const bare = text.replace(/`[^`]*`/g, (match) => ' '.repeat(match.length))

    for (const match of bare.matchAll(TAG)) {
      if (HEX_COLOUR.test(match[2])) continue
      uses.push({ tag: match[2], line })
    }
  })

  return uses
}

/** Just the names, each one once, in the order first seen. */
export function tagsIn(markdown: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  for (const use of extractTags(markdown)) {
    if (seen.has(use.tag)) continue
    seen.add(use.tag)
    tags.push(use.tag)
  }

  return tags
}

export interface TaggedFile {
  path: string
  tags: string[]
}

export interface TagSummary {
  tag: string
  /** Files that carry it, sorted by path. */
  files: string[]
  count: number
}

/**
 * The tags across a workspace, most used first.
 *
 * A parent counts every child: a file tagged `#reading/fiction` is a file about
 * `#reading`, and someone clicking the parent expects to find it. Without that,
 * nesting would make tags worse rather than better — every level would be an
 * island.
 */
export function summariseTags(files: TaggedFile[]): TagSummary[] {
  const byTag = new Map<string, Set<string>>()

  const record = (tag: string, path: string): void => {
    const existing = byTag.get(tag)
    if (existing) existing.add(path)
    else byTag.set(tag, new Set([path]))
  }

  for (const file of files) {
    for (const tag of file.tags) {
      record(tag, file.path)

      // Each ancestor, so `a/b/c` also counts under `a/b` and `a`.
      const parts = tag.split('/')
      for (let depth = 1; depth < parts.length; depth++) {
        record(parts.slice(0, depth).join('/'), file.path)
      }
    }
  }

  return [...byTag.entries()]
    .map(([tag, paths]) => ({
      tag,
      files: [...paths].sort((a, b) => a.localeCompare(b)),
      count: paths.size
    }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** The files carrying a tag, or any tag beneath it. */
export function filesWithTag(files: TaggedFile[], tag: string): string[] {
  const wanted = tag.toLowerCase()

  return files
    .filter((file) =>
      file.tags.some((candidate) => {
        const lower = candidate.toLowerCase()
        return lower === wanted || lower.startsWith(`${wanted}/`)
      })
    )
    .map((file) => file.path)
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Renames a tag everywhere in one document, including its children.
 *
 * Renaming `#reading` to `#books` has to take `#reading/fiction` with it, or
 * half a tree is left pointing at a name that no longer exists.
 */
export function renameTag(markdown: string, from: string, to: string): string {
  const fenced = fencedLines(markdown)

  return markdown
    .split('\n')
    .map((text, index) => {
      if (fenced.has(index + 1)) return text

      return text.replace(TAG, (match, before: string, tag: string) => {
        const lower = tag.toLowerCase()
        const wanted = from.toLowerCase()

        if (lower === wanted) return `${before}#${to}`
        if (lower.startsWith(`${wanted}/`)) return `${before}#${to}${tag.slice(from.length)}`
        return match
      })
    })
    .join('\n')
}

/** What a workspace scan comes back with. */
export interface WorkspaceTags {
  tags: TagSummary[]
  /** True when the scan stopped at its ceiling rather than at the end. */
  truncated: boolean
  durationMs: number
}
