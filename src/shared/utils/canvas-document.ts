/**
 * A canvas as a document, and a document as a canvas.
 *
 * The two are the same notes arranged differently: a canvas is a document
 * whose order is spatial, and a document is a canvas whose order is a line.
 * Until now there was no way across, so thinking on a canvas and writing it up
 * meant retyping it — and the point of a canvas is that the thinking is already
 * there.
 *
 * Neither direction is lossless, and neither pretends to be. Going to a
 * document drops where things were; coming back from one invents where they
 * should go. Both are stated plainly at the call sites, and both produce
 * something a person would have written by hand.
 */

// ── ./shared ───────────────────────────────────────────────────────────────
import { canvasBounds, snap, type CanvasData, type CanvasNode } from './canvas'

/* ────────────────────────────────────────────────────────────────────────────
 * A canvas, read as a document
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Reading order on a canvas.
 *
 * Down first, then across, in bands — the way anybody reads a wall of notes.
 * Sorting by `y` alone puts a card three pixels higher first when the two are
 * plainly side by side, so cards within a band of each other count as level and
 * are ordered left to right.
 */
const BAND = 60

export function inReadingOrder(nodes: CanvasNode[]): CanvasNode[] {
  return [...nodes].sort((a, b) => {
    const sameBand = Math.abs(a.y - b.y) < BAND
    return sameBand ? a.x - b.x : a.y - b.y
  })
}

/** What a card contributes to the document. */
function cardMarkdown(node: CanvasNode): string {
  switch (node.type) {
    case 'text':
      return (node.text ?? '').trim()
    case 'file':
      // A wiki link, because that is what this application follows.
      return node.file ? `[[${node.file}]]` : ''
    case 'link':
      return node.url ? `<${node.url}>` : ''
    default:
      return ''
  }
}

/**
 * Turns a canvas into a document.
 *
 * Groups become headings with their contents underneath, because that is what a
 * group already is: a title over some things. Cards inside no group follow, in
 * reading order. What is lost is where everything was — said once at the top of
 * the file rather than pretended away.
 */
export function canvasToMarkdown(canvas: CanvasData, options: { title?: string } = {}): string {
  const groups = canvas.nodes.filter((node) => node.type === 'group')
  const cards = canvas.nodes.filter((node) => node.type !== 'group')

  const claimed = new Set<string>()
  const parts: string[] = []

  if (options.title) parts.push(`# ${options.title}`)

  for (const group of inReadingOrder(groups)) {
    const inside = inReadingOrder(
      cards.filter(
        (card) =>
          !claimed.has(card.id) &&
          card.x >= group.x &&
          card.y >= group.y &&
          card.x + card.width <= group.x + group.width &&
          card.y + card.height <= group.y + group.height
      )
    )

    // An empty group is still a heading: it is a section somebody named and has
    // not filled in, and dropping it would lose that they meant to.
    parts.push(`## ${group.label?.trim() || 'Untitled'}`)

    for (const card of inside) {
      claimed.add(card.id)
      const text = cardMarkdown(card)
      if (text) parts.push(text)
    }
  }

  const loose = inReadingOrder(cards.filter((card) => !claimed.has(card.id)))
  if (loose.length > 0 && groups.length > 0) parts.push('## Elsewhere')

  for (const card of loose) {
    const text = cardMarkdown(card)
    if (text) parts.push(text)
  }

  /*
   * The lines between cards, listed rather than woven into the prose. A line
   * means something the person drew and would lose entirely; where it belongs
   * in a sentence is not something this can know.
   */
  const named = new Map(canvas.nodes.map((node) => [node.id, describe(node)]))
  const links = canvas.edges
    .map((edge) => {
      const from = named.get(edge.fromNode)
      const to = named.get(edge.toNode)
      if (!from || !to) return null
      return edge.label ? `- ${from} → ${to} (${edge.label})` : `- ${from} → ${to}`
    })
    .filter((line): line is string => line !== null)

  if (links.length > 0) {
    parts.push('## Connections')
    parts.push(links.join('\n'))
  }

  return `${parts.filter(Boolean).join('\n\n')}\n`
}

