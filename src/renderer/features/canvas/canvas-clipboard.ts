// ── @shared ────────────────────────────────────────────────────────────────
import { mergeCanvas, type CanvasData, type CanvasEdge, type CanvasNode } from '@shared'

/**
 * Cards on the clipboard.
 *
 * Kept in the renderer rather than on the system clipboard, because a card is
 * not text: putting JSON there would replace whatever the person had copied to
 * paste into their document, and pasting a card into a chat window would spill
 * a wall of coordinates. The system clipboard belongs to what people write.
 *
 * The trade is stated plainly: this survives moving between canvases and
 * between documents, and does not survive closing the application. That is the
 * right way round — copying a card is a thing you do and finish within a
 * minute, and losing the document's own clipboard to it would be felt for far
 * longer.
 */
interface Clipping {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

let held: Clipping | null = null

/**
 * Copies cards, and every line that runs *between* them.
 *
 * A line to a card that was not copied is left behind rather than duplicated:
 * pasting would have to invent which card it now points at, and the wrong guess
 * is the one that quietly adds a connection nobody drew.
 */
export function copyNodes(canvas: CanvasData, ids: Iterable<string>): number {
  const chosen = new Set(ids)
  const nodes = canvas.nodes.filter((node) => chosen.has(node.id))
  if (nodes.length === 0) return 0

  held = {
    nodes: nodes.map((node) => ({ ...node })),
    edges: canvas.edges
      .filter((edge) => chosen.has(edge.fromNode) && chosen.has(edge.toNode))
      .map((edge) => ({ ...edge }))
  }

  return nodes.length
}

export function hasClipping(): boolean {
  return held !== null && held.nodes.length > 0
}

export function clippingSize(): number {
  return held?.nodes.length ?? 0
}

/**
 * Pastes what was copied, with the top-left of the clipping put where asked.
 *
 * Placed at the pointer when there is one — that is where the person is
 * looking, and a paste that lands off screen looks like a paste that did
 * nothing. Ids are minted fresh so a card can be pasted repeatedly, and into
 * the canvas it came from.
 */
export function pasteInto(
  canvas: CanvasData,
  at: { x: number; y: number } | null
): { canvas: CanvasData; ids: string[] } {
  if (!held) return { canvas, ids: [] }
  return mergeCanvas(canvas, held, at)
}

/** For a test to start from nothing; nothing in the interface calls it. */
export function forgetClipping(): void {
  held = null
}
