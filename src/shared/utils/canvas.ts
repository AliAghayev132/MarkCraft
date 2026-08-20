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
  /**
   * What the card is drawn as.
   *
   * Not part of JSON Canvas, which describes rectangles. An extra field is the
   * one way to add this without breaking the promise the format makes: a reader
   * that has never heard of `shape` ignores it and draws a rectangle, which is
   * exactly what the card was before. Nothing is lost anywhere, and a canvas
   * made here still opens elsewhere.
   */
  shape?: CanvasShape
}

/**
 * The shapes a card can take.
 *
 * Few, and each one meaning something people already agree on from every
 * diagram they have ever seen: a rectangle is a thing, an ellipse is a start or
 * an end, a diamond is a decision, a triangle points. A palette of thirty would
 * be a drawing program pretending to be a thinking tool.
 */
export const CANVAS_SHAPES = ['rectangle', 'rounded', 'ellipse', 'diamond', 'triangle'] as const

export type CanvasShape = (typeof CANVAS_SHAPES)[number]

const SHAPES = new Set<string>(CANVAS_SHAPES)

export function isCanvasShape(value: unknown): value is CanvasShape {
  return typeof value === 'string' && SHAPES.has(value)
}

/** Sets — or clears, back to a rectangle — the shape of some cards. */
export function shapeNodes(
  canvas: CanvasData,
  ids: Iterable<string>,
  shape: CanvasShape | undefined
): CanvasData {
  const chosen = new Set(ids)
  if (chosen.size === 0) return canvas

  return {
    ...canvas,
    nodes: canvas.nodes.map((node) => {
      if (!chosen.has(node.id)) return node
      if (shape === undefined || shape === 'rectangle') {
        const { shape: _dropped, ...rest } = node
        return rest
      }
      return { ...node, shape }
    })
  }
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
    // A colour that is neither a preset nor a hex is dropped rather than
    // carried into the stylesheet, where it would be an unvetted value in a
    // `style` attribute.
    .map((node) => ({
      ...node,
      width: Math.max(40, node.width),
      height: Math.max(30, node.height),
      ...(isCanvasColor(node.color) ? {} : { color: undefined }),
      ...(isCanvasShape(node.shape) ? {} : { shape: undefined })
    }))

  const ids = new Set(nodes.map((node) => node.id))

  const edges: CanvasEdge[] = (Array.isArray(source.edges) ? source.edges : [])
    .filter((edge): edge is CanvasEdge => {
      if (typeof edge !== 'object' || edge === null) return false
      const candidate = edge as Partial<CanvasEdge>
      return (
        typeof candidate.id === 'string' &&
        ids.has(candidate.fromNode as string) &&
        ids.has(candidate.toNode as string)
      )
    })
    .map((edge) => ({ ...edge, ...(isCanvasColor(edge.color) ? {} : { color: undefined }) }))

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
    ...(node.shape ? { shape: node.shape } : {}),
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

/* ────────────────────────────────────────────────────────────────────────────
 * Colour
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * JSON Canvas stores a colour as either a preset slot — "1" to "6" — or a hex
 * string. The slots are the interoperable part: a canvas coloured here opens
 * elsewhere with the same six colours, because every reader maps the same
 * digits. What each digit *looks* like is the reader's business, which is why
 * the values live in the stylesheet and change with the theme rather than
 * being frozen into the file.
 */
export const CANVAS_COLOR_SLOTS = ['1', '2', '3', '4', '5', '6'] as const

export type CanvasColorSlot = (typeof CANVAS_COLOR_SLOTS)[number]

const SLOTS = new Set<string>(CANVAS_COLOR_SLOTS)

const HEX = /^#[0-9a-f]{6}$/i

/** True for anything the format allows, so a foreign canvas keeps its colours. */
export function isCanvasColor(value: unknown): value is string {
  return typeof value === 'string' && (SLOTS.has(value) || HEX.test(value))
}

/**
 * The CSS colour to paint with.
 *
 * A preset resolves to a custom property so it follows the theme; a hex is
 * used as written, because someone who typed one meant that exact colour.
 * Returns null for "no colour", which is not the same as black.
 */
export function canvasColorCss(color: string | undefined): string | null {
  if (color === undefined || color === '') return null
  if (SLOTS.has(color)) return `var(--mc-canvas-${color})`
  return HEX.test(color) ? color : null
}

/* ────────────────────────────────────────────────────────────────────────────
 * Editing
 * ─────────────────────────────────────────────────────────────────────────── */

/** Removes an edge. Nodes are untouched — the cards it joined stay. */
export function removeEdge(canvas: CanvasData, id: string): CanvasData {
  return { ...canvas, edges: canvas.edges.filter((edge) => edge.id !== id) }
}

/** Removes several nodes and every line that reached any of them. */
export function removeNodes(canvas: CanvasData, ids: Iterable<string>): CanvasData {
  const doomed = new Set(ids)
  if (doomed.size === 0) return canvas

  return {
    nodes: canvas.nodes.filter((node) => !doomed.has(node.id)),
    edges: canvas.edges.filter((edge) => !doomed.has(edge.fromNode) && !doomed.has(edge.toNode))
  }
}

/**
 * Sets — or clears, with `undefined` — the colour of some nodes and edges.
 *
 * One function for both because the user is doing one thing: they selected
 * some marks on the canvas and picked a colour. Which of them happen to be
 * cards and which are lines is not a distinction they made.
 */
export function colorSelection(
  canvas: CanvasData,
  nodeIds: Iterable<string>,
  edgeIds: Iterable<string>,
  color: string | undefined
): CanvasData {
  const nodes = new Set(nodeIds)
  const edges = new Set(edgeIds)
  if (nodes.size === 0 && edges.size === 0) return canvas

  const paint = <T extends { id: string; color?: string }>(item: T, chosen: Set<string>): T => {
    if (!chosen.has(item.id)) return item
    if (color === undefined) {
      const { color: _dropped, ...rest } = item
      return rest as T
    }
    return { ...item, color }
  }

  return {
    nodes: canvas.nodes.map((node) => paint(node, nodes)),
    edges: canvas.edges.map((edge) => paint(edge, edges))
  }
}

/**
 * Copies nodes, offset so the copies are visibly not the originals, keeping
 * every line that ran *between* the copied nodes.
 *
 * Lines to nodes that were not copied are dropped rather than duplicated: two
 * cards pointing at the same third card is a guess about what was meant, and
 * the wrong guess is the one that quietly adds edges nobody asked for.
 */
export function duplicateNodes(
  canvas: CanvasData,
  ids: Iterable<string>,
  offset = 40
): { canvas: CanvasData; ids: string[] } {
  const chosen = new Set(ids)
  const sources = canvas.nodes.filter((node) => chosen.has(node.id))
  if (sources.length === 0) return { canvas, ids: [] }

  const used = new Set([...canvas.nodes.map((n) => n.id), ...canvas.edges.map((e) => e.id)])
  const mapping = new Map<string, string>()

  const nodes = sources.map((node) => {
    let at = used.size + 1
    while (used.has(`n${at}`)) at++
    used.add(`n${at}`)
    mapping.set(node.id, `n${at}`)

    return { ...node, id: `n${at}`, x: snap(node.x + offset), y: snap(node.y + offset) }
  })

  const edges = canvas.edges
    .filter((edge) => mapping.has(edge.fromNode) && mapping.has(edge.toNode))
    .map((edge) => {
      let at = used.size + 1
      while (used.has(`e${at}`)) at++
      used.add(`e${at}`)

      return {
        ...edge,
        id: `e${at}`,
        fromNode: mapping.get(edge.fromNode) as string,
        toNode: mapping.get(edge.toNode) as string
      }
    })

  return {
    canvas: { nodes: [...canvas.nodes, ...nodes], edges: [...canvas.edges, ...edges] },
    ids: nodes.map((node) => node.id)
  }
}

/**
 * The nodes a group carries when it is dragged: everything wholly inside it.
 *
 * Wholly, not merely overlapping — a card that hangs over the edge of a group
 * was put there deliberately, and dragging the group should not quietly adopt
 * it. Nested groups come along, which is what makes a group of groups behave
 * the way it looks like it should.
 */
export function nodesInside(nodes: CanvasNode[], group: CanvasNode): CanvasNode[] {
  return nodes.filter(
    (node) =>
      node.id !== group.id &&
      node.x >= group.x &&
      node.y >= group.y &&
      node.x + node.width <= group.x + group.width &&
      node.y + node.height <= group.y + group.height
  )
}

/**
 * Moves nodes by a delta, on the grid.
 *
 * Returns the canvas untouched when nothing actually ends up anywhere new.
 * A press without a drag still produces pointer moves, and without this a
 * click on a card would snap it to the grid and mark the document unsaved —
 * so selecting something was enough to be asked whether to save it.
 */
export function moveNodes(
  canvas: CanvasData,
  moves: ReadonlyMap<string, { x: number; y: number }>
): CanvasData {
  if (moves.size === 0) return canvas

  let changed = false
  const nodes = canvas.nodes.map((node) => {
    const at = moves.get(node.id)
    if (!at) return node

    const x = snap(at.x)
    const y = snap(at.y)
    if (x === node.x && y === node.y) return node

    changed = true
    return { ...node, x, y }
  })

  return changed ? { ...canvas, nodes } : canvas
}

/** Sets an edge's label, dropping it entirely when the text is emptied. */
export function labelEdge(canvas: CanvasData, id: string, label: string): CanvasData {
  return {
    ...canvas,
    edges: canvas.edges.map((edge) => {
      if (edge.id !== id) return edge
      if (label.trim() === '') {
        const { label: _dropped, ...rest } = edge
        return rest
      }
      return { ...edge, label }
    })
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Arranging
 * ─────────────────────────────────────────────────────────────────────────── */

export type Alignment = 'left' | 'centre' | 'right' | 'top' | 'middle' | 'bottom'

/**
 * Lines cards up against each other.
 *
 * Against the selection's own bounding box rather than the grid: the user
 * picked these cards because they belong together, and "left" means the
 * leftmost of *them*, not column zero of an infinite canvas.
 */
export function alignNodes(
  canvas: CanvasData,
  ids: Iterable<string>,
  how: Alignment
): CanvasData {
  const chosen = new Set(ids)
  const picked = canvas.nodes.filter((node) => chosen.has(node.id))
  if (picked.length < 2) return canvas

  const box = canvasBounds(picked)

  const place = (node: CanvasNode): CanvasNode => {
    switch (how) {
      case 'left':
        return { ...node, x: snap(box.x) }
      case 'right':
        return { ...node, x: snap(box.x + box.width - node.width) }
      case 'centre':
        return { ...node, x: snap(box.x + (box.width - node.width) / 2) }
      case 'top':
        return { ...node, y: snap(box.y) }
      case 'bottom':
        return { ...node, y: snap(box.y + box.height - node.height) }
      default:
        return { ...node, y: snap(box.y + (box.height - node.height) / 2) }
    }
  }

  return {
    ...canvas,
    nodes: canvas.nodes.map((node) => (chosen.has(node.id) ? place(node) : node))
  }
}

/**
 * Spreads cards so the gaps between them are equal.
 *
 * The two on the ends stay put — they define the span the rest are spread
 * across, and moving them would make "distribute" also mean "resize", which is
 * not what anyone presses it for.
 */
export function distributeNodes(
  canvas: CanvasData,
  ids: Iterable<string>,
  axis: 'x' | 'y'
): CanvasData {
  const chosen = new Set(ids)
  const picked = canvas.nodes
    .filter((node) => chosen.has(node.id))
    .sort((a, b) => a[axis] - b[axis])
  if (picked.length < 3) return canvas

  const size = axis === 'x' ? 'width' : 'height'
  const first = picked[0]
  const last = picked[picked.length - 1]

  const span = last[axis] + last[size] - first[axis]
  const occupied = picked.reduce((total, node) => total + node[size], 0)
  const gap = (span - occupied) / (picked.length - 1)

  const moved = new Map<string, number>()
  let at = first[axis]
  for (const node of picked) {
    moved.set(node.id, snap(at))
    at += node[size] + gap
  }

  return {
    ...canvas,
    nodes: canvas.nodes.map((node) =>
      moved.has(node.id) ? { ...node, [axis]: moved.get(node.id) as number } : node
    )
  }
}

/**
 * Moves cards to the end of the list, which is the front of the canvas.
 *
 * Painting order *is* the order in the file — there is no z-index to keep in
 * sync, and a canvas opened elsewhere stacks the same way because the format
 * says so.
 */
export function bringToFront(canvas: CanvasData, ids: Iterable<string>): CanvasData {
  const chosen = new Set(ids)
  const staying = canvas.nodes.filter((node) => !chosen.has(node.id))
  const rising = canvas.nodes.filter((node) => chosen.has(node.id))
  if (rising.length === 0) return canvas

  return { ...canvas, nodes: [...staying, ...rising] }
}

export function sendToBack(canvas: CanvasData, ids: Iterable<string>): CanvasData {
  const chosen = new Set(ids)
  const sinking = canvas.nodes.filter((node) => chosen.has(node.id))
  const staying = canvas.nodes.filter((node) => !chosen.has(node.id))
  if (sinking.length === 0) return canvas

  return { ...canvas, nodes: [...sinking, ...staying] }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Drawing the lines
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * A curve from one anchor to the other, leaving each card perpendicular to the
 * side it starts from.
 *
 * Straight lines between four fixed anchors cross their own cards as soon as
 * two of them sit diagonally: the line leaves the right-hand side heading left.
 * Pulling the control points out along each side's own direction makes the
 * curve set off the way the anchor points, which is both correct and what
 * every diagramming tool does.
 */
export function edgePath(
  from: { x: number; y: number },
  fromSide: Side,
  to: { x: number; y: number },
  toSide: Side
): string {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)

  // Enough to shape the curve, never so much that two close cards get a loop.
  const pull = Math.max(30, Math.min(distance * 0.4, 160))

  const out = offsetFor(fromSide, pull)
  const back = offsetFor(toSide, pull)

  return [
    `M ${from.x} ${from.y}`,
    `C ${from.x + out.x} ${from.y + out.y},`,
    `${to.x + back.x} ${to.y + back.y},`,
    `${to.x} ${to.y}`
  ].join(' ')
}

function offsetFor(side: Side, pull: number): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: 0, y: -pull }
    case 'bottom':
      return { x: 0, y: pull }
    case 'left':
      return { x: -pull, y: 0 }
    default:
      return { x: pull, y: 0 }
  }
}

/** The midpoint of a cubic curve — where a label sits without overlapping it. */
export function edgeMidpoint(
  from: { x: number; y: number },
  fromSide: Side,
  to: { x: number; y: number },
  toSide: Side
): { x: number; y: number } {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const pull = Math.max(30, Math.min(distance * 0.4, 160))

  const a = offsetFor(fromSide, pull)
  const b = offsetFor(toSide, pull)

  // De Casteljau at t = 0.5 reduces to this for a cubic.
  return {
    x: (from.x + 3 * (from.x + a.x) + 3 * (to.x + b.x) + to.x) / 8,
    y: (from.y + 3 * (from.y + a.y) + 3 * (to.y + b.y) + to.y) / 8
  }
}
