/**
 * Editor contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { Settings } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'

export interface EditorPaneProps {
  document: DocumentModel
  settings: Settings
  onSave: () => void
  onOpenDocument: (path: string) => void
  revealLine?: number | null
}

export interface SplitResizerProps {
  ratio: number
  onChange: (ratio: number) => void
  ariaLabel: string
  min?: number
  max?: number
  orientation?: 'vertical' | 'horizontal'
}

export type EditorSurface = 'source' | 'rich' | null

export type FormatAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'codeBlock'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'horizontalRule'
  | 'undo'
  | 'redo'
  | `heading${1 | 2 | 3 | 4 | 5 | 6}`
  | 'paragraph'

/* ────────────────────────────────────────────────────────────────────────────
 * Insertions that carry structured data from a dialog
 * ─────────────────────────────────────────────────────────────────────────── */

export interface LinkPayload {
  text: string
  url: string
  title?: string
}

export interface ImagePayload {
  alt: string
  src: string
  title?: string
}

export interface TablePayload {
  rows: number
  columns: number
  headerRow: boolean
  alignments: ('left' | 'center' | 'right')[]
}
