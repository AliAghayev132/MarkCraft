// ── @lib ───────────────────────────────────────────────────────────────────
import { type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { canvasColorCss } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { SessionCursorsProps } from './types'

/**
 * Everybody else's pointer.
 *
 * Drawn inside the transformed scene, so a cursor stays on the card it is
 * pointing at when anyone pans or zooms — a cursor placed in screen space would
 * drift away from what its owner is actually looking at, which is worse than
 * not showing it.
 *
 * Counter-scaled, so the arrow and the name stay the same size on screen at
 * every zoom. At 25% an unscaled cursor is four pixels of nothing.
 */
export function SessionCursors({ participants, zoom }: SessionCursorsProps): ReactElement | null {
  const visible = participants.filter((participant) => participant.cursor !== null)
  if (visible.length === 0) return null

  return (
    <>
      {visible.map((participant) => {
        const colour = canvasColorCss(participant.colour) ?? 'var(--mc-accent)'
        const at = participant.cursor as { x: number; y: number }

        return (
          <div
            key={participant.id}
            aria-hidden="true"
            style={{
              left: at.x,
              top: at.y,
              transform: `scale(${1 / zoom})`,
              transformOrigin: '0 0',
              // Above the cards, and never in the way of the pointer that is
              // actually being used to work.
              zIndex: 30
            }}
            className="pointer-events-none absolute"
          >
            <svg width={16} height={20} viewBox="0 0 16 20" className="drop-shadow-sm">
              <path
                d="M1 1 L1 15 L5 11.5 L7.5 17.5 L10 16.5 L7.5 10.8 L13 10.5 Z"
                fill={colour}
                stroke="var(--mc-bg-app)"
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
            </svg>

            <span
              style={{ backgroundColor: colour }}
              className="ml-3 inline-block max-w-[10rem] truncate rounded px-1.5 py-0.5 text-2xs font-medium text-[var(--mc-bg-app)]"
            >
              {participant.name}
            </span>
          </div>
        )
      })}
    </>
  )
}

/**
 * What somebody else has selected, outlined in their colour.
 *
 * A separate ring rather than the selection ring the local person gets: two
 * people selecting the same card must both be visible, and one ring cannot be
 * two colours.
 */
export function SessionSelections({
  participants,
  nodes
}: {
  participants: SessionCursorsProps['participants']
  nodes: { id: string; x: number; y: number; width: number; height: number }[]
}): ReactElement | null {
  const byId = new Map(nodes.map((node) => [node.id, node]))

  const marks = participants.flatMap((participant) =>
    participant.selection
      .map((id) => ({ participant, node: byId.get(id) }))
      .filter((mark): mark is { participant: typeof participant; node: NonNullable<typeof mark.node> } =>
        Boolean(mark.node)
      )
  )
  if (marks.length === 0) return null

  return (
    <>
      {marks.map(({ participant, node }, at) => (
        <div
          key={`${participant.id}-${node.id}-${at}`}
          aria-hidden="true"
          style={{
            left: node.x - 3,
            top: node.y - 3,
            width: node.width + 6,
            height: node.height + 6,
            borderColor: canvasColorCss(participant.colour) ?? 'var(--mc-accent)'
          }}
          className="pointer-events-none absolute rounded-xl border-2 opacity-70"
        />
      ))}
    </>
  )
}
