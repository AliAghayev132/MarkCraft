// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentStats } from './types'

export const EMPTY_STATS: DocumentStats = {
  words: 0,
  characters: 0,
  charactersNoSpaces: 0,
  paragraphs: 0,
  sentences: 0,
  lines: 1,
  readingTimeMinutes: 0
}

/**
 * Counts prose, not markup.
 *
 * Fenced code, inline code, link targets, image syntax and heading markers are
 * stripped first — a status bar claiming 4,000 words because the document
 * contains a large JSON block is worse than useless to a writer.
 */
export function computeStats(markdown: string): DocumentStats {
  const lines = markdown.length === 0 ? 1 : markdown.split('\n').length
  const characters = markdown.length
  const charactersNoSpaces = markdown.replace(/\s/g, '').length

  const prose = markdown
    .replace(/^---\n[\s\S]*?\n---\n/, '') // front matter
    .replace(/```[\s\S]*?```/g, ' ') // fenced code
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links keep their text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ') // table rows
    .replace(/[*_~]{1,3}/g, '')
    .replace(/<[^>]+>/g, ' ')

  // Split on whitespace including non-breaking spaces, which are common in
  // pasted prose and would otherwise fuse two words into one.
  const words = prose.split(/[\s\u00a0]+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length

  const paragraphs = prose
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0).length

  const sentences = (prose.match(/[.!?…]+(\s|$)/g) ?? []).length

  return {
    words,
    characters,
    charactersNoSpaces,
    paragraphs,
    sentences,
    lines,
    readingTimeMinutes: words / 225
  }
}

/**
 * Statistics are recomputed on a trailing debounce rather than per keystroke.
 * On a large document the regex sweep is the single most expensive thing the
 * status bar does, and nobody needs a word count that updates 60 times a second.
 */
export function createStatsScheduler(
  onResult: (stats: DocumentStats) => void,
  delayMs = 400
): { schedule: (markdown: string) => void; flush: (markdown: string) => void; dispose: () => void } {
  let timer: number | null = null
  let idle: number | null = null

  const cancel = (): void => {
    if (timer !== null) window.clearTimeout(timer)
    if (idle !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idle)
    timer = null
    idle = null
  }

  const run = (markdown: string): void => {
    const compute = (): void => onResult(computeStats(markdown))
    if ('requestIdleCallback' in window) {
      idle = window.requestIdleCallback(compute, { timeout: 600 })
    } else {
      compute()
    }
  }

  return {
    schedule(markdown) {
      cancel()
      timer = window.setTimeout(() => run(markdown), delayMs)
    },
    flush(markdown) {
      cancel()
      onResult(computeStats(markdown))
    },
    dispose: cancel
  }
}
