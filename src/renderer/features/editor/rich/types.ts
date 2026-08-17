/**
 * Rich contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { Settings } from '@shared'

export interface RichEditorProps {
  documentId: string
  value: string
  settings: Settings
  onChange: (markdown: string) => void
  onSave?: () => void
  /** False while the document is locked. */
  editable?: boolean
}
