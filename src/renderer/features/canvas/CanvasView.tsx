// ── @lib ───────────────────────────────────────────────────────────────────
import {
  Expand,
  Grid2x2,
  Plus,
  Redo2,
  Save,
  Shapes,
  Type,
  Undo2,
  Users,
  X,
  ZoomIn,
  ZoomOut
} from '@icons'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement
} from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  alignNodes,
  alignText,
  basename,
  canvasToMarkdown,
  bringToFront,
  colorSelection,
  connect,
  distributeNodes,
  duplicateNodes,
  findInCanvas,
  fitToContent,
  gridLayout,
  groupAround,
  inPaintOrder,
  labelEdge,
  moveNodes,
  nextNodeId,
  nodeAt,
  nodesInside,
  extensionOf,
  IMAGE_EXTENSIONS,
  joinPath,
  relativeFrom,
  removeNodes,
  resizeNode,
  sendToBack,
  shapeNodes,
  snap,
  type Alignment,
  type CanvasShape,
  type CanvasNode,
  type Side
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { appService, fileService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { openPath } from '@features/documents'
import { SessionCursors, SessionDialog, SessionSelections, useSession } from '@features/session'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useKeyboardClaim } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, IconButton, Spinner } from '@ui'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { copyNodes, hasClipping, pasteInto } from './canvas-clipboard'
import { canvasTarget } from './canvas-store'
import { CanvasMinimap } from './CanvasMinimap'
import { CanvasCard } from './CanvasCard'
import { CanvasEdges } from './CanvasEdges'
import { CanvasFind } from './CanvasFind'
import { CanvasToolbar } from './CanvasToolbar'
import { CardFormatBar } from './CardFormatBar'
import { useCanvasDocument } from './useCanvasDocument'
import { useCanvasMenu } from './useCanvasMenu'
import { useCanvasSelection } from './useCanvasSelection'
import { useCanvasViewport } from './useCanvasViewport'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasGesture, CanvasMenuActions, CardDraft } from './types'

/** Below this the drag was a click that wobbled, not an attempt to draw a box. */
const MARQUEE_THRESHOLD = 4

/**
 * A second press counts as a double-click within this long, and this close.
 *
 * Half a second is what Windows uses by default, and matching the platform
 * means the gesture feels the same here as it does everywhere else on the
 * machine.
 *
 * Recognised here rather than by listening for `dblclick`, because the surface
 * takes pointer capture on press — and a captured pointer sends its derived
 * click events to the element holding the capture, not to whatever is under it.
 * The card's own `ondblclick` therefore never fired, and double-clicking a card
 * did nothing at all.
 */
const DOUBLE_PRESS_MS = 500
const DOUBLE_PRESS_SLOP = 6

