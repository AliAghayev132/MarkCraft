// ── types ──────────────────────────────────────────────────────────────────
import type { OutlineHeading } from './types'

/**
 * The document's headings, in order, with the line each one starts on.
 *
 * Parsed from the Markdown text rather than from the rendered preview: the
 * outline has to work in every view mode, including source-only, where nothing
 * has been rendered at all. It also has to survive a document the user is
 * halfway through typing, so it is deliberately tolerant — an unterminated code
 * fence stops the scan rather than producing nonsense.
 *
 * Two things are *not* headings and are the usual reason a naive scan is wrong:
 * a `#` inside a fenced code block (very common in shell examples), and a `#`
 * inside front matter. Both are skipped.
 */
export function parseOutline(markdown: string): OutlineHeading[] {
  const lines = markdown.split('\n')
  const headings: OutlineHeading[] = []

  let inFence = false
  let fenceMarker = ''
  let index = 0

  // Front matter, when the document opens with it.
  if (lines[0]?.trim() === '---') {
    const closing = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
    if (closing > 0) index = closing + 1
  }

  for (; index < lines.length; index++) {
    const line = lines[index] ?? ''
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/)

    if (fence) {
      const marker = fence[1] as string
      if (!inFence) {
        inFence = true
        fenceMarker = marker[0] as string
      } else if (marker[0] === fenceMarker) {
        inFence = false
      }
      continue
    }

    if (inFence) continue

    const atx = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/)
    if (!atx) continue

    const text = cleanInline(atx[2] ?? '')
    if (!text) continue

    headings.push({
      // `line` is 1-based, matching what `goToLine` expects.
      line: index + 1,
      level: (atx[1] as string).length,
      text
    })
  }

  return headings
}

/**
 * Strips the inline syntax a heading may carry, so the outline reads as prose.
 * Link *text* is kept and the target dropped — the words are what identify the
 * section.
 */
function cleanInline(text: string): string {
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/[*_~]{1,3}/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
}

/**
 * The heading containing a given line — what the outline highlights as the
 * caret moves. Returns the *last* heading at or above the line, which is the
 * section the reader is actually in.
 */
export function activeHeading(headings: OutlineHeading[], line: number): OutlineHeading | null {
  let active: OutlineHeading | null = null
  for (const heading of headings) {
    if (heading.line > line) break
    active = heading
  }
  return active
}

/** Filters by a typed query, keeping the ancestors that give a hit its place. */
export function filterOutline(headings: OutlineHeading[], query: string): OutlineHeading[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return headings

  const keep = new Set<number>()

  headings.forEach((heading, index) => {
    if (!heading.text.toLowerCase().includes(needle)) return
    keep.add(index)

    // Walk back up the levels so a matched sub-heading is not orphaned.
    let level = heading.level
    for (let i = index - 1; i >= 0 && level > 1; i--) {
      const candidate = headings[i] as OutlineHeading
      if (candidate.level < level) {
        keep.add(i)
        level = candidate.level
      }
    }
  })

  return headings.filter((_, index) => keep.has(index))
}
