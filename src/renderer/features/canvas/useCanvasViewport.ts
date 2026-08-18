// ── @lib ───────────────────────────────────────────────────────────────────
import { useCallback, useState, type RefObject } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { canvasBounds, type CanvasNode } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasViewport, Viewport } from './types'

export const ZOOM_LIMITS = { min: 0.2, max: 2.5 }

/**
 * Pan and zoom.
 *
 * One transform on one group rather than a position per card: the browser then
 * composites the whole scene once, and a canvas with a hundred cards drags as
 * smoothly as one with three.
 */
export function useCanvasViewport(surface: RefObject<HTMLDivElement | null>): CanvasViewport {
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })

  const toScene = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const box = surface.current?.getBoundingClientRect()
      if (!box) return { x: 0, y: 0 }

      return {
        x: (clientX - box.left - view.x) / view.zoom,
        y: (clientY - box.top - view.y) / view.zoom
      }
    },
    [surface, view]
  )

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number): void => {
      const box = surface.current?.getBoundingClientRect()
      if (!box) return

      const zoom = Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, view.zoom * factor))

      // Zoom about the pointer, so the card under it stays under it.
      const px = clientX - box.left
      const py = clientY - box.top

      setView({
        zoom,
        x: px - ((px - view.x) / view.zoom) * zoom,
        y: py - ((py - view.y) / view.zoom) * zoom
      })
    },
    [surface, view]
  )

  const fit = useCallback(
    (nodes: CanvasNode[]): void => {
      const box = surface.current?.getBoundingClientRect()
      const bounds = canvasBounds(nodes)
      if (!box || bounds.width === 0 || bounds.height === 0) return

      const zoom = Math.min(
        ZOOM_LIMITS.max,
        Math.min((box.width - 80) / bounds.width, (box.height - 80) / bounds.height)
      )

      setView({
        zoom,
        x: box.width / 2 - (bounds.x + bounds.width / 2) * zoom,
        y: box.height / 2 - (bounds.y + bounds.height / 2) * zoom
      })
    },
    [surface]
  )

  return { view, setView, toScene, zoomAt, fit }
}
