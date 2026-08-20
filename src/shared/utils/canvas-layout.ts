/**
 * Arranging a canvas by what its cards are joined to.
 *
 * A grid tidies a canvas by making it neat; this tidies it by making it *say*
 * something. Cards with arrows between them have a shape already — a
 * hierarchy, a flow, a hub with spokes — and laying them out in rows throws
 * that away. Somebody who drew the arrows meant them.
 */

// ── ./utils ────────────────────────────────────────────────────────────────
import { canvasBounds, snap, type CanvasData, type CanvasNode } from './canvas'

/*
 * Room between cards. Generous, because the point of these layouts is that the
 * lines between cards can be followed, and a line that runs through a card on
 * its way somewhere else cannot be.
 */
const GAP = { x: 60, y: 90 }

interface Graph {
  children: Map<string, string[]>
  parents: Map<string, string[]>
}

/** Who points at whom, among the chosen cards only. */
function graphOf(canvas: CanvasData, chosen: Set<string>): Graph {
  const children = new Map<string, string[]>()
  const parents = new Map<string, string[]>()

  for (const id of chosen) {
    children.set(id, [])
    parents.set(id, [])
  }

  for (const edge of canvas.edges) {
    if (!chosen.has(edge.fromNode) || !chosen.has(edge.toNode)) continue
    if (edge.fromNode === edge.toNode) continue

    const kids = children.get(edge.fromNode)
    // A card joined twice to the same card is one relationship drawn twice.
    if (kids && !kids.includes(edge.toNode)) kids.push(edge.toNode)

    const mums = parents.get(edge.toNode)
    if (mums && !mums.includes(edge.fromNode)) mums.push(edge.fromNode)
  }

  return { children, parents }
}

/**
 * Which cards to start from.
 *
 * A root is a card nothing points at that points at something — which is what
 * the top of a hierarchy is. A card with no arrows at all is not a root of
 * anything; it is not in the diagram, and starting a tree at it would put it
 * on the top row as though it were.
 *
 * When everything points at something — a cycle, or a diagram of a process
 * that loops — the card with the most arrows leaving it starts, because that
 * is where a reader's eye goes.
 */
function rootsOf(order: readonly string[], graph: Graph): string[] {
  const roots = order.filter(
    (id) =>
      (graph.parents.get(id) ?? []).length === 0 && (graph.children.get(id) ?? []).length > 0
  )
  if (roots.length > 0) return roots

  // Nothing is joined to anything: there is no tree to draw, and every card
  // belongs in the row for cards that are not part of one.
  if (order.every((id) => (graph.children.get(id) ?? []).length === 0)) return []

  const best = [...order].sort(
    (a, b) => (graph.children.get(b) ?? []).length - (graph.children.get(a) ?? []).length
  )
  return best.slice(0, 1)
}

/**
 * Cards in rows, each below what points at it.
 *
 * The classic tidy-tree walk: place the leaves left to right, then put every
 * parent above the middle of its children. Cards nothing joins are left in a
 * row of their own at the bottom rather than scattered — they are not part of
 * the diagram, and mixing them into it would say they were.
 *
 * A cycle cannot be laid out as a tree, so a card already placed is not placed
 * again; the arrow back to it stays drawn and still says what it said.
 */
