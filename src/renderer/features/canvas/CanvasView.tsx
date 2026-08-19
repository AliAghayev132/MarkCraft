// ── @lib ───────────────────────────────────────────────────────────────────
import { Expand, Grid2x2, Plus, Redo2, Save, Shapes, Undo2, X } from '@icons'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement
} from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  basename,
  colorSelection,
  connect,
  duplicateNodes,
  groupAround,
  inPaintOrder,
  labelEdge,
  moveNodes,
  nextNodeId,
  nodeAt,
  nodesInside,
  removeNodes,
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
import { canvasTarget } from './canvas-store'
import { CanvasCard } from './CanvasCard'
import { CanvasEdges } from './CanvasEdges'
import { CanvasToolbar } from './CanvasToolbar'
import { useCanvasDocument } from './useCanvasDocument'
import { useCanvasSelection } from './useCanvasSelection'
import { useCanvasViewport } from './useCanvasViewport'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasGesture } from './types'

/** Below this the drag was a click that wobbled, not an attempt to draw a box. */
const MARQUEE_THRESHOLD = 4

/**
 * The canvas surface.
 *
 * The pointer does five different things here — panning, moving cards, resizing
 * one, drawing a line between two and dragging a selection box — and which one
 * is in progress is held in a single value rather than five booleans. A gesture
 * that cannot be two things at once should not be able to represent being two
 * things at once.
 */
