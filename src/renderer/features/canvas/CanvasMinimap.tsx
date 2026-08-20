// ── @lib ───────────────────────────────────────────────────────────────────
import { useMemo, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { canvasBounds, canvasColorCss } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasMinimapProps } from './types'

const WIDTH = 168
const HEIGHT = 112
const PADDING = 8

/**
 * The whole canvas, small, with a box round what is on screen.
 *
 * An infinite surface has no scrollbars to tell you where you are, and at 30%
 * zoom on a large canvas the answer to "where is everything else" is otherwise
 * to zoom out and lose your place. Clicking here moves the view without
 * changing the zoom, which is the one thing a map is for.
 *
 * Hidden below a handful of cards: a map of three things is not a map, it is
 * clutter in the corner.
 */
export function CanvasMinimap({
  canvas,
  view,
  surface,
  onJump
}: CanvasMinimapProps): ReactElement | null {
  const t = useT()

  const world = useMemo(() => canvasBounds(canvas.nodes), [canvas.nodes])

  const viewport = surface.current?.getBoundingClientRect()

  if (canvas.nodes.length < 6 || world.width === 0 || world.height === 0) return null

  /*
   * One scale for both axes, so the map is not a distorted picture of the
   * canvas — a card that is square on the surface has to be square here too,
   * or the map stops being recognisable as the thing it maps.
   */
  const scale = Math.min(
    (WIDTH - PADDING * 2) / world.width,
    (HEIGHT - PADDING * 2) / world.height
  )
  const offsetX = PADDING + (WIDTH - PADDING * 2 - world.width * scale) / 2
  const offsetY = PADDING + (HEIGHT - PADDING * 2 - world.height * scale) / 2

  const toMap = (x: number, y: number): { x: number; y: number } => ({
    x: offsetX + (x - world.x) * scale,
    y: offsetY + (y - world.y) * scale
  })

  // What the window is showing, in canvas coordinates.
  const seen = viewport
    ? {
        x: -view.x / view.zoom,
        y: -view.y / view.zoom,
        width: viewport.width / view.zoom,
        height: viewport.height / view.zoom
      }
    : null

  const jump = (event: React.MouseEvent<SVGSVGElement>): void => {
    const box = event.currentTarget.getBoundingClientRect()
    if (!viewport) return

    // Where the click points to on the canvas, then the pan that puts that
    // point in the middle of the window.
    const sceneX = world.x + (event.clientX - box.left - offsetX) / scale
    const sceneY = world.y + (event.clientY - box.top - offsetY) / scale

    onJump(viewport.width / 2 - sceneX * view.zoom, viewport.height / 2 - sceneY * view.zoom)
  }

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label={t('canvas.minimap')}
      onClick={jump}
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute bottom-3 right-3 cursor-pointer rounded-lg border border-line bg-app/90 shadow-lg backdrop-blur"
    >
      {canvas.nodes.map((node) => {
        const at = toMap(node.x, node.y)
        const colour = canvasColorCss(node.color)

        return (
          <rect
            key={node.id}
            x={at.x}
            y={at.y}
            // Never smaller than a pixel: a card that rounds away leaves a hole
            // in the map where something actually is.
            width={Math.max(1.5, node.width * scale)}
            height={Math.max(1.5, node.height * scale)}
            rx={1}
            fill={node.type === 'group' ? 'none' : (colour ?? 'var(--mc-text-tertiary)')}
            stroke={node.type === 'group' ? 'var(--mc-line)' : 'none'}
            strokeDasharray={node.type === 'group' ? '2 2' : undefined}
            opacity={node.type === 'group' ? 1 : 0.75}
          />
        )
      })}

      {seen ? (
        <rect
          x={toMap(seen.x, seen.y).x}
          y={toMap(seen.x, seen.y).y}
          width={seen.width * scale}
          height={seen.height * scale}
          fill="var(--mc-accent)"
          fillOpacity={0.12}
          stroke="var(--mc-accent)"
          strokeWidth={1}
        />
      ) : null}
    </svg>
  )
}
