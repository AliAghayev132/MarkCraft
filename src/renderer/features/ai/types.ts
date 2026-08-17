// ── @shared ────────────────────────────────────────────────────────────────
import type { AiAction, AiProfile } from '@shared'

/** Where the text came from, and therefore where a replacement has to go. */
export interface AiTarget {
  scope: 'selection' | 'document'
  text: string
  surface: 'source' | 'rich'
  /**
   * The source-editor range the text came from.
   *
   * Kept so a replacement lands exactly where the user selected, and checked
   * against the live document before it is used — the answer takes seconds to
   * arrive, and the user may well have kept typing.
   */
  range?: { from: number; to: number }
}

/**
 * The one long-lived piece of state the feature has.
 *
 * `phase` is what the dialog renders: `confirm` only appears when the user
 * asked to be asked, `streaming` is the answer arriving, and `done` is the
 * point at which anything may be written back to the document.
 */
export type AiPhase = 'idle' | 'confirm' | 'streaming' | 'done' | 'error'

export interface AiRunState {
  phase: AiPhase
  runId: string
  action: AiAction
  instruction: string
  target: AiTarget | null
  output: string
  error: string | null
}

export interface AiDialogProps {
  open: boolean
  onClose: () => void
}

export interface AiMenuProps {
  /** Rendered inline in the formatting toolbar, so it must be compact. */
  compact?: boolean
}

export interface AiProfileEditorProps {
  profile: AiProfile
  hasKey: boolean
  onChange: (patch: Partial<AiProfile>) => void
  onRemove: () => void
  onKeyChange: (key: string) => void
}
