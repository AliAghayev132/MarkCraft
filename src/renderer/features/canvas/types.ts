// ── @shared ────────────────────────────────────────────────────────────────
import type { CanvasData, CanvasNode, Side } from '@shared'

export interface CanvasViewProps {
  open: boolean
  onClose: () => void
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasViewport {
  view: Viewport
  setView: (update: (current: Viewport) => Viewport) => void
  /** Screen coordinates to canvas coordinates. */
  toScene: (clientX: number, clientY: number) => { x: number; y: number }
  zoomAt: (clientX: number, clientY: number, factor: number) => void
  fit: (nodes: CanvasNode[]) => void
}

export interface CanvasDocument {
  canvas: CanvasData
  dirty: boolean
  loading: boolean
  canUndo: boolean
  /** The only way the canvas changes; `coalesce` folds a drag into one frame. */
  edit: (change: (canvas: CanvasData) => CanvasData, coalesce?: boolean) => void
  undo: () => void
  save: () => Promise<void>
}

/** What the pointer is doing between press and release. */
export type CanvasGesture =
  | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number }
  | { kind: 'move'; id: string; startX: number; startY: number; originX: number; originY: number }
  | { kind: 'resize'; id: string; startX: number; startY: number; width: number; height: number }
  | { kind: 'link'; id: string; side: Side; toX: number; toY: number }

export interface CanvasCardProps {
  node: CanvasNode
  selected: boolean
  editing: boolean
  zoom: number
  onStartEdit: () => void
  onCommitEdit: (text: string) => void
  onCancelEdit: () => void
  onStartLink: (side: Side, event: React.PointerEvent) => void
  onStartResize: (event: React.PointerEvent) => void
}

export interface CanvasEdgesProps {
  canvas: CanvasData
  /** The line being dragged out of a card, before it has landed anywhere. */
  pending: { from: CanvasNode; side: Side; toX: number; toY: number } | null
}
