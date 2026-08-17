// ── types ──────────────────────────────────────────────────────────────────
import type { ToastTone } from '@store/slices/types'

/**
 * Services contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */
export interface CustomLocaleFile {
  code: string
  messages: Record<string, unknown>
}

export interface ToastInput {
  tone: ToastTone
  title: string
  description?: string
  duration?: number
  key?: string
  action?: { label: string; onClick: () => void }
}
