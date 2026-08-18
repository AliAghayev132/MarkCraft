// ── @lib ───────────────────────────────────────────────────────────────────
import { type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { anchorOf, bestSides } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasEdgesProps } from './types'

/**
 * The lines between cards.
 *
 * One `<svg>` for the whole scene rather than one per edge: the layer sits
 * under the cards and takes no pointer events, so it never has to be hit-tested
 * and the browser can composite it as a single surface.
 */
export function CanvasEdges({ canvas, pending }: CanvasEdgesProps): ReactElement {
  const byId = new Map(canvas.nodes.map((node) => [node.id, node]))

  return (
    <svg className="pointer-events-none absolute overflow-visible" width={1} height={1}>
      {canvas.edges.map((edge) => {
        const from = byId.get(edge.fromNode)
        const to = byId.get(edge.toNode)
        if (!from || !to) return null

        const sides = bestSides(from, to)
        const a = anchorOf(from, edge.fromSide ?? sides.from)
        const b = anchorOf(to, edge.toSide ?? sides.to)

        return (
          <line
            key={edge.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="stroke-ink-tertiary"
            strokeWidth={2}
          />
        )
      })}

      {/* The line following the pointer, before it has landed on a card. */}
      {pending ? (
        <line
          x1={anchorOf(pending.from, pending.side).x}
          y1={anchorOf(pending.from, pending.side).y}
          x2={pending.toX}
          y2={pending.toY}
          className="stroke-accent"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      ) : null}
    </svg>
  )
}
