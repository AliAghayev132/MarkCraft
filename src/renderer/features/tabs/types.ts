/**
 * Tabs contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @lib ───────────────────────────────────────────────────────────────────
import type { DragEvent, MouseEvent } from '@lib/react'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'

export interface TabProps {
  document: DocumentModel
  active: boolean
  isDropTarget: boolean
  onActivate: () => void
  onClose: () => void
  onContextMenu: (event: MouseEvent) => void
  onDragStart: (event: DragEvent) => void
  onDragOver: (event: DragEvent) => void
  onDrop: (event: DragEvent) => void
  onDragEnd: () => void
}

export interface TabBarProps {
  homePath: string | null
}
