/**
 * An infinite surface of cards and the lines between them.
 *
 * Stored as JSON Canvas — the open format Obsidian writes and several other
 * editors already read. The same reasoning as `SUMMARY.md` for books: a canvas
 * saved here opens elsewhere, and a canvas made elsewhere opens here. A private
 * format would have been easier to write and would have trapped the user's work
 * inside this application.
 *
 * Everything below is geometry and validation. The dragging, the zooming and
 * the drawing belong to the view; none of them belong in a file that has to be
 * correct.
 */
export type CanvasNodeKind = 'text' | 'file' | 'link' | 'group'

export interface CanvasNode {
  id: string
  type: CanvasNodeKind
  x: number
  y: number
  width: number
  height: number
  /** `text` nodes only — Markdown, rendered like any other document. */
  text?: string
  /** `file` nodes only — workspace-relative. */
  file?: string
  /** `link` nodes only. */
  url?: string
  /** `group` nodes only. */
  label?: string
  color?: string
}

export interface CanvasEdge {
  id: string
  fromNode: string
  toNode: string
  fromSide?: Side
  toSide?: Side
  label?: string
  color?: string
}

export type Side = 'top' | 'right' | 'bottom' | 'left'

/** In drawing order, so the anchor handles round a card always read the same. */
export const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left']

export interface CanvasData {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export const EMPTY_CANVAS: CanvasData = { nodes: [], edges: [] }

const KINDS = new Set<CanvasNodeKind>(['text', 'file', 'link', 'group'])

function isFinitePair(...values: unknown[]): boolean {
  return values.every((value) => typeof value === 'number' && Number.isFinite(value))
}

/**
 * Reads a `.canvas` file.
 *
 * Anything malformed is dropped rather than thrown over: a canvas with one bad
 * node should open with the other twenty, because the alternative is a file the
 * user cannot get back into to fix. Edges pointing at nodes that did not
 * survive go too — an edge to nowhere would draw a line into empty space.
 */
export function parseCanvas(json: string): CanvasData {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return EMPTY_CANVAS
  }

  if (typeof raw !== 'object' || raw === null) return EMPTY_CANVAS
  const source = raw as { nodes?: unknown; edges?: unknown }

  const nodes: CanvasNode[] = (Array.isArray(source.nodes) ? source.nodes : [])
    .filter((node): node is CanvasNode => {
      if (typeof node !== 'object' || node === null) return false
      const candidate = node as Partial<CanvasNode>
      return (
        typeof candidate.id === 'string' &&
        candidate.id !== '' &&
        KINDS.has(candidate.type as CanvasNodeKind) &&
        isFinitePair(candidate.x, candidate.y, candidate.width, candidate.height)
      )
    })
    // A zero-width node cannot be seen, selected or dragged back into shape.
    .map((node) => ({ ...node, width: Math.max(40, node.width), height: Math.max(30, node.height) }))

  const ids = new Set(nodes.map((node) => node.id))

  const edges: CanvasEdge[] = (Array.isArray(source.edges) ? source.edges : []).filter(
    (edge): edge is CanvasEdge => {
      if (typeof edge !== 'object' || edge === null) return false
      const candidate = edge as Partial<CanvasEdge>
      return (
        typeof candidate.id === 'string' &&
        ids.has(candidate.fromNode as string) &&
        ids.has(candidate.toNode as string)
      )
    }
  )

  return { nodes, edges }
}

/** Written back with stable key order, so a moved card is a one-line diff. */
export function serialiseCanvas(canvas: CanvasData): string {
  const nodes = canvas.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    x: Math.round(node.x),
    y: Math.round(node.y),
    width: Math.round(node.width),
    height: Math.round(node.height),
    ...(node.color ? { color: node.color } : {}),
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.file !== undefined ? { file: node.file } : {}),
    ...(node.url !== undefined ? { url: node.url } : {}),
    ...(node.label !== undefined ? { label: node.label } : {})
  }))

  return `${JSON.stringify({ nodes, edges: canvas.edges }, null, 2)}\n`
}

/* ────────────────────────────────────────────────────────────────────────────
 * Geometry
 * ─────────────────────────────────────────────────────────────────────────── */

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** The rectangle every node fits inside — what "zoom to fit" needs. */
export function canvasBounds(nodes: CanvasNode[]): Bounds {
  if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 }

  const left = Math.min(...nodes.map((node) => node.x))
  const top = Math.min(...nodes.map((node) => node.y))
  const right = Math.max(...nodes.map((node) => node.x + node.width))
  const bottom = Math.max(...nodes.map((node) => node.y + node.height))

  return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * The node under a point, topmost first.
 *
 * Later nodes are on top, which is what makes "bring to front" a reorder rather
 * than a z-index to maintain. Groups are only hit when nothing else is there —
 * clicking a card inside a group should take the card.
 */