export function treeLayout(canvas: CanvasData, ids: Iterable<string>): CanvasData {
  const chosen = new Set(ids)
  const picked = canvas.nodes.filter((node) => chosen.has(node.id))
  if (picked.length < 2) return canvas

  const byId = new Map(picked.map((node) => [node.id, node]))
  const graph = graphOf(canvas, new Set(byId.keys()))

  // Reading order to begin with, so a layout is stable rather than depending
  // on where in the file a card happens to be stored.
  const order = [...picked]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((node) => node.id)

  const placed = new Map<string, { x: number; y: number }>()
  const seen = new Set<string>()
  const rowHeight = new Map<number, number>()

  /** The left edge of the next thing to be placed, per row. */
  let cursor = 0

  /** Places a card and everything below it; returns the middle of its span. */
  function walk(id: string, depth: number): number {
    seen.add(id)

    const node = byId.get(id) as CanvasNode
    const kids = (graph.children.get(id) ?? []).filter((kid) => !seen.has(kid))

    rowHeight.set(depth, Math.max(rowHeight.get(depth) ?? 0, node.height))

    if (kids.length === 0) {
      const x = cursor
      cursor += node.width + GAP.x
      placed.set(id, { x, y: depth })
      return x + node.width / 2
    }

    const middles = kids.map((kid) => walk(kid, depth + 1))
    const centre = (Math.min(...middles) + Math.max(...middles)) / 2

    placed.set(id, { x: centre - node.width / 2, y: depth })
    return centre
  }

  for (const root of rootsOf(order, graph)) {
    if (!seen.has(root)) walk(root, 0)
  }

  // Anything the walk never reached is joined to nothing.
  const loose = order.filter((id) => !seen.has(id))
  if (loose.length > 0) {
    const depth = Math.max(0, ...[...placed.values()].map((at) => at.y)) + 1
    cursor = 0
    for (const id of loose) {
      const node = byId.get(id) as CanvasNode
      rowHeight.set(depth, Math.max(rowHeight.get(depth) ?? 0, node.height))
      placed.set(id, { x: cursor, y: depth })
      cursor += node.width + GAP.x
    }
  }

  // Rows are as tall as their tallest card, so a row of short cards does not
  // leave a band of empty canvas under it.
  const rowTop = new Map<number, number>()
  let running = 0
  for (const depth of [...rowHeight.keys()].sort((a, b) => a - b)) {
    rowTop.set(depth, running)
    running += (rowHeight.get(depth) ?? 0) + GAP.y
  }

  return applyLayout(canvas, picked, placed, rowTop)
}

/*
 * How far the ring sits from the middle. Wide enough that the arrows read as
 * arrows rather than as a join between two touching cards.
 */
const RING = 340

/**
 * One card in the middle, the rest around it.
 *
 * For the shape a tree cannot show: everything joined to one thing. The middle
 * is whichever card has the most arrows touching it, because that is what the
 * canvas is about — not whichever happens to be first in the file.
 */
export function radialLayout(canvas: CanvasData, ids: Iterable<string>): CanvasData {
  const chosen = new Set(ids)
  const picked = canvas.nodes.filter((node) => chosen.has(node.id))
  if (picked.length < 3) return canvas

  const graph = graphOf(canvas, new Set(picked.map((node) => node.id)))
  const degree = (id: string): number =>
    (graph.children.get(id) ?? []).length + (graph.parents.get(id) ?? []).length

  const order = [...picked].sort((a, b) => a.y - b.y || a.x - b.x)
  const middle = [...order].sort((a, b) => degree(b.id) - degree(a.id))[0] as CanvasNode

  const ring = order.filter((node) => node.id !== middle.id)
  const radius = Math.max(RING, (ring.length * (middle.width + GAP.x)) / (2 * Math.PI))

  const placed = new Map<string, { x: number; y: number }>()
  placed.set(middle.id, { x: -middle.width / 2, y: -middle.height / 2 })

  ring.forEach((node, index) => {
    // From the top, clockwise: the first card is where a reader expects the
    // first thing to be.
    const angle = (index / ring.length) * Math.PI * 2 - Math.PI / 2
    placed.set(node.id, {
      x: Math.cos(angle) * radius - node.width / 2,
      y: Math.sin(angle) * radius - node.height / 2
    })
  })

  return applyLayout(canvas, picked, placed, null)
}

/**
 * Moves the cards, keeping the arrangement where the old one was.
 *
 * The top-left corner is preserved so a layout does not throw the canvas
 * somewhere the person has to go looking for it — and everything lands on the
 * grid, so a card a layout placed sits where a card somebody drags would.
 */
function applyLayout(
  canvas: CanvasData,
  picked: CanvasNode[],
  placed: Map<string, { x: number; y: number }>,
  rowTop: Map<number, number> | null
): CanvasData {
  const resolved = new Map<string, { x: number; y: number }>()
  for (const [id, at] of placed) {
    resolved.set(id, { x: at.x, y: rowTop ? (rowTop.get(at.y) ?? 0) : at.y })
  }

  const xs = [...resolved.values()].map((at) => at.x)
  const ys = [...resolved.values()].map((at) => at.y)
  const before = canvasBounds(picked)
  const dx = before.x - Math.min(...xs)
  const dy = before.y - Math.min(...ys)

  return {
    ...canvas,
    nodes: canvas.nodes.map((node) => {
      const at = resolved.get(node.id)
      return at ? { ...node, x: snap(at.x + dx), y: snap(at.y + dy) } : node
    })
  }
}