export function CanvasView(): ReactElement | null {
  const t = useT()

  const path = useSyncExternalStore(
    (listener) => canvasTarget.subscribe(listener),
    () => canvasTarget.get()
  )

  const surface = useRef<HTMLDivElement>(null)
  const { canvas, dirty, loading, canUndo, canRedo, edit, undo, redo, save } =
    useCanvasDocument(path)
  const { view, setView, toScene, zoomAt, fit } = useCanvasViewport(surface)
  const { selection, isNodeSelected, clear, selectNode, selectEdge, selectNodes, prune } =
    useCanvasSelection()

  const [editing, setEditing] = useState<string | null>(null)
  const [gesture, setGesture] = useState<CanvasGesture | null>(null)
  const [grid, setGrid] = useState(true)

  const close = useCallback((): void => canvasTarget.close(), [])

  useEffect(() => {
    clear()
    setEditing(null)
  }, [path, clear])

  // Undo can bring a deleted card back, and delete can take a selected one
  // away. Either way the selection has to stop naming things that are not there.
  useEffect(() => {
    prune(canvas.nodes, new Set(canvas.edges.map((edge) => edge.id)))
  }, [canvas, prune])

  const removeSelected = useCallback((): void => {
    if (selection.nodes.length === 0 && selection.edges.length === 0) return

    const doomed = new Set(selection.edges)
    edit((at) => {
      const withoutNodes = removeNodes(at, selection.nodes)
      return { ...withoutNodes, edges: withoutNodes.edges.filter((edge) => !doomed.has(edge.id)) }
    })
    clear()
  }, [edit, selection, clear])

  const duplicateSelected = useCallback((): void => {
    if (selection.nodes.length === 0) return

    let created: string[] = []
    edit((at) => {
      const result = duplicateNodes(at, selection.nodes)
      created = result.ids
      return result.canvas
    })
    if (created.length > 0) selectNodes(created)
  }, [edit, selection.nodes, selectNodes])

  const nudge = useCallback(
    (dx: number, dy: number): void => {
      if (selection.nodes.length === 0) return

      const chosen = new Set(selection.nodes)
      edit((at) => {
        const moves = new Map(
          at.nodes
            .filter((node) => chosen.has(node.id))
            .map((node) => [node.id, { x: node.x + dx, y: node.y + dy }])
        )
        return moveNodes(at, moves)
      })
    },
    [edit, selection.nodes]
  )

  useEffect(() => {
    if (path === null) return

    const onKey = (event: KeyboardEvent): void => {
      // A card being written in owns the keyboard. The editor stops these
      // before they reach the window; this is the belt to that braces.
      if (editing) return

      const mod = event.ctrlKey || event.metaKey

      if (event.key === 'Escape') {
        event.preventDefault()
        // Escape clears a selection first and only closes the canvas when
        // there is nothing left to clear — leaving is the bigger action.
        if (selection.nodes.length > 0 || selection.edges.length > 0) clear()
        else close()
        return
      }

      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
        return
      }

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }

      if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        duplicateSelected()
        return
      }

      if (mod && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        selectNodes(canvas.nodes.map((node) => node.id))
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeSelected()
        return
      }

      const ARROWS: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
      }
      const arrow = ARROWS[event.key]
      if (arrow && selection.nodes.length > 0) {
        event.preventDefault()
        // Shift takes a bigger step, the way nudging works in every editor.
        const step = event.shiftKey ? 100 : 20
        nudge(arrow[0] * step, arrow[1] * step)
        return
      }

      // Enter opens the selected card, the way it opens a row in the explorer.
      if (event.key === 'Enter' && selection.nodes.length === 1) {
        const node = canvas.nodes.find((candidate) => candidate.id === selection.nodes[0])
        if (node?.type === 'text' || node?.type === 'group') {
          event.preventDefault()
          setEditing(node.id)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    path,
    close,
    save,
    undo,
    redo,
    editing,
    canvas.nodes,
    selection,
    clear,
    selectNodes,
    removeSelected,
    duplicateSelected,
    nudge
  ])

  if (path === null) return null

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const point = toScene(event.clientX, event.clientY)
    const hit = nodeAt(canvas.nodes, point.x, point.y)

    if (editing !== null && hit?.id !== editing) setEditing(null)
    event.currentTarget.setPointerCapture(event.pointerId)

    if (!hit) {
      if (!event.shiftKey) clear()
      // The middle button and space-drag pan; a plain drag on empty canvas
      // draws a selection box, which is what a canvas is expected to do.
      setGesture(
        event.button === 1 || event.altKey
          ? {
              kind: 'pan',
              startX: event.clientX,
              startY: event.clientY,
              originX: view.x,
              originY: view.y
            }
          : {
              kind: 'marquee',
              fromX: point.x,
              fromY: point.y,
              toX: point.x,
              toY: point.y,
              additive: event.shiftKey
            }
      )
      return
    }

    const alreadyIn = isNodeSelected(hit.id)
    if (!alreadyIn || event.shiftKey) selectNode(hit.id, event.shiftKey)

    /*
     * Everything that will travel: the cards the user selected, plus the
     * contents of any group among them. Captured now rather than recomputed
     * each frame, so a card cannot drift out of a group's reach mid-drag.
     */
    const travelling = new Map<string, { x: number; y: number }>()
    const carry = (node: CanvasNode): void => {
      travelling.set(node.id, { x: node.x, y: node.y })
      if (node.type === 'group') {
        for (const inside of nodesInside(canvas.nodes, node)) {
          travelling.set(inside.id, { x: inside.x, y: inside.y })
        }
      }
    }

    const dragging =
      alreadyIn && !event.shiftKey
        ? canvas.nodes.filter((node) => isNodeSelected(node.id))
        : [hit]
    for (const node of dragging) carry(node)

    setGesture({
      kind: 'move',
      origins: travelling,
      startX: event.clientX,
      startY: event.clientY
    })
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!gesture) return

    if (gesture.kind === 'link' || gesture.kind === 'marquee') {
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

    const moves = new Map(
      [...gesture.origins].map(([id, origin]) => [id, { x: origin.x + dx, y: origin.y + dy }])
    )
    edit((at) => moveNodes(at, moves), true)
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    // A line only becomes an edge if it was let go over another card.
    if (gesture?.kind === 'link') {
      const point = toScene(event.clientX, event.clientY)
      const target = nodeAt(canvas.nodes, point.x, point.y)
      if (target) edit((at) => connect(at, gesture.id, target.id))
    }

    if (gesture?.kind === 'marquee') {
      const box = marqueeBox(gesture)
      if (box.width >= MARQUEE_THRESHOLD || box.height >= MARQUEE_THRESHOLD) {
        const caught = canvas.nodes
          .filter(
            (node) =>
              node.x < box.x + box.width &&
              node.x + node.width > box.x &&
              node.y < box.y + box.height &&
              node.y + node.height > box.y
          )
          .map((node) => node.id)

        selectNodes(gesture.additive ? [...new Set([...selection.nodes, ...caught])] : caught)
      }
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
    selectNodes([card.id])

    // Straight into the editor: a card that says "New card" is never what was
    // wanted, and making the user find the double-click first is a step for
    // nothing.
    setEditing(card.id)
  }

  const addGroup = (): void => {
    const chosen = new Set(selection.nodes)
    const around = canvas.nodes.filter((node) => chosen.has(node.id) && node.type !== 'group')
    const box = surface.current?.getBoundingClientRect()

    // Around the selection if there is one, otherwise a default rectangle in
    // the middle of what the user is looking at.
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
    selectNodes([group.id])
  }

  const linking = gesture?.kind === 'link' ? gesture : null
  const linkingFrom = linking ? canvas.nodes.find((node) => node.id === linking.id) : undefined
  const marquee = gesture?.kind === 'marquee' ? marqueeBox(gesture) : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('canvas.title')}
      className="fixed inset-0 z-palette flex flex-col bg-app"
    >
      <div className="mc-no-drag flex flex-none items-center justify-between gap-3 border-b border-line px-3 py-2">
        {/*
         * The name, not the path. A canvas several folders deep produced a
         * title wide enough to crush the toolbar beside it; the full path is
         * still there on hover, where it costs nothing.
         */}
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
          <Shapes size={15} className="flex-none text-ink-tertiary" />
          <span className="min-w-0 truncate" title={path}>
            {basename(path)}
          </span>
          {dirty ? <span className="flex-none text-ink-tertiary">•</span> : null}
        </span>

        <span className="flex flex-none items-center gap-1">
          <span className="pr-1 text-xs tabular-nums text-ink-tertiary">
            {canvas.nodes.length} · {Math.round(view.zoom * 100)}%
          </span>

          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addCard}>
            {t('canvas.addCard')}
          </Button>

          <IconButton
            icon={<Grid2x2 size={15} />}
            label={t('canvas.grid')}
            active={grid}
            onClick={() => setGrid((on) => !on)}
          />
          <IconButton
            icon={<Undo2 size={15} />}
            label={t('common.undo')}
            shortcut="mod+z"
            disabled={!canUndo}
            onClick={undo}
          />
          <IconButton
            icon={<Redo2 size={15} />}
            label={t('common.redo')}
            shortcut="mod+shift+z"
            disabled={!canRedo}
            onClick={redo}
          />
          <IconButton
            icon={<Expand size={15} />}
            label={t('canvas.fit')}
            onClick={() => fit(canvas.nodes)}
          />
          <IconButton
            icon={<Save size={15} />}
            label={t('common.save')}
            shortcut="mod+s"
            onClick={() => void save()}
          />
          <IconButton icon={<X size={15} />} label={t('common.close')} onClick={close} />
        </span>
      </div>

      <div
        ref={surface}
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={(event) => zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.1 : 1 / 1.1)}
        style={
          grid
            ? {
                // Drawn as a background rather than as elements: a grid over an
                // infinite surface is thousands of lines, and none of them are
                // anything the user can interact with.
                backgroundSize: `${20 * view.zoom}px ${20 * view.zoom}px`,
                backgroundPosition: `${view.x}px ${view.y}px`,
                backgroundImage:
                  'radial-gradient(circle, var(--mc-line-subtle) 1px, transparent 1px)'
              }
            : undefined
        }
        className="relative min-h-0 flex-1 cursor-grab touch-none select-none overflow-hidden bg-sunken"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner label={t('canvas.reading')} />
          </div>
        ) : (
          <>
            <div
              style={{
                transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                transformOrigin: '0 0'
              }}
              className="absolute inset-0"
            >
              <CanvasEdges
                canvas={canvas}
                selected={selection.edges}
                onSelect={(edge, additive) => selectEdge(edge.id, additive)}
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
                  selected={isNodeSelected(node.id)}
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
                    selectNodes([node.id])
                    setGesture({ kind: 'link', id: node.id, side, toX: point.x, toY: point.y })
                  }}
                  onStartResize={(event) => {
                    selectNodes([node.id])
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

              {marquee ? (
                <div
                  role="presentation"
                  style={{
                    left: marquee.x,
                    top: marquee.y,
                    width: marquee.width,
                    height: marquee.height
                  }}
                  className="pointer-events-none absolute rounded-sm border border-accent bg-accent/10"
                />
              ) : null}
            </div>

            <CanvasToolbar
              selection={selection}
              canvas={canvas}
              onColor={(color) =>
                edit((at) => colorSelection(at, selection.nodes, selection.edges, color))
              }
              onDuplicate={duplicateSelected}
              onDelete={removeSelected}
              onGroup={addGroup}
              onLabelEdge={(id, label) => edit((at) => labelEdge(at, id, label))}
            />
          </>
        )}
      </div>
    </div>
  )
}

/** The dragged box, normalised so it works in all four directions. */
function marqueeBox(gesture: {
  fromX: number
  fromY: number
  toX: number
  toY: number
}): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(gesture.fromX, gesture.toX),
    y: Math.min(gesture.fromY, gesture.toY),
    width: Math.abs(gesture.toX - gesture.fromX),
    height: Math.abs(gesture.toY - gesture.fromY)
  }
}
