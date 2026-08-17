/**
 * Explorer contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @lib ───────────────────────────────────────────────────────────────────
import type { DragEvent, MouseEvent } from '@lib/react'

// ── types ──────────────────────────────────────────────────────────────────
import type { TreeNode } from '@store/slices/types'

export interface ExplorerHeaderProps {
  homePath: string | null
}

export interface FileExplorerProps {
  homePath: string | null
}

export interface TreeRowProps {
  node: TreeNode
  index: number
  selected: boolean
  /** The file backing the active tab — distinct from tree selection. */
  active: boolean
  expanded: boolean
  loading: boolean
  cut: boolean
  isDropTarget: boolean
  onClick: (event: MouseEvent) => void
  onContextMenu: (event: MouseEvent) => void
  onDragStart: (event: DragEvent) => void
  onDropTargetChange: (path: string | null) => void
  onMove: (sources: string[], targetDir: string) => void
}

export interface WorkspaceSwitcherProps {
  homePath: string | null
}
