// ── @lib ───────────────────────────────────────────────────────────────────
import { Expand, Group, Plus, Save, Shapes, Undo2, X } from '@icons'
import { useEffect, useRef, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  connect,
  groupAround,
  inPaintOrder,
  nextNodeId,
  nodeAt,
  removeNode,
  resizeNode,
  snap,
  type CanvasNode,
  type Side
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, IconButton, Spinner } from '@ui'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { canvasFilePath } from './canvas-actions'
import { CanvasCard } from './CanvasCard'
import { CanvasEdges } from './CanvasEdges'
import { useCanvasDocument } from './useCanvasDocument'
import { useCanvasViewport } from './useCanvasViewport'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasGesture, CanvasViewProps } from './types'

/**
 * The canvas surface.
 *
 * The pointer does four different things here — panning, moving a card,
 * resizing one and drawing a line between two — and which one is in progress is
 * held in a single value rather than four booleans. A gesture that cannot be
 * two things at once should not be able to represent being two things at once.
 */
export function CanvasView({ open, onClose }: CanvasViewProps): ReactElement | null {
  const t = useT()

  const surface = useRef<HTMLDivElement>(null)
  const { canvas, dirty, loading, canUndo, edit, undo, save } = useCanvasDocument(open)
  const { view, setView, toScene, zoomAt, fit } = useCanvasViewport(surface)

  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [gesture, setGesture] = useState<CanvasGesture | null>(null)

  useEffect(() => {
    if (!open) return
    setSelected(null)
    setEditing(null)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent): void => {
      // A card being written in owns the keyboard. The editor stops these
      // before they reach the window; this is the belt to that braces.
      if (editing) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      const mod = event.ctrlKey || event.metaKey

      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
        return
      }

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
        return
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
        event.preventDefault()
        edit((at) => removeNode(at, selected))
        setSelected(null)
        return
      }

      // Enter opens the selected card, the way it opens a row in the explorer.
      if (event.key === 'Enter' && selected) {
        const node = canvas.nodes.find((candidate) => candidate.id === selected)
        if (node?.type === 'text' || node?.type === 'group') {
          event.preventDefault()
          setEditing(selected)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, save, undo, edit, selected, editing, canvas.nodes])

  if (!open) return null

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const point = toScene(event.clientX, event.clientY)
    const hit = nodeAt(canvas.nodes, point.x, point.y)

    if (editing !== null && hit?.id !== editing) setEditing(null)
    setSelected(hit?.id ?? null)
    event.currentTarget.setPointerCapture(event.pointerId)

    setGesture(
      hit
        ? {
            kind: 'move',
            id: hit.id,
            startX: event.clientX,
            startY: event.clientY,
            originX: hit.x,
            originY: hit.y
          }
        : {
            kind: 'pan',
            startX: event.clientX,
            startY: event.clientY,
            originX: view.x,
            originY: view.y
          }
    )
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!gesture) return

    if (gesture.kind === 'link') {
      const point = toScene(event.clientX, event.clientY)
      setGesture({ ...gesture, toX: point.x, toY: point.y })
      return
    }

    if (gesture.kind === 'pan') {
      setView((at) => ({
        ...at,
        x: gesture.originX + (event.clientX - gesture.startX),
        y: gesture.originY + (event.clientY - gesture.startY)
      }))
      return
    }

    const dx = (event.clientX - gesture.startX) / view.zoom
    const dy = (event.clientY - gesture.startY) / view.zoom

    if (gesture.kind === 'resize') {
      // Coalesced: the whole drag is one thing to undo, not one step per pixel.
      edit(
        (at) => ({
          ...at,
          nodes: at.nodes.map((node) =>
            node.id === gesture.id ? resizeNode(node, gesture.width + dx, gesture.height + dy) : node
          )
        }),
        true
      )
      return
    }

    edit(
      (at) => ({
        ...at,
        nodes: at.nodes.map((node) =>
          node.id === gesture.id
            ? { ...node, x: snap(gesture.originX + dx), y: snap(gesture.originY + dy) }
            : node
        )
      }),
      true
    )
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    // A line only becomes an edge if it was let go over another card.
    if (gesture?.kind === 'link') {
      const point = toScene(event.clientX, event.clientY)
      const target = nodeAt(canvas.nodes, point.x, point.y)
      if (target) edit((at) => connect(at, gesture.id, target.id))
    }

    setGesture(null)
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

    edit((at) => ({ ...at, nodes: [...at.nodes, card] }))
    setSelected(card.id)

    // Straight into the editor: a card that says "New card" is never what was
    // wanted, and making the user find the double-click first is a step for
    // nothing.
    setEditing(card.id)
  }

  const addGroup = (): void => {
    const around = canvas.nodes.filter((node) => node.id === selected && node.type !== 'group')
    const box = surface.current?.getBoundingClientRect()

    // Around the selected card if there is one, otherwise a default rectangle
    // in the middle of what the user is looking at.
    let bounds = groupAround(around)
    if (around.length === 0) {
      const centre = box
        ? toScene(box.left + box.width / 2, box.top + box.height / 2)
        : { x: 0, y: 0 }
      bounds = { x: snap(centre.x - 160), y: snap(centre.y - 120), width: 320, height: 240 }
    }

    const group: CanvasNode = {
      id: nextNodeId(canvas),
      type: 'group',
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      label: t('canvas.newGroup')
    }

    edit((at) => ({ ...at, nodes: [...at.nodes, group] }))
    setSelected(group.id)
  }

  const linking = gesture?.kind === 'link' ? gesture : null
  const linkingFrom = linking ? canvas.nodes.find((node) => node.id === linking.id) : undefined

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

          <IconButton icon={<Group size={15} />} label={t('canvas.addGroup')} onClick={addGroup} />
          <IconButton
            icon={<Undo2 size={15} />}
            label={t('common.undo')}
            disabled={!canUndo}
            onClick={undo}
          />
          <IconButton
            icon={<Expand size={15} />}
            label={t('canvas.fit')}
            onClick={() => fit(canvas.nodes)}
          />
          <IconButton
            icon={<Save size={15} />}
            label={t('common.save')}
            onClick={() => void save()}
          />
          <IconButton icon={<X size={15} />} label={t('common.close')} onClick={onClose} />
        </span>
      </div>

      <div
        ref={surface}
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={(event) => zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.1 : 1 / 1.1)}
        className="relative min-h-0 flex-1 cursor-grab touch-none select-none overflow-hidden bg-sunken"
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
            <CanvasEdges
              canvas={canvas}
              pending={
                linking && linkingFrom
                  ? {
                      from: linkingFrom,
                      side: linking.side,
                      toX: linking.toX,
                      toY: linking.toY
                    }
                  : null
              }
            />

            {inPaintOrder(canvas.nodes).map((node) => (
              <CanvasCard
                key={node.id}
                node={node}
                selected={selected === node.id}
                editing={editing === node.id}
                zoom={view.zoom}
                onStartEdit={() => setEditing(node.id)}
                onCancelEdit={() => setEditing(null)}
                onCommitEdit={(text) => {
                  setEditing(null)
                  edit((at) => ({
                    ...at,
                    nodes: at.nodes.map((candidate) =>
                      candidate.id !== node.id
                        ? candidate
                        : node.type === 'group'
                          ? { ...candidate, label: text }
                          : { ...candidate, text }
                    )
                  }))
                }}
                onStartLink={(side: Side, event) => {
                  const point = toScene(event.clientX, event.clientY)
                  setSelected(node.id)
                  setGesture({ kind: 'link', id: node.id, side, toX: point.x, toY: point.y })
                }}
                onStartResize={(event) => {
                  setSelected(node.id)
                  setGesture({
                    kind: 'resize',
                    id: node.id,
                    startX: event.clientX,
                    startY: event.clientY,
                    width: node.width,
                    height: node.height
                  })
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
