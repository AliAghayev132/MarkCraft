/**
 * Source contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { EditorSettings } from '@shared'

export interface SourceEditorProps {
  documentId: string
  value: string
  settings: EditorSettings
  readOnly?: boolean
  onChange: (value: string) => void
  onCursor: (line: number, column: number, selectionLength: number) => void
  onScroll?: (scrollTop: number) => void
  onSave?: () => void
  /** Line to reveal when the document opens or a search result is chosen. */
  revealLine?: number | null
}

export interface SourceEditorCallbacks {
  onChange: (value: string) => void
  onCursor: (line: number, column: number, selectionLength: number) => void
  onScroll?: (scrollTop: number) => void
  onSave?: () => void
}

/**
 * Markdown formatting operations for the source editor.
 *
 * All of them are *toggles* driven by the current selection, so pressing Bold
 * twice returns the text to where it started rather than nesting markers. They
 * operate through CodeMirror transactions, which means undo/redo, multiple
 * cursors and collaborative-safe positions all come for free (§20).
 */

export interface SelectionContext {
  from: number
  to: number
  text: string
  empty: boolean
}
