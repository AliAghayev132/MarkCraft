/**
 * Shell contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactNode } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { AppInfo, ViewMode } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'

export interface RecentPanelProps {
  homePath: string | null
}

export interface SidebarProps {
  homePath: string | null
  onRevealMatch: (path: string, line: number) => void
  /** Jumps the open document to a line — used by the outline. */
  onRevealLine: (line: number) => void
  onOpenSettings: () => void
  /** Opens one of the rail's overlay tools. */
  onOpenTool: (id: OverlayId) => void
  /** Opens a file by absolute path — used by the book's table of contents. */
  onOpenDocument: (absolutePath: string) => void
}

export interface StatusBarProps {
  document: DocumentModel | null
  selectionLength: number
  onViewModeChange: (mode: ViewMode) => void
  onStatsClick?: () => void
  extra?: ReactNode
}

export interface TitleBarProps {
  /** Left slot: normally the document title / breadcrumb. */
  children?: ReactNode
  /** Right slot, before the window controls. */
  actions?: ReactNode
}

/* ── Overlays ─────────────────────────────────────────────────────────────── */

export type OverlayId =
  | 'palette'
  | 'settings'
  | 'export'
  | 'share'
  | 'find'
  | 'stats'
  | 'history'
  | 'present'
  | 'devTools'
  | 'links'
  | 'website'
  | 'templates'
  | 'book'
  | 'study'
  | 'canvas'
  | 'http'
  | 'help'

export interface Overlays {
  open: Record<OverlayId, boolean>
  /** Whether the find bar was opened for replace rather than search. */
  replacing: boolean
  /** Opens an overlay, leaving reading mode first. */
  show: (id: OverlayId) => void
  hide: (id: OverlayId) => void
  showFind: (replace: boolean) => void
  showEmoji: () => void
}

export interface AppOverlaysProps {
  overlays: Overlays
  appInfo: AppInfo | null
  documentTitle: string
  hasPath: boolean
  onOpenDocument: (path: string) => void
  onSelectionChange: (length: number) => void
}
