/**
 * Hooks contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right' | 'left'

export interface AnchorRect {
  top: number
  left: number
  width: number
  height: number
}

export interface Position {
  top: number
  left: number
  /** The placement actually used after flipping, for arrow/animation origin. */
  placement: Placement
}

export interface VirtualWindow {
  startIndex: number
  endIndex: number
  offsetTop: number
  totalHeight: number
}
