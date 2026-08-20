/**
 * Canvases that start with a shape.
 *
 * Pure, and told its words rather than reading them: the layouts are the part
 * worth getting right and worth testing, while a board's column names are
 * prose and belong to whichever language the writer is working in.
 *
 * Every template is small. A canvas arrives with a shape and a few empty
 * cards, not a worked example — a template somebody has to empty before they
 * can start is worse than a blank one.
 */

// ── ./utils ────────────────────────────────────────────────────────────────
import { bestSides, type CanvasData, type CanvasEdge, type CanvasNode } from './canvas'

export type CanvasTemplateId = 'blank' | 'kanban' | 'retrospective' | 'mindMap' | 'timeline'

/** Every template except the blank one, in the order they are offered. */
export const CANVAS_TEMPLATES: readonly Exclude<CanvasTemplateId, 'blank'>[] = [
  'kanban',
  'retrospective',
  'mindMap',
  'timeline'
]

/** A column of a board: its heading, and the colour its cards take. */
export interface BoardColumn {
  label: string
  /** A slot from `CANVAS_COLOR_SLOTS`, or undefined for no colour. */
  color?: string
}

/*
 * One set of measurements for every template, so two of them side by side look
 * like they belong to the same application. The grid is 20, and each of these
 * is a multiple of it — cards a template made must land where a card somebody
 * drags lands.
 */
const CARD = { width: 260, height: 120 }
const COLUMN = { width: 300, gap: 40 }
const HEADING = { height: 60 }

function node(id: string, over: Partial<CanvasNode> & Pick<CanvasNode, 'x' | 'y'>): CanvasNode {
  return {
    id,
    type: 'text',
    width: CARD.width,
    height: CARD.height,
    ...over
  }
}

/**
 * Columns with a heading over each.
 *
 * The heading is a `plain` node rather than a card: a title is not one of the
 * things on the board, and a bordered box holding the word "Doing" reads as an
 * item somebody has to deal with.
 */
export function boardCanvas(columns: readonly BoardColumn[], placeholder: string): CanvasData {
  const nodes: CanvasNode[] = []

  columns.forEach((column, index) => {
    const x = index * (COLUMN.width + COLUMN.gap)

    nodes.push(
      node(`heading-${index}`, {
        x,
        y: 0,
        width: COLUMN.width,
        height: HEADING.height,
        text: `## ${column.label}`,
        shape: 'plain',
        align: 'centre',
        valign: 'middle'
      })
    )

    // One empty card per column, so the board can be typed into rather than
    // built first. More than one would be filler somebody has to delete.
    nodes.push(
      node(`card-${index}`, {
        x: x + (COLUMN.width - CARD.width) / 2,
        y: HEADING.height + 20,
        text: placeholder,
        color: column.color,
        shape: 'rounded'
      })
    )
  })

  return { nodes, edges: [] }
}

/*
 * How far the branches sit from the middle. Wide enough that the arrows are
 * visible as arrows rather than as a join between two touching cards.
 */
const SPOKE = 320

/**
 * A middle with branches around it, joined by edges.
 *
 * Laid out on a circle rather than in a column, because the shape is the whole
 * point: a mind map drawn as a list is a list. The branches are evenly spaced
 * whatever their number, so four make a cross and three a tripod.
 */
export function mindMapCanvas(centre: string, branches: readonly string[]): CanvasData {
  const middle = node('centre', {
    x: -CARD.width / 2,
    y: -CARD.height / 2,
    text: `## ${centre}`,
    shape: 'ellipse',
    align: 'centre',
    valign: 'middle',
    color: '5'
  })

  const nodes: CanvasNode[] = [middle]
  const edges: CanvasEdge[] = []

  branches.forEach((label, index) => {
    // Started at the top and gone round clockwise, so the first branch is
    // where somebody looking at the canvas expects the first thing to be.
    const angle = (index / branches.length) * Math.PI * 2 - Math.PI / 2
    const id = `branch-${index}`

    const branch = node(id, {
      x: Math.round(Math.cos(angle) * SPOKE - CARD.width / 2),
      y: Math.round(Math.sin(angle) * SPOKE - CARD.height / 2),
      text: label,
      shape: 'rounded',
      align: 'centre',
      valign: 'middle'
    })
    nodes.push(branch)

    // The arrow leaves whichever side of the middle faces the branch, so a
    // map with branches all round it does not have every line crossing it.
    const sides = bestSides(middle, branch)
    edges.push({
      id: `edge-${index}`,
      fromNode: 'centre',
      fromSide: sides.from,
      toNode: id,
      toSide: sides.to
    })
  })

  return { nodes, edges }
}

/**
 * Steps in a row, each pointing at the next.
 *
 * A line rather than a grid: the arrangement is the claim the diagram makes,
 * and a wrapped timeline says the fourth step follows the first.
 */
export function timelineCanvas(steps: readonly string[]): CanvasData {
  const nodes: CanvasNode[] = []
  const edges: CanvasEdge[] = []

  steps.forEach((label, index) => {
    const id = `step-${index}`

    nodes.push(
      node(id, {
        x: index * (CARD.width + 80),
        y: 0,
        text: label,
        shape: 'rounded',
        align: 'centre',
        valign: 'middle',
        color: String((index % 6) + 1)
      })
    )

    if (index > 0) {
      edges.push({
        id: `edge-${index}`,
        fromNode: `step-${index - 1}`,
        fromSide: 'right',
        toNode: id,
        toSide: 'left'
      })
    }
  })

  return { nodes, edges }
}
