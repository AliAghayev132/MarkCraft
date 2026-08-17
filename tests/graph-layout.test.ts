import { describe, expect, it } from 'vitest'

import { layoutGraph } from '@features/links'

import type { GraphEdge, GraphNode } from '@shared'

function nodes(...paths: string[]): GraphNode[] {
  return paths.map((path) => ({ path, title: path, outgoing: 0, incoming: 0 }))
}

const BOX = { width: 600, height: 400 }

describe('layoutGraph', () => {
  it('places nothing for an empty graph', () => {
    expect(layoutGraph([], [], BOX)).toEqual([])
  })

  it('centres a lone node', () => {
    expect(layoutGraph(nodes('a.md'), [], BOX)).toEqual([{ path: 'a.md', x: 300, y: 200 }])
  })

  it('keeps every node inside the box', () => {
    const placed = layoutGraph(nodes('a', 'b', 'c', 'd', 'e', 'f'), [{ from: 'a', to: 'b' }], BOX)

    for (const node of placed) {
      expect(node.x).toBeGreaterThanOrEqual(0)
      expect(node.x).toBeLessThanOrEqual(BOX.width)
      expect(node.y).toBeGreaterThanOrEqual(0)
      expect(node.y).toBeLessThanOrEqual(BOX.height)
      expect(Number.isFinite(node.x) && Number.isFinite(node.y)).toBe(true)
    }
  })

  /*
   * The reason the seeding is a circle and not `Math.random`: a map that
   * redraws itself differently every time cannot be recognised, and the whole
   * value of the view is recognising the shape of your own workspace.
   */
  it('draws the same graph the same way twice', () => {
    const list = nodes('a', 'b', 'c', 'd')
    const edges: GraphEdge[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' }
    ]

    expect(layoutGraph(list, edges, BOX)).toEqual(layoutGraph(list, edges, BOX))
  })

  it('pulls linked nodes closer than unlinked ones', () => {
    const placed = layoutGraph(nodes('a', 'b', 'c'), [{ from: 'a', to: 'b' }], BOX)
    const at = (path: string) => placed.find((node) => node.path === path)!
    const between = (one: string, two: string): number =>
      Math.hypot(at(one).x - at(two).x, at(one).y - at(two).y)

    expect(between('a', 'b')).toBeLessThan(between('a', 'c'))
    expect(between('a', 'b')).toBeLessThan(between('b', 'c'))
  })

  it('separates nodes that start on top of each other', () => {
    // Two nodes on a circle of two are diametrically opposite, so this checks
    // the degenerate branch by way of a graph that collapses onto one point.
    const placed = layoutGraph(nodes('a', 'b'), [{ from: 'a', to: 'b' }], BOX)
    expect(Math.hypot(placed[0].x - placed[1].x, placed[0].y - placed[1].y)).toBeGreaterThan(1)
  })

  /*
   * The failure this replaces: with the textbook ideal edge length, four nodes
   * in a 620x380 box all clamped against the top edge and drew as a flat line.
   * A map has to use both dimensions to be a map.
   */
  it('spreads a small graph over both dimensions rather than onto one edge', () => {
    const placed = layoutGraph(nodes('hub', 'idea', 'plan', 'lonely'), [
      { from: 'hub', to: 'idea' },
      { from: 'hub', to: 'plan' },
      { from: 'idea', to: 'plan' }
    ], BOX)

    const spread = (values: number[]): number => Math.max(...values) - Math.min(...values)

    expect(spread(placed.map((node) => node.x))).toBeGreaterThan(BOX.width * 0.2)
    expect(spread(placed.map((node) => node.y))).toBeGreaterThan(BOX.height * 0.2)
  })

  /* The fit step exists so a small graph does not draw in one corner. */
  it('fills the canvas rather than clustering in part of it', () => {
    const placed = layoutGraph(nodes('a', 'b', 'c', 'd', 'e'), [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' }
    ], BOX)

    const xs = placed.map((node) => node.x)
    const ys = placed.map((node) => node.y)

    // One axis is filled outright; the other follows unless the shape is wider
    // than the box, which is what uniform scaling is for.
    expect(
      Math.max(...xs) - Math.min(...xs) > BOX.width * 0.7 ||
        Math.max(...ys) - Math.min(...ys) > BOX.height * 0.7
    ).toBe(true)
  })

  it('ignores an edge naming a node that is not in the graph', () => {
    const placed = layoutGraph(nodes('a', 'b'), [{ from: 'a', to: 'ghost.md' }], BOX)
    expect(placed).toHaveLength(2)
    expect(placed.every((node) => Number.isFinite(node.x))).toBe(true)
  })
})
