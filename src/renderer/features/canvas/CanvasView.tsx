// ── @lib ───────────────────────────────────────────────────────────────────
import { Expand, Plus, Save, Shapes, X } from '@icons'
import { useCallback, useEffect, useRef, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  anchorOf,
  bestSides,
  canvasBounds,
  nextNodeId,
  nodeAt,
  parseCanvas,
  serialiseCanvas,
  snap,
  EMPTY_CANVAS,
  type CanvasData,
  type CanvasNode
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { toast } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, IconButton, Spinner } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { renderMarkdown } from '@features/editor/markdown'
import { canvasFilePath, readCanvas, writeCanvas } from './canvas-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasViewProps } from './types'

interface Viewport {
  x: number
  y: number
  zoom: number
}

const ZOOM_LIMITS = { min: 0.2, max: 2.5 }

/**
 * The canvas surface.
 *
 * Pan and zoom live in one transform on a single group rather than on each
 * card: the browser then composites the whole scene once, and a canvas with a
 * hundred cards drags as smoothly as one with three.
 */
export function CanvasView({ open, onClose }: CanvasViewProps): ReactElement | null {
  const t = useT()

  const [canvas, setCanvas] = useState<CanvasData>(EMPTY_CANVAS)
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 })
  const [selected, setSelected] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)

  const surface = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string | null; startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)

    void readCanvas()
      .then((json) => {
        if (cancelled) return
        setCanvas(parseCanvas(json))
        setSelected(null)
        setDirty(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  const toScene = useCallback(
    (clientX: number, clientY: number) => {
      const box = surface.current?.getBoundingClientRect()
      if (!box) return { x: 0, y: 0 }

      return {
        x: (clientX - box.left - view.x) / view.zoom,
        y: (clientY - box.top - view.y) / view.zoom
      }
    },
    [view]
  )

  const save = useCallback(async (): Promise<void> => {
    const path = await writeCanvas(serialiseCanvas(canvas))
    if (path) {
      setDirty(false)
      toast.success(t('canvas.saved'))
    }
  }, [canvas, t])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
        return
      }

      // Delete removes the selected card and every line that reached it — an
      // edge to a card that is gone would draw into empty space.
      if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
        event.preventDefault()
        setCanvas((at) => ({
          nodes: at.nodes.filter((node) => node.id !== selected),
          edges: at.edges.filter((edge) => edge.fromNode !== selected && edge.toNode !== selected)
        }))
        setSelected(null)
        setDirty(true)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, save, selected])

  if (!open) return null

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const point = toScene(event.clientX, event.clientY)
    const hit = nodeAt(canvas.nodes, point.x, point.y)

    setSelected(hit?.id ?? null)
    event.currentTarget.setPointerCapture(event.pointerId)

    drag.current = {
      id: hit?.id ?? null,
      startX: event.clientX,
      startY: event.clientY,
      originX: hit?.x ?? view.x,
      originY: hit?.y ?? view.y
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    const state = drag.current
    if (!state) return

    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY

    // No node under the pointer means the surface itself is being dragged.
    if (state.id === null) {
      setView((at) => ({ ...at, x: state.originX + dx, y: state.originY + dy }))
      return
    }

    setCanvas((at) => ({
      ...at,
      nodes: at.nodes.map((node) =>
        node.id === state.id
          ? { ...node, x: snap(state.originX + dx / view.zoom), y: snap(state.originY + dy / view.zoom) }
          : node
      )
    }))
    setDirty(true)
  }

  const onWheel = (event: React.WheelEvent<HTMLDivElement>): void => {
    const box = surface.current?.getBoundingClientRect()
    if (!box) return

    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1
    const zoom = Math.min(ZOOM_LIMITS.max, Math.max(ZOOM_LIMITS.min, view.zoom * factor))

    // Zoom about the pointer, so the card under it stays under it.
    const px = event.clientX - box.left
    const py = event.clientY - box.top

    setView({
      zoom,
      x: px - ((px - view.x) / view.zoom) * zoom,
      y: py - ((py - view.y) / view.zoom) * zoom
    })
  }

  const fit = (): void => {
    const box = surface.current?.getBoundingClientRect()
    const bounds = canvasBounds(canvas.nodes)
    if (!box || bounds.width === 0) return

    const zoom = Math.min(
      ZOOM_LIMITS.max,
      Math.min((box.width - 80) / bounds.width, (box.height - 80) / bounds.height)
    )

    setView({
      zoom,
      x: box.width / 2 - (bounds.x + bounds.width / 2) * zoom,
      y: box.height / 2 - (bounds.y + bounds.height / 2) * zoom
    })
  }

  const addCard = (): void => {
    const box = surface.current?.getBoundingClientRect()
    const centre = box ? toScene(box.left + box.width / 2, box.top + box.height / 2) : { x: 0, y: 0 }

    const card: CanvasNode = {
      id: nextNodeId(canvas),
      type: 'text',
      x: snap(centre.x - 100),
      y: snap(centre.y - 60),
      width: 200,
      height: 120,
      text: t('canvas.newCard')
    }

    setCanvas((at) => ({ ...at, nodes: [...at.nodes, card] }))
    setSelected(card.id)
    setDirty(true)
  }

  const byId = new Map(canvas.nodes.map((node) => [node.id, node]))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('canvas.title')}
      className="fixed inset-0 z-palette flex flex-col bg-app"
    >
      <div className="mc-no-drag flex flex-none items-center justify-between border-b border-line px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Shapes size={15} className="text-ink-tertiary" />
          {canvasFilePath() ?? t('canvas.title')}
          {dirty ? <span className="text-ink-tertiary">•</span> : null}
        </span>

        <span className="flex items-center gap-1">
          <span className="pr-1 text-xs tabular-nums text-ink-tertiary">
            {canvas.nodes.length} · {Math.round(view.zoom * 100)}%
          </span>
          <Button size="sm" variant="secondary" onClick={addCard}>
            <Plus size={13} />
            {t('canvas.addCard')}
          </Button>
          <IconButton icon={<Expand size={15} />} label={t('canvas.fit')} onClick={fit} />
          <IconButton icon={<Save size={15} />} label={t('common.save')} onClick={() => void save()} />
          <IconButton icon={<X size={15} />} label={t('common.close')} onClick={onClose} />
        </span>
      </div>

      <div
        ref={surface}
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          drag.current = null
        }}
        onWheel={onWheel}
        className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden bg-sunken select-none"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner label={t('canvas.reading')} />
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
              transformOrigin: '0 0'
            }}
            className="absolute inset-0"
          >
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
            </svg>

            {canvas.nodes.map((node) => (
              <div
                key={node.id}
                style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                className={cx(
                  'absolute overflow-hidden rounded-lg border p-2.5',
                  node.type === 'group'
                    ? 'border-dashed border-line bg-transparent'
                    : 'border-line bg-app shadow-sm',
                  selected === node.id ? 'ring-2 ring-accent' : ''
                )}
              >
                {node.type === 'group' ? (
                  <span className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
                    {node.label ?? ''}
                  </span>
                ) : node.type === 'file' ? (
                  <span className="text-xs text-ink-secondary">{node.file}</span>
                ) : node.type === 'link' ? (
                  <span className="text-xs break-all text-ink-secondary">{node.url}</span>
                ) : (
                  <article className="mc-document mc-canvas-card">
                    {renderMarkdown(node.text ?? '', { baseDir: null, gfm: true, highlight: false })}
                  </article>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
