// ── @shared ────────────────────────────────────────────────────────────────
import type { MarkdownSettings } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { computeStats, parseMarkdown } from '@features/editor/markdown'
import { parseOutline } from '@features/outline'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'
import type { DocumentJson } from './types'

/**
 * The document as data rather than as prose.
 *
 * Two audiences, and the shape serves both: a person reading it wants the
 * metadata, the outline and the counts at the top, and a script wants the
 * `ast` — the same mdast every other part of the application works from, so a
 * consumer sees exactly what the editor sees rather than a second, looser
 * interpretation of the file.
 *
 * `exportedAt` is passed in rather than read here so the value is decided once,
 * by the caller, and the function stays pure.
 */
export function buildDocumentJson(
  document: DocumentModel,
  settings: MarkdownSettings,
  exportedAt: string
): DocumentJson {
  const stats = computeStats(document.content)

  return {
    schema: 'markcraft/document@1',
    exportedAt,
    title: document.title.replace(/\.[^.]+$/, ''),
    path: document.path,
    frontMatter: readFrontMatter(document.content),
    stats: {
      words: stats.words,
      characters: stats.characters,
      charactersNoSpaces: stats.charactersNoSpaces,
      paragraphs: stats.paragraphs,
      sentences: stats.sentences,
      lines: stats.lines,
      readingTimeMinutes: stats.readingTimeMinutes
    },
    outline: parseOutline(document.content).map((heading) => ({
      level: heading.level,
      text: heading.text,
      line: heading.line
    })),
    markdown: document.content,
    ast: parseMarkdown(document.content, settings.gfm) as unknown as Record<string, unknown>
  }
}

/**
 * The YAML block some documents open with.
 *
 * Returned as raw text, not parsed: MarkCraft has no YAML parser and adding one
 * to serialise a field nobody asked for would be a dependency in exchange for a
 * guess. The consumer already knows what their own front matter means.
 */
function readFrontMatter(content: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/)
  return match ? (match[1] ?? null) : null
}
