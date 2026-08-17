/**
 * Documents contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'

export interface ExternalChangeBannerProps {
  document: DocumentModel
}

/* ────────────────────────────────────────────────────────────────────────────
 * Saving
 * ─────────────────────────────────────────────────────────────────────────── */

export interface SaveResult {
  saved: boolean
  path: string | null
}
