// ── @shared ────────────────────────────────────────────────────────────────
import type { GraphEdge, GraphNode } from '@shared'

export interface Placed {
  path: string
  x: number
  y: number
}

export interface LayoutOptions {
  width: number
  height: number
  iterations?: number
}

/**
 * A force-directed layout, written out rather than pulled in.
 *
 * A graph library would be the obvious answer, but every one of them is a
 * megabyte-class dependency for a panel most users open occasionally — against
 * the rule about weighing dependencies, and against the bundle budget the rest
 * of the application is held to. Fruchterman–Reingold is forty lines.
 *
 * Seeded on a circle rather than at random, so the same workspace always draws
 * the same picture: a graph that rearranged itself on every open would be
 * unreadable as a map, which is the only thing it is for.
 */
export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  { width, height, iterations = 260 }: LayoutOptions
): Placed[] {
  if (nodes.length === 0) return []
  if (nodes.length === 1) return [{ path: nodes[0].path, x: width / 2, y: height / 2 }]

  const area = width * height
  /*
   * The textbook `sqrt(area / n)` assumes the nodes may use the whole canvas,
   * which for a handful of documents puts the ideal edge length wider than the
   * box is tall — every node then ends up clamped against an edge in a flat
   * line. Two thirds of it leaves the graph room to be a shape.
   */
  const ideal = 0.62 * Math.sqrt(area / nodes.length)

  const index = new Map(nodes.map((node, at) => [node.path, at]))
  const x = new Float64Array(nodes.length)
  const y = new Float64Array(nodes.length)

  const radius = Math.min(width, height) * 0.36
  nodes.forEach((_, at) => {
    const angle = (2 * Math.PI * at) / nodes.length
    x[at] = width / 2 + radius * Math.cos(angle)
    y[at] = height / 2 + radius * Math.sin(angle)
  })

  const dx = new Float64Array(nodes.length)
  const dy = new Float64Array(nodes.length)

  // Cooling: large moves early to untangle, small ones late to settle.
  let temperature = Math.min(width, height) / 8

  for (let step = 0; step < iterations; step++) {
    dx.fill(0)
    dy.fill(0)

    // ── Every pair pushes apart ──────────────────────────────────────────
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        let deltaX = x[a] - x[b]
        let deltaY = y[a] - y[b]
        let distance = Math.hypot(deltaX, deltaY)

        // Two nodes at the same point have no direction to separate along;
        // nudging them apart deterministically keeps the maths finite.
        if (distance < 0.01) {
          deltaX = ((a % 7) + 1) * 0.01
          deltaY = ((b % 5) + 1) * 0.01
          distance = Math.hypot(deltaX, deltaY)
        }

        /*
         * Repulsion has a range. Two documents on opposite sides of the map
         * have nothing to say to each other, and letting them push anyway is
         * what strands an unlinked document against the far edge with an empty
         * gap where the graph should be.
         */
        if (distance > ideal * 1.3) continue

        const force = (ideal * ideal) / distance
        const unitX = (deltaX / distance) * force
        const unitY = (deltaY / distance) * force

        dx[a] += unitX
        dy[a] += unitY
        dx[b] -= unitX
        dy[b] -= unitY
      }
    }

    // ── Linked nodes pull together ───────────────────────────────────────
    for (const edge of edges) {
      const a = index.get(edge.from)
      const b = index.get(edge.to)
      if (a === undefined || b === undefined || a === b) continue

      const deltaX = x[a] - x[b]
      const deltaY = y[a] - y[b]
      const distance = Math.max(0.01, Math.hypot(deltaX, deltaY))

      const force = (distance * distance) / ideal
      const unitX = (deltaX / distance) * force
      const unitY = (deltaY / distance) * force

      dx[a] -= unitX
      dy[a] -= unitY
      dx[b] += unitX
      dy[b] += unitY
    }

    /*
     * A weak pull to the centre. Without it a node nothing links to is pushed
     * outward by repulsion alone until it sticks to an edge — and a document
     * with no links is exactly the one worth noticing, not the one to exile
     * into a corner where its label is clipped.
     */
    for (let at = 0; at < nodes.length; at++) {
      dx[at] += (width / 2 - x[at]) * 0.12
      dy[at] += (height / 2 - y[at]) * 0.12
    }

    const margin = 16
    for (let at = 0; at < nodes.length; at++) {
      const distance = Math.max(0.01, Math.hypot(dx[at], dy[at]))
      const capped = Math.min(distance, temperature)

      x[at] = clamp(x[at] + (dx[at] / distance) * capped, margin, width - margin)
      y[at] = clamp(y[at] + (dy[at] / distance) * capped, margin, height - margin)
    }

    temperature *= 0.97
  }

  return fitToBox(
    nodes.map((node, at) => ({ path: node.path, x: x[at], y: y[at] })),
    width,
    height
  )
}

/**
 * Scales the finished arrangement to fill the canvas.
 *
 * The forces decide how the documents sit relative to each other; how much of
 * the box that uses is an accident of how many there are. Without this a small
 * graph draws in one corner with an empty middle, and a large one crowds the
 * centre. Scaled uniformly, so the shape the forces found is not distorted.
 */
function fitToBox(placed: Placed[], width: number, height: number): Placed[] {
  const margin = 30
  const minX = Math.min(...placed.map((node) => node.x))
  const maxX = Math.max(...placed.map((node) => node.x))
  const minY = Math.min(...placed.map((node) => node.y))
  const maxY = Math.max(...placed.map((node) => node.y))

  const spanX = maxX - minX
  const spanY = maxY - minY

  // Everything on one point (or one line) has no scale to speak of; leaving it
  // alone beats dividing by nearly zero.
  if (spanX < 1 && spanY < 1) return placed

  const scale = Math.min(
    spanX < 1 ? Infinity : (width - margin * 2) / spanX,
    spanY < 1 ? Infinity : (height - margin * 2) / spanY
  )

  const offsetX = (width - spanX * scale) / 2 - minX * scale
  const offsetY = (height - spanY * scale) / 2 - minY * scale

  return placed.map((node) => ({
    path: node.path,
    x: node.x * scale + offsetX,
    y: node.y * scale + offsetY
  }))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
