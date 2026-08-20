/**
 * Search contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { SearchFileResult } from '@shared'

export interface FindReplaceBarProps {
  open: boolean
  showReplace: boolean
  onToggleReplace: (value: boolean) => void
  onClose: () => void
  /** Live document text, used to count matches. */
  documentText: string
}

export interface SearchPanelProps {
  homePath: string | null
  /** Opens a document and reveals the matched line. */
  onRevealMatch: (path: string, line: number) => void
}

export interface FileResultProps {
  file: SearchFileResult
  homePath: string | null
  collapsed: boolean
  onToggle: () => void
  onSelect: (line: number) => void
  /**
   * What a matched passage will become, or null while nothing is being
   * replaced. A function rather than a string because a regex replacement
   * differs from match to match.
   */
  preview: ((matched: string) => string) | null
}
