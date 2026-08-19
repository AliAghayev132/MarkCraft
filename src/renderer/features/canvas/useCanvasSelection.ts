// ── @lib ───────────────────────────────────────────────────────────────────
import { useCallback, useMemo, useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { CanvasNode } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import { EMPTY_SELECTION, type CanvasSelection } from './types'

interface Selection {
  selection: CanvasSelection
  isNodeSelected: (id: string) => boolean
  clear: () => void
  selectNode: (id: string, additive: boolean) => void
  selectEdge: (id: string, additive: boolean) => void
  selectNodes: (ids: string[]) => void
  /** Keeps only what still exists — after a delete, or after undoing one. */
  prune: (nodes: CanvasNode[], edgeIds: Set<string>) => void
}

/**
 * What is selected on the canvas.
 *
 * Its own hook because selection has a life of its own: it survives edits,
 * outlives the gesture that made it, and every command in the view reads it.
 * Leaving it in the view meant six `useState` calls that had to be kept
 * consistent by hand.
 */
export function useCanvasSelection(): Selection {
  const [selection, setSelection] = useState<CanvasSelection>(EMPTY_SELECTION)

  const chosen = useMemo(() => new Set(selection.nodes), [selection.nodes])

  const selectNode = useCallback((id: string, additive: boolean): void => {
    setSelection((at) => {
      if (!additive) return { nodes: [id], edges: [] }

      // Shift-clicking something already selected takes it back out, which is
      // how every other multi-select in the application behaves.
      return at.nodes.includes(id)
        ? { ...at, nodes: at.nodes.filter((node) => node !== id) }
        : { ...at, nodes: [...at.nodes, id] }
    })
  }, [])

  const selectEdge = useCallback((id: string, additive: boolean): void => {
    setSelection((at) => {
      if (!additive) return { nodes: [], edges: [id] }

      return at.edges.includes(id)
        ? { ...at, edges: at.edges.filter((edge) => edge !== id) }
        : { ...at, edges: [...at.edges, id] }
    })
  }, [])

  return {
    selection,
    isNodeSelected: useCallback((id: string) => chosen.has(id), [chosen]),
    clear: useCallback(() => setSelection(EMPTY_SELECTION), []),
    selectNode,
    selectEdge,
    selectNodes: useCallback((ids: string[]) => setSelection({ nodes: ids, edges: [] }), []),
    prune: useCallback((nodes: CanvasNode[], edgeIds: Set<string>): void => {
      const alive = new Set(nodes.map((node) => node.id))
      setSelection((at) => {
        const kept = {
          nodes: at.nodes.filter((id) => alive.has(id)),
          edges: at.edges.filter((id) => edgeIds.has(id))
        }
        // Same contents means the same object, so nothing downstream re-renders
        // on every edit that happened not to remove anything.
        return kept.nodes.length === at.nodes.length && kept.edges.length === at.edges.length
          ? at
          : kept
      })
    }, [])
  }
}
