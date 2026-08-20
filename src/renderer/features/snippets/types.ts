/**
 * Snippets contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { Snippet } from '@shared'

export interface SnippetDialogProps {
  /** The snippet being edited, or a blank one being created. */
  snippet: Snippet | null
  onClose: () => void
}

export interface SnippetEditorState {
  open: boolean
  snippet: Snippet | null
}
