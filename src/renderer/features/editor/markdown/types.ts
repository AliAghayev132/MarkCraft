/**
 * Markdown contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

export interface NormalizationCheck {
  changed: boolean
  normalized: string
  /** A short, human summary of the kinds of change, for the warning banner. */
  differences: string[]
}

export interface RenderContext {
  /** Directory of the document, used to resolve relative links and images. */
  baseDir: string | null
  /** Opens a relative Markdown link as a document. */
  onOpenDocument?: (absolutePath: string) => void
  gfm: boolean
  highlight: boolean
}

export interface DocumentStats {
  words: number
  characters: number
  charactersNoSpaces: number
  paragraphs: number
  sentences: number
  lines: number
  readingTimeMinutes: number
}