/** An image dropped on the canvas gets a card shaped to show it. */
const IMAGE_SET = new Set<string>(IMAGE_EXTENSIONS)

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
  const { canvas, dirty, loading, canUndo, canRedo, edit, replace, undo, redo, save } =
    useCanvasDocument(path)
  const { view, setView, toScene, zoomAt, fit } = useCanvasViewport(surface)
  const { selection, isNodeSelected, clear, selectNode, selectEdge, selectNodes, prune } =
    useCanvasSelection()

  const [editing, setEditing] = useState<string | null>(null)

  /** Read from pointer handlers, for the same reason the draft is. */
  const editingRef = useRef<string | null>(null)
  editingRef.current = editing

  /*
   * What is being written, while it is being written.
   *
   * Held here rather than inside the card, because the formatting bar is docked
   * to the surface — it has to see the text and the selection, and the card has
   * to take back what the bar changed.
   */
  const [draft, setDraft] = useState<CardDraft | null>(null)

  /*
   * Read by `stopEditing`, which runs from a pointer handler — where the state
   * of this render is already a frame behind what the field holds.
   */
  const draftRef = useRef<CardDraft | null>(null)
  draftRef.current = draft
  const [gesture, setGesture] = useState<CanvasGesture | null>(null)
  const [grid, setGrid] = useState(true)

  /** What is being looked for on the canvas, if anything. */
  const [finding, setFinding] = useState<string | null>(null)

  /*
   * Matches are marked on the canvas itself rather than listed beside it. A
   * card's answer to "where is it" is where it is, and a list would make
   * somebody read the same names twice and then hunt for them anyway.
   */
  const found = useMemo(
    () => (finding === null ? [] : findInCanvas(canvas, finding)),
    [canvas, finding]
  )
  const foundIds = useMemo(() => new Set(found.map((node) => node.id)), [found])

  // While the canvas is up, the application's own accelerators stand aside.
  useKeyboardClaim(path !== null)
  const [sharingOpen, setSharingOpen] = useState(false)

  /** The previous press, for recognising the second one of a double-click. */
  const lastPressRef = useRef<{ id: string | null; at: number; x: number; y: number } | null>(null)

  /**
   * A card a second press landed on, waiting for the button to come up.
   *
   * Carries where the press was, rather than reading it back from the last
   * press — which is cleared at that moment, so the first jitter of a real
   * mouse looked like the pointer walking away and cancelled the open.
   */
  const pendingOpenRef = useRef<{ id: string; x: number; y: number } | null>(null)

  /*
   * The right button acts on what is under it, using whatever the view can do
   * at the moment the menu opens — held in a ref so this hook sits with the
   * others rather than below the early return.
   */
  const menuActionsRef = useRef<CanvasMenuActions | null>(null)
  const openMenu = useCanvasMenu(menuActionsRef)

  const root = useAppSelector((state) => state.workspace.root)

  const session = useSession(useCallback((incoming) => replace(incoming), [replace]))

  const close = useCallback((): void => canvasTarget.close(), [])

  /**
   * Follows a file or link card.
   *
   * A file opens as a document, which closes the canvas — the tab it lands in
   * is behind it, and leaving the canvas over the top would look like nothing
   * had happened. A link goes to the browser and the canvas stays, because
   * nothing in the application changed.
   */
  const follow = useCallback(
    (node: CanvasNode): void => {
      if (node.type === 'link' && node.url) {
        void appService.openExternal(node.url)
        return
      }

      if (node.type === 'file' && node.file) {
        if (!root) {
          toast.warning(t('canvas.needsFolder'))
          return
        }
        canvasTarget.close()
        void openPath(joinPath(root, node.file))
      }
    },
    [root, t]
  )

  useEffect(() => {
    clear()
    setEditing(null)
  }, [path, clear])

  // Undo can bring a deleted card back, and delete can take a selected one
  // away. Either way the selection has to stop naming things that are not there.
  useEffect(() => {
    prune(canvas.nodes, new Set(canvas.edges.map((edge) => edge.id)))
  }, [canvas, prune])

  /*
   * Everything a local edit changes is published. Hooked here rather than at
   * each call site because there are eleven of them, and one that forgot would
   * be a change everyone else silently never saw.
   */
  useEffect(() => {
    session.publish(canvas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas])

  useEffect(() => {
    session.announce(selection.nodes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.nodes])

  /**
   * Puts what was written into the card, and closes the editor.
   *
   * The view does this rather than the field's own blur, because clicking away
   * unmounts the field — and an unmounted field's blur is not a thing that can
   * be relied on to have run first. The edit was lost every time somebody
   * clicked back onto the canvas, which is how anyone finishes writing.
   */
  const stopEditing = useCallback((): void => {
    const id = editingRef.current
    const written = draftRef.current

    setEditing(null)
    setDraft(null)
    if (id === null || written === null) return

    edit((at) => ({
      ...at,
      nodes: at.nodes.map((node) => {
        if (node.id !== id) return node
        if (node.type === 'group') {
          return node.label === written.text ? node : { ...node, label: written.text }
        }
        return node.text === written.text ? node : { ...node, text: written.text }
      })
    }))
  }, [edit])

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

  const arrange = useCallback(
    (how: Alignment): void => {
      edit((at) => alignNodes(at, selection.nodes, how))
    },
    [edit, selection.nodes]
  )

  const spread = useCallback(
    (axis: 'x' | 'y'): void => {
      edit((at) => distributeNodes(at, selection.nodes, axis))
    },
    [edit, selection.nodes]
  )

  const restack = useCallback(
    (where: 'front' | 'back'): void => {
      edit((at) =>
        where === 'front' ? bringToFront(at, selection.nodes) : sendToBack(at, selection.nodes)
      )
    },
    [edit, selection.nodes]
  )

  const copySelected = useCallback((): void => {
    const copied = copyNodes(canvas, selection.nodes)
    if (copied > 0) toast.info(t('canvas.copied', { count: copied }))
  }, [canvas, selection.nodes, t])

  const cutSelected = useCallback((): void => {
    if (copyNodes(canvas, selection.nodes) === 0) return
    edit((at) => removeNodes(at, selection.nodes))
    clear()
  }, [canvas, selection.nodes, edit, clear])

  /**
   * Pastes at the pointer when there is one.
   *
   * That is where the person is looking, and a paste that lands somewhere off
   * screen looks exactly like a paste that did nothing.
   */
  const pasteHere = useCallback(
    (clientX?: number, clientY?: number): void => {
      if (!hasClipping()) return

      const at =
        clientX !== undefined && clientY !== undefined ? toScene(clientX, clientY) : null

      let created: string[] = []
      edit((current) => {
        const result = pasteInto(current, at)
        created = result.ids
        return result.canvas
      })
      if (created.length > 0) selectNodes(created)
    },
    [edit, selectNodes, toScene]
  )

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
      /*
       * A card being written in takes the keys that belong to writing, and
       * gives up the ones that belong to the canvas. Formatting is handled here
       * rather than on the field itself so every shortcut the canvas answers
       * to is decided in one place.
       */
      // A card being written in owns the keyboard: the editor inside it answers
      // Ctrl+B and the rest itself, the same as the document editor does.
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

      if (mod && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setFinding((current) => (current === null ? '' : current))
        return
      }

      if (mod && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        copySelected()
        return
      }

      if (mod && event.key.toLowerCase() === 'x') {
        event.preventDefault()
        cutSelected()
        return
      }

      if (mod && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        pasteHere()
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

      // Enter opens the selected card, the way it opens a row in the explorer:
      // for writing if it holds writing, and by going there if it is a
      // reference. This is also the only way to reach a file card without a
      // pointer.
      if (event.key === 'Enter' && selection.nodes.length === 1) {
        const node = canvas.nodes.find((candidate) => candidate.id === selection.nodes[0])
        if (node) {
          event.preventDefault()
          if (node.type === 'text' || node.type === 'group') setEditing(node.id)
          else follow(node)
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
    follow,
    selectNodes,
    removeSelected,
    duplicateSelected,
    copySelected,
    cutSelected,
    pasteHere,
    nudge
  ])

  if (path === null) return null

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    const point = toScene(event.clientX, event.clientY)
    const hit = nodeAt(canvas.nodes, point.x, point.y)

    if (editing !== null && hit?.id !== editing) stopEditing()
    event.currentTarget.setPointerCapture(event.pointerId)

    const last = lastPressRef.current
    lastPressRef.current = { id: hit?.id ?? null, at: event.timeStamp, x: event.clientX, y: event.clientY }

    const secondPress =
      hit !== null &&
      last !== null &&
      last.id === hit.id &&
      event.timeStamp - last.at < DOUBLE_PRESS_MS &&
      Math.abs(event.clientX - last.x) < DOUBLE_PRESS_SLOP &&
      Math.abs(event.clientY - last.y) < DOUBLE_PRESS_SLOP

    if (secondPress) {
      /*
       * Noted now, acted on when the button comes up.
       *
       * Opening here put a text field on screen in the middle of the browser's
       * own press sequence — and the focus change that follows a mousedown then
       * blurred it, which commits and closes. The card flashed into an editor
       * and straight back out, and nothing in the interface said why.
       */
      lastPressRef.current = null
      pendingOpenRef.current = { id: hit.id, x: event.clientX, y: event.clientY }
      setGesture(null)
      return
    }

    pendingOpenRef.current = null

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
    // Reported whether or not a gesture is in progress: a cursor that only
    // appears while somebody is dragging says nothing about where they are
    // thinking of working next.
    const where = toScene(event.clientX, event.clientY)
    session.report(where.x, where.y)

    // A double-click the pointer walked away from was a drag all along.
    const pending = pendingOpenRef.current
    if (pending !== null && event.buttons !== 0) {
      const moved =
        Math.abs(event.clientX - pending.x) > DOUBLE_PRESS_SLOP ||
        Math.abs(event.clientY - pending.y) > DOUBLE_PRESS_SLOP
      if (moved) pendingOpenRef.current = null
    }

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
    const opening = pendingOpenRef.current
    pendingOpenRef.current = null

    if (opening !== null) {
      const node = canvas.nodes.find((candidate) => candidate.id === opening.id)
      if (node) {
        openNode(node)
        setGesture(null)
        return
      }
    }

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

  const addCard = (shape?: CanvasShape): void => {
    const box = surface.current?.getBoundingClientRect()
    const centre = box ? toScene(box.left + box.width / 2, box.top + box.height / 2) : { x: 0, y: 0 }

    // Writing on the canvas is wider and shorter than a card: it is a line or
    // two of text, not a box of notes.
    const bare = shape === 'plain'
    const width = bare ? 320 : 200
    const height = bare ? 60 : 120

    const card: CanvasNode = {
      id: nextNodeId(canvas),
      type: 'text',
      x: snap(centre.x - width / 2),
      y: snap(centre.y - height / 2),
      width,
      height,
      text: bare ? '' : t('canvas.newCard'),
      ...(shape ? { shape } : {})
    }

    edit((at) => ({ ...at, nodes: [...at.nodes, card] }))
    selectNodes([card.id])

    // Straight into the editor: a card that says "New card" is never what was
    // wanted, and making the user find the double-click first is a step for
    // nothing.
    setEditing(card.id)
  }

  /**
   * A file dropped from the explorer becomes a card that points at it.
   *
   * The same drag the tree already offers for moving files, read rather than
   * intercepted — nothing about the explorer had to change for the canvas to
   * accept what it was already handing out. The path is stored relative to the
   * workspace, because that is what the format carries and what keeps a canvas
   * working when the folder moves.
   */
  const dropFiles = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()

    const raw = event.dataTransfer.getData('application/x-markcraft-paths')
    if (!raw || !root) return

    let paths: string[] = []
    try {
      paths = JSON.parse(raw) as string[]
    } catch {
      return
    }

    const point = toScene(event.clientX, event.clientY)
    const created: string[] = []

    edit((at) => {
      let next = at
      paths.forEach((absolute, index) => {
        const relative = relativeFrom(root, absolute)
        if (relative === null) return

        const image = IMAGE_SET.has(extensionOf(relative))
        const card: CanvasNode = {
          id: nextNodeId(next),
          type: 'file',
          // Fanned out, so five files dropped together do not land in a stack.
          x: snap(point.x - 100 + index * 30),
          y: snap(point.y - 60 + index * 30),
          width: image ? 240 : 200,
          height: image ? 180 : 80,
          file: relative
        }
        created.push(card.id)
        next = { ...next, nodes: [...next.nodes, card] }
      })
      return next
    })

    if (created.length > 0) selectNodes(created)
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

  /**
   * What a double-click on a card means.
   *
   * Text and groups carry writing the user can change; a file or link card is
   * a reference, and the useful thing to do with it is go there.
   */
  const openNode = (node: CanvasNode): void => {
    if (node.type === 'text' || node.type === 'group') {
      selectNodes([node.id])
      setEditing(node.id)
      return
    }
    follow(node)
  }

  /**
   * Writes the canvas out as a document, beside the canvas itself.
   *
   * A new file rather than a replacement: the canvas is still the canvas, and
   * somebody who wanted it turned into prose wanted both.
   */
  const writeUp = async (): Promise<void> => {
    const target = path.replace(/.canvas$/i, '.md')
    const markdown = canvasToMarkdown(canvas, { title: basename(path).replace(/.canvas$/i, '') })

    try {
      await fileService.write({ path: target, content: markdown, eol: 'lf' })
      toast.success(t('canvas.wroteUp'), basename(target))
      canvasTarget.close()
      void openPath(target)
    } catch (error) {
      toast.error(t('canvas.writeUpFailed'), error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * Grows the chosen cards to fit what they hold.
   *
   * Grows only: shrinking a card somebody sized by hand would undo a decision
   * they made, and "it got smaller when I deleted a word" is a surprise nobody
   * wants from a layout tool.
   */
  const fitCards = (): void => {
    const chosen = selection.nodes.length > 0 ? selection.nodes : canvas.nodes.map((n) => n.id)
    edit((at) => fitToContent(at, chosen))
  }

  const tidy = (): void => {
    const chosen = selection.nodes.length > 1 ? selection.nodes : canvas.nodes.map((n) => n.id)
    edit((at) => gridLayout(at, chosen))
  }

  const addCardAt = (clientX: number, clientY: number, shape?: CanvasShape): void => {
    const point = toScene(clientX, clientY)
    const bare = shape === 'plain'
    const width = bare ? 320 : 200
    const height = bare ? 60 : 120

    const card: CanvasNode = {
      id: nextNodeId(canvas),
      type: 'text',
      x: snap(point.x - width / 2),
      y: snap(point.y - height / 2),
      width,
      height,
      text: bare ? '' : t('canvas.newCard'),
      ...(shape ? { shape } : {})
    }

    edit((at) => ({ ...at, nodes: [...at.nodes, card] }))
    selectNodes([card.id])
    setEditing(card.id)
  }

  const zoomAtCentre = (factor: number): void => {
    const box = surface.current?.getBoundingClientRect()
    if (!box) return
    zoomAt(box.left + box.width / 2, box.top + box.height / 2, factor)
  }

  menuActionsRef.current = {
    open: (node) => openNode(node),
    colour: (colour) => edit((at) => colorSelection(at, selection.nodes, selection.edges, colour)),
    shape: (shape: CanvasShape) => edit((at) => shapeNodes(at, selection.nodes, shape)),
    align: (align, valign) => edit((at) => alignText(at, selection.nodes, align, valign)),
    copy: copySelected,
    cut: cutSelected,
    paste: pasteHere,
    canPaste: hasClipping,
    duplicate: duplicateSelected,
    remove: removeSelected,
    group: addGroup,
    restack,
    addHere: addCardAt,
    writeUp: () => void writeUp(),
    fitCards,
    find: () => setFinding(''),
    tidy,
    addTextHere: (x, y) => addCardAt(x, y, 'plain'),
    selectAll: () => selectNodes(canvas.nodes.map((node) => node.id)),
    fit: () => fit(canvas.nodes)
  }

  /*
   * Pressing the right button over a card that is not selected selects it
   * first — otherwise the menu would offer to delete something other than the
   * card it opened on, which is how people lose work.
   */
  const onContextMenu = (event: React.MouseEvent<HTMLDivElement>): void => {
    const point = toScene(event.clientX, event.clientY)
    const hit = nodeAt(canvas.nodes, point.x, point.y)

    if (hit && !isNodeSelected(hit.id)) selectNodes([hit.id])
    if (!hit) clear()

    openMenu(event, hit)
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
            {t('canvas.cardCount', { count: canvas.nodes.length })}
          </span>

          {/*
           * Zoomed about the middle of the window rather than the origin, so
           * whatever is being looked at stays being looked at.
           */}
          <IconButton
            icon={<ZoomOut size={15} />}
            label={t('canvas.zoomOut')}
            onClick={() => zoomAtCentre(1 / 1.25)}
          />
          <button
            type="button"
            aria-label={t('canvas.resetZoom')}
            title={t('canvas.resetZoom')}
            onClick={() => setView((at) => ({ ...at, zoom: 1 }))}
            className="min-w-[3.25rem] rounded-md px-1 py-1 text-xs tabular-nums text-ink-tertiary hover:bg-hover focus-visible:shadow-focus focus-visible:outline-none"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <IconButton
            icon={<ZoomIn size={15} />}
            label={t('canvas.zoomIn')}
            onClick={() => zoomAtCentre(1.25)}
          />

          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => addCard()}>
            {t('canvas.addCard')}
          </Button>

          <IconButton
            icon={<Type size={15} />}
            label={t('canvas.addText')}
            onClick={() => addCard('plain')}
          />

          <IconButton
            icon={<Users size={15} />}
            label={t('session.title')}
            active={session.state.role !== 'off'}
            onClick={() => setSharingOpen(true)}
          />
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
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes('application/x-markcraft-paths')) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={dropFiles}
        onContextMenu={onContextMenu}
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
                  matched={foundIds.has(node.id)}
                  editing={editing === node.id}
                  zoom={view.zoom}
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
                  draft={editing === node.id ? draft : null}
                  onDraft={setDraft}
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

              <SessionSelections participants={session.state.participants} nodes={canvas.nodes} />
              <SessionCursors participants={session.state.participants} zoom={view.zoom} />

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

            <SessionDialog
              open={sharingOpen}
              onClose={() => setSharingOpen(false)}
              canvas={canvas}
              path={path}
              state={session.state}
            />

            <CanvasMinimap
              canvas={canvas}
              view={view}
              surface={surface}
              onJump={(x, y) => setView((at) => ({ ...at, x, y }))}
            />

            {/*
              * Docked at the top while a card is being written in, mirroring the
              * selection toolbar at the bottom: always in the same place, never
              * over the thing it acts on, and never clipped by the header.
              */}
            {finding !== null ? (
              <CanvasFind
                query={finding}
                count={found.length}
                onQuery={setFinding}
                onClose={() => setFinding(null)}
                onGo={() => {
                  if (found.length === 0) return
                  selectNodes(found.map((node) => node.id))
                  fit(found)
                }}
              />
            ) : null}

            {editing !== null ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
                <CardFormatBar />
              </div>
            ) : null}

            <CanvasToolbar
              selection={selection}
              canvas={canvas}
              onAlign={arrange}
              onDistribute={spread}
              onRestack={restack}
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
