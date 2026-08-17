/**
 * Output contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

export interface ExportModalProps {
  open: boolean
  onClose: () => void
  documentTitle: string
}

export interface ShareModalProps {
  open: boolean
  onClose: () => void
  documentTitle: string
  hasPath: boolean
  onExport: () => void
}

/**
 * The shape written by a JSON export.
 *
 * Versioned by `schema`, because this is the one output another program is
 * expected to parse — and a consumer needs to know when the shape moves.
 */
export interface DocumentJson {
  schema: 'markcraft/document@1'
  exportedAt: string
  title: string
  path: string | null
  /** The raw YAML block, unparsed. */
  frontMatter: string | null
  stats: {
    words: number
    characters: number
    charactersNoSpaces: number
    paragraphs: number
    sentences: number
    lines: number
    readingTimeMinutes: number
  }
  outline: { level: number; text: string; line: number }[]
  markdown: string
  /** mdast — the same tree every editing surface is a view of. */
  ast: Record<string, unknown>
}