export function nodeAt(nodes: CanvasNode[], x: number, y: number): CanvasNode | null {
  const inside = (node: CanvasNode): boolean =>
    x >= node.x && x <= node.x + node.width && y >= node.y && y <= node.y + node.height

  for (let at = nodes.length - 1; at >= 0; at--) {
    if (nodes[at].type !== 'group' && inside(nodes[at])) return nodes[at]
  }

  for (let at = nodes.length - 1; at >= 0; at--) {
    if (nodes[at].type === 'group' && inside(nodes[at])) return nodes[at]
  }

  return null
}

/** Where an edge meets a node — the midpoint of the side it leaves from. */
export function anchorOf(node: CanvasNode, side: Side): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: node.x + node.width / 2, y: node.y }
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + node.height }
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 }
    default:
      return { x: node.x + node.width, y: node.y + node.height / 2 }
  }
}

/**
 * The sides two nodes should be joined by when the file does not say.
 *
 * Chosen from which way the gap between them is widest, so a line leaves the
 * side that faces the other card rather than crossing over its own node.
 */
export function bestSides(from: CanvasNode, to: CanvasNode): { from: Side; to: Side } {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2)
  const dy = to.y + to.height / 2 - (from.y + from.height / 2)

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? { from: 'right', to: 'left' } : { from: 'left', to: 'right' }
  }

  return dy > 0 ? { from: 'bottom', to: 'top' } : { from: 'top', to: 'bottom' }
}

/** Rounds a coordinate to the grid, so cards line up without being fiddled. */
export function snap(value: number, grid = 20): number {
  return grid <= 0 ? value : Math.round(value / grid) * grid
}

/** A new id that cannot collide with one already in the canvas. */
export function nextNodeId(canvas: CanvasData): string {
  const used = new Set([...canvas.nodes.map((n) => n.id), ...canvas.edges.map((e) => e.id)])

  let at = canvas.nodes.length + 1
  while (used.has(`n${at}`)) at++

  return `n${at}`
}

/** A new edge id, distinct from every id already in the canvas. */
export function nextEdgeId(canvas: CanvasData): string {
  const used = new Set([...canvas.nodes.map((n) => n.id), ...canvas.edges.map((e) => e.id)])

  let at = canvas.edges.length + 1
  while (used.has(`e${at}`)) at++

  return `e${at}`
}

/**
 * Joins two cards.
 *
 * A card cannot be joined to itself, and a pair already joined is left alone —
 * dragging the same link twice is a slip, not a request for two identical
 * lines stacked on top of each other. The sides are deliberately not stored:
 * leaving them out lets `bestSides` re-choose them every time the cards move,
 * so a line never ends up leaving the far side of its own card.
 */
export function connect(canvas: CanvasData, fromNode: string, toNode: string): CanvasData {
  if (fromNode === toNode) return canvas

  const exists = canvas.edges.some(
    (edge) =>
      (edge.fromNode === fromNode && edge.toNode === toNode) ||
      (edge.fromNode === toNode && edge.toNode === fromNode)
  )
  if (exists) return canvas

  const ids = new Set(canvas.nodes.map((node) => node.id))
  if (!ids.has(fromNode) || !ids.has(toNode)) return canvas

  return {
    ...canvas,
    edges: [...canvas.edges, { id: nextEdgeId(canvas), fromNode, toNode }]
  }
}

/** Removes a node and every line that reached it. */
export function removeNode(canvas: CanvasData, id: string): CanvasData {
  return {
    nodes: canvas.nodes.filter((node) => node.id !== id),
    edges: canvas.edges.filter((edge) => edge.fromNode !== id && edge.toNode !== id)
  }
}

export const MIN_NODE = { width: 80, height: 60 }

/** Resizes from the bottom-right corner, on the grid, never below usable. */
export function resizeNode(node: CanvasNode, width: number, height: number): CanvasNode {
  return {
    ...node,
    width: Math.max(MIN_NODE.width, snap(width)),
    height: Math.max(MIN_NODE.height, snap(height))
  }
}

/**
 * A group rectangle drawn around the given nodes.
 *
 * The padding leaves room for the group's own label above its contents, which
 * is why the top gets more of it than the other three sides.
 */
export function groupAround(nodes: CanvasNode[], padding = 40): Bounds {
  if (nodes.length === 0) return { x: 0, y: 0, width: 320, height: 240 }

  const bounds = canvasBounds(nodes)
  return {
    x: snap(bounds.x - padding),
    y: snap(bounds.y - padding * 1.5),
    width: snap(bounds.width + padding * 2),
    height: snap(bounds.height + padding * 2.5)
  }
}

/**
 * Groups first, so a group added after the cards it surrounds does not cover
 * them. Order within each band is left alone — it is what "bring to front"
 * means, and the file records it.
 */
export function inPaintOrder(nodes: CanvasNode[]): CanvasNode[] {
  return [
    ...nodes.filter((node) => node.type === 'group'),
    ...nodes.filter((node) => node.type !== 'group')
  ]
}