/** A short name for a card, for the connections list. */
function describe(node: CanvasNode): string {
  if (node.type === 'group') return node.label?.trim() || 'Group'
  if (node.type === 'file') return node.file ?? 'File'
  if (node.type === 'link') return node.url ?? 'Link'

  const first = (node.text ?? '')
    .split('\n')
    .map((line) => line.replace(/^#{1,6}\s+/, '').trim())
    .find(Boolean)

  return first ? (first.length > 40 ? `${first.slice(0, 39)}…` : first) : 'Card'
}

/* ────────────────────────────────────────────────────────────────────────────
 * A document, laid out as a canvas
 * ─────────────────────────────────────────────────────────────────────────── */

const CARD = { width: 260, height: 160, gapX: 60, gapY: 60 }

interface Section {
  level: number
  heading: string
  body: string[]
}

/** Splits a document at its headings, keeping what sits under each. */
export function sectionsOf(markdown: string): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const line of markdown.split('\n')) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/)

    if (heading) {
      if (current) sections.push(current)
      current = { level: heading[1].length, heading: heading[2].trim(), body: [] }
      continue
    }

    // Text before the first heading is its own section with no title, so a
    // document that opens with a paragraph does not lose it.
    if (!current) {
      if (line.trim() === '') continue
      current = { level: 0, heading: '', body: [line] }
      continue
    }

    current.body.push(line)
  }

  if (current) sections.push(current)
  return sections
}

/**
 * Turns a document into a canvas.
 *
 * One card per heading, holding the heading and what follows it. Laid out in
 * columns by depth — a level-two heading sits to the right of the level-one it
 * belongs to — so the shape of the document is visible before a word is read.
 * Each card is joined to the section it came under, which is the outline drawn
 * rather than listed.
 */
export function markdownToCanvas(markdown: string): CanvasData {
  const sections = sectionsOf(markdown)
  if (sections.length === 0) return { nodes: [], edges: [] }

  const nodes: CanvasNode[] = []
  const edges: CanvasData['edges'] = []

  /** The last card seen at each depth, for joining a section to its parent. */
  const lastAtLevel = new Map<number, string>()

  // Each column advances down on its own, so a long section does not push the
  // one beside it into empty space.
  const nextY = new Map<number, number>()

  sections.forEach((section, index) => {
    const level = Math.max(1, section.level)
    const column = level - 1

    const text = [section.heading ? `${'#'.repeat(level)} ${section.heading}` : '', ...section.body]
      .join('\n')
      .trim()

    const y = nextY.get(column) ?? 0
    const id = `n${index + 1}`

    nodes.push({
      id,
      type: 'text',
      x: snap(column * (CARD.width + CARD.gapX)),
      y: snap(y),
      width: CARD.width,
      height: CARD.height,
      text
    })

    nextY.set(column, y + CARD.height + CARD.gapY)

    // Everything below this one starts under it, or a deep section would be
    // drawn level with its own parent.
    for (const [other, at] of nextY) {
      if (other > column && at < y) nextY.set(other, y)
    }

    const parent = lastAtLevel.get(level - 1)
    if (parent) edges.push({ id: `e${edges.length + 1}`, fromNode: parent, toNode: id })

    lastAtLevel.set(level, id)
    // A new section at this depth ends every deeper one, or a later sibling
    // would be joined to a cousin.
    for (const [depth] of lastAtLevel) {
      if (depth > level) lastAtLevel.delete(depth)
    }
  })

  return { nodes, edges }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Arranging what is already there
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Lays cards out in a grid, in the order they are already read in.
 *
 * For a canvas that has grown by dropping things wherever there was room. The
 * grid is as wide as it needs to be to stay roughly square, because a single
 * row of thirty cards is not tidier than what it replaced.
 */
export function gridLayout(canvas: CanvasData, ids: Iterable<string>): CanvasData {
  const chosen = new Set(ids)
  const picked = inReadingOrder(canvas.nodes.filter((node) => chosen.has(node.id)))
  if (picked.length < 2) return canvas

  const box = canvasBounds(picked)
  const width = Math.max(...picked.map((node) => node.width))
  const height = Math.max(...picked.map((node) => node.height))
  const columns = Math.max(1, Math.round(Math.sqrt(picked.length)))

  const placed = new Map<string, { x: number; y: number }>()
  picked.forEach((node, index) => {
    placed.set(node.id, {
      x: snap(box.x + (index % columns) * (width + CARD.gapX)),
      y: snap(box.y + Math.floor(index / columns) * (height + CARD.gapY))
    })
  })

  return {
    ...canvas,
    nodes: canvas.nodes.map((node) => {
      const at = placed.get(node.id)
      return at ? { ...node, ...at } : node
    })
  }
}
