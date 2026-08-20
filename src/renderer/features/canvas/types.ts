// ── @shared ────────────────────────────────────────────────────────────────
import type { RefObject } from '@lib/react'

import type { Alignment, CanvasData, CanvasEdge, CanvasNode, Side } from '@shared'

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
  canRedo: boolean
  /** The only way the canvas changes; `coalesce` folds a drag into one frame. */
  edit: (change: (canvas: CanvasData) => CanvasData, coalesce?: boolean) => void
  /** A canvas that arrived from someone else; not an edit, and not undoable. */
  replace: (canvas: CanvasData) => void
  undo: () => void
  redo: () => void
  save: () => Promise<void>
}

/**
 * What is selected.
 *
 * Cards and lines together, because the toolbar acts on both and the user made
 * no distinction when they dragged a box around them.
 */
export interface CanvasSelection {
  nodes: string[]
  edges: string[]
}

export const EMPTY_SELECTION: CanvasSelection = { nodes: [], edges: [] }

/** What the pointer is doing between press and release. */
export type CanvasGesture =
  | { kind: 'pan'; startX: number; startY: number; originX: number; originY: number }
  | {
      kind: 'move'
      /** Every node that travels, including a group's contents. */
      origins: Map<string, { x: number; y: number }>
      startX: number
      startY: number
    }
  | { kind: 'resize'; id: string; startX: number; startY: number; width: number; height: number }
  | { kind: 'link'; id: string; side: Side; toX: number; toY: number }
  | { kind: 'marquee'; fromX: number; fromY: number; toX: number; toY: number; additive: boolean }

export interface CanvasCardProps {
  node: CanvasNode
  selected: boolean
  editing: boolean
  zoom: number
  onCommitEdit: (text: string) => void
  onCancelEdit: () => void
  onStartLink: (side: Side, event: React.PointerEvent) => void
  onStartResize: (event: React.PointerEvent) => void
}

export interface CanvasEdgesProps {
  canvas: CanvasData
  selected: string[]
  /** The line being dragged out of a card, before it has landed anywhere. */
  pending: { from: CanvasNode; side: Side; toX: number; toY: number } | null
  onSelect: (edge: CanvasEdge, additive: boolean) => void
}

export interface CanvasPaletteProps {
  /** The colour every selected mark shares, or undefined when they differ. */
  current: string | undefined
  onPick: (color: string | undefined) => void
}

export interface CanvasMinimapProps {
  canvas: CanvasData
  view: Viewport
  /** Measured for the box that shows what is on screen. */
  surface: RefObject<HTMLDivElement | null>
  onJump: (x: number, y: number) => void
}

export interface CanvasToolbarProps {
  selection: CanvasSelection
  canvas: CanvasData
  onColor: (color: string | undefined) => void
  onDuplicate: () => void
  onDelete: () => void
  onGroup: () => void
  onLabelEdge: (id: string, label: string) => void
  onAlign: (how: Alignment) => void
  onDistribute: (axis: 'x' | 'y') => void
  onRestack: (where: 'front' | 'back') => void
}
