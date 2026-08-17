/**
 * Components contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { EntryKind } from '@shared'

export type ErrorScope = 'editor' | 'preview' | 'sidebar' | 'richEditor'

export interface FileIconProps {
  kind: EntryKind
  ext?: string
  /** Needed for name and path rules; without them only extension rules apply. */
  name?: string
  path?: string
  expanded?: boolean
  size?: number
  className?: string
}
