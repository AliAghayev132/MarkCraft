// ── @lib ───────────────────────────────────────────────────────────────────
import { type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { anchorOf, bestSides, canvasColorCss } from '@shared'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasEdgesProps } from './types'

/**
 * The lines between cards.
 *
 * One `<svg>` for the whole scene rather than one per edge, so the browser can
 * composite it as a single surface. The layer itself takes no pointer events;
 * each line opts back in through a wide transparent stroke laid under the
 * visible one, because a two-pixel line is not something anyone can click.
 */
export function CanvasEdges({
  canvas,
  selected,
  pending,
  onSelect
}: CanvasEdgesProps): ReactElement {
  const byId = new Map(canvas.nodes.map((node) => [node.id, node]))
  const chosen = new Set(selected)

  const strokeOf = (color: string | undefined): string => canvasColorCss(color) ?? 'currentColor'
  const markers = [...new Set(canvas.edges.map((edge) => strokeOf(edge.color)))]

  return (
    <svg className="pointer-events-none absolute overflow-visible" width={1} height={1}>
      <defs>
        {/*
         * One marker per colour in use. SVG markers cannot inherit the stroke
         * of the line that uses them, so an arrowhead has to be defined in the
         * colour it will be drawn in.
         */}
        {markers.map((colour, at) => (
            <marker
              key={colour}
              id={`mc-arrow-${at}`}
              viewBox="0 0 10 10"
              refX={9}
              refY={5}
              markerWidth={5}
              markerHeight={5}
              orient="auto-start-reverse"
            >
            <path d="M 0 1 L 9 5 L 0 9 z" fill={colour} />
          </marker>
        ))}
      </defs>

      {canvas.edges.map((edge) => {
        const from = byId.get(edge.fromNode)
        const to = byId.get(edge.toNode)
        if (!from || !to) return null

        const sides = bestSides(from, to)
        const a = anchorOf(from, edge.fromSide ?? sides.from)
        const b = anchorOf(to, edge.toSide ?? sides.to)

        const colour = canvasColorCss(edge.color)
        const marker = markers.indexOf(strokeOf(edge.color))

        return (
          <g key={edge.id} className="pointer-events-auto">
            {/* The grab target. Invisible, and far easier to hit than the line. */}
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="transparent"
              strokeWidth={14}
              className="cursor-pointer"
              onPointerDown={(event) => {
                event.stopPropagation()
                onSelect(edge, event.shiftKey)
              }}
            />

            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={colour ?? undefined}
              markerEnd={`url(#mc-arrow-${marker})`}
              strokeWidth={chosen.has(edge.id) ? 3.5 : 2}
              className={cx(
                'pointer-events-none',
                colour ? '' : 'stroke-ink-tertiary text-ink-tertiary',
                chosen.has(edge.id) ? 'stroke-accent text-accent' : ''
              )}
            />

            {edge.label ? (
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 6}
                textAnchor="middle"
                className="pointer-events-none fill-ink-secondary text-[11px]"
                // Painted behind the glyphs so a label over a line stays
                // readable without a rectangle to keep in sync with the text.
                paintOrder="stroke"
                stroke="var(--mc-bg-sunken)"
                strokeWidth={4}
                strokeLinejoin="round"
              >
                {edge.label}
              </text>
            ) : null}
          </g>
        )
      })}

      {/* The line following the pointer, before it has landed on a card. */}
      {pending ? (
        <line
          x1={anchorOf(pending.from, pending.side).x}
          y1={anchorOf(pending.from, pending.side).y}
          x2={pending.toX}
          y2={pending.toY}
          className="pointer-events-none stroke-accent"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      ) : null}
    </svg>
  )
}
