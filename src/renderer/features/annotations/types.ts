/**
 * Annotations contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { PlacedAnnotation } from '@shared'

export interface CommentRowProps {
  /** The comment, with where its passage now sits — or null if it has gone. */
  comment: PlacedAnnotation
}
