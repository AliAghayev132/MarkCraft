/**
 * A canvas, drawn as one SVG file.
 *
 * Pure, and told its colours rather than reading them: the presets are CSS
 * custom properties that only mean something inside a running window, and a
 * file that says `var(--mc-canvas-3)` is a file that opens grey everywhere
 * else. The renderer resolves them and passes the answers in.
 *
 * Plain `<text>` rather than `<foreignObject>`, which means the wrapping is
 * done here. It is worth it: a `foreignObject` is HTML smuggled into an image,
 * and half the programs that open SVG — including every one that turns it into
 * a PNG — draw an empty box where the writing should be.
 */

// ── ./utils ────────────────────────────────────────────────────────────────
import {
  anchorOf,
  bestSides,
  canvasBounds,
  edgePath,
  edgeMidpoint,
  inPaintOrder,
  type CanvasData,
  type CanvasNode
} from './canvas'

/** The colours the export cannot work out for itself. */
export interface SvgTheme {
  /** Behind everything. */
  background: string
  /** A card with no colour of its own. */
  card: string
  /** The line round a card. */
  line: string
  /** The writing. */
  ink: string
  /** Edges, and the writing on them. */
  muted: string
  /** Resolves a node's `color` — a slot or a hex — to something a file can use. */
  colour: (color: string | undefined) => string | null
}

export interface SvgOptions {
  theme: SvgTheme
  /** Space left round the drawing, in canvas units. */
  padding?: number
  /** Scale applied to the whole picture. 2 gives a sharp PNG. */
  scale?: number
}

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

const TEXT = { size: 14, lineHeight: 20, padding: 14 }
const HEADING = { size: 19, lineHeight: 26 }

/*
 * How wide a character is, as a fraction of the font size. A guess, because
 * measuring means having a window, and this has to work in a test and in the
 * main process. It errs narrow: a line that wraps one word early looks tidy,
 * and one that wraps late runs out of the card.
 */
const CHARACTER = 0.55

/** XML's five, and nothing else — a canvas holds prose, not markup. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Breaks a line to fit a width, in whole words where it can.
 *
 * A word longer than the line — a URL, usually — is cut rather than allowed to
 * run out of the card, because the card is the boundary the reader sees.
 */
export function wrapLine(text: string, characters: number): string[] {
  if (characters < 1) return [text]

  const lines: string[] = []
  let current = ''

  for (const word of text.split(/\s+/).filter((each) => each !== '')) {
    if (current === '') {
      current = word
    } else if (current.length + 1 + word.length <= characters) {
      current = `${current} ${word}`
    } else {
      lines.push(current)
      current = word
    }

    while (current.length > characters) {
      lines.push(current.slice(0, characters))
      current = current.slice(characters)
    }
  }

  if (current !== '') lines.push(current)
  return lines
}

interface DrawnLine {
  text: string
  heading: boolean
}

/**
 * A card's Markdown, reduced to lines that can be drawn.
 *
 * Only the marks that change how a line *looks* survive: a heading is bigger,
 * a bullet keeps its dot, and everything else has its punctuation taken off.
 * An export is a picture of the canvas, and a picture cannot follow a link.
 */
export function drawableLines(markdown: string, characters: number): DrawnLine[] {
  const out: DrawnLine[] = []

  for (const raw of markdown.split('\n')) {
    const heading = /^#{1,6}\s+/.test(raw)
    const line = raw
      .replace(/^#{1,6}\s+/, '')
      .replace(/^\s*[-*+]\s+/, '• ')
      .replace(/^\s*>\s?/, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[(.+?)\]\((.+?)\)/g, '$1')

    if (line.trim() === '') {
      // A blank line is a paragraph break and has to survive, or two
      // paragraphs become one.
      out.push({ text: '', heading: false })
      continue
    }

    const width = heading ? Math.floor(characters * (TEXT.size / HEADING.size)) : characters
    for (const wrapped of wrapLine(line, width)) out.push({ text: wrapped, heading })
  }

  // A card that ends in blank lines should not be drawn taller for them.
  while (out.length > 0 && out[out.length - 1].text === '') out.pop()
  return out
}

/** The outline of a card, as an SVG element. */
function shapeOf(node: CanvasNode, fill: string, stroke: string): string {
  const { x, y, width: w, height: h } = node
  const shape = node.shape ?? 'rectangle'
  const paint = `fill="${fill}" stroke="${stroke}" stroke-width="1"`

  switch (shape) {
    case 'plain':
      return ''
    case 'ellipse':
      return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${paint} />`
    case 'diamond':
      return `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" ${paint} />`
    case 'triangle':
      return `<polygon points="${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}" ${paint} />`
    case 'rounded':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="28" ry="28" ${paint} />`
    case 'rectangle':
    default:
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ry="8" ${paint} />`
  }
}

/** What a node has to say, whichever kind it is. */
function textOf(node: CanvasNode): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'file') return node.file ?? ''
  if (node.type === 'link') return node.url ?? ''
  return node.label ?? ''
}

function nodeText(node: CanvasNode, theme: SvgTheme): string {
  const body = textOf(node)
  if (body.trim() === '') return ''

  // A shape that is not a rectangle has less room at its edges than in its
  // middle, so its writing is kept away from them.
  const shape = node.shape ?? 'rectangle'
  const inset = shape === 'ellipse' || shape === 'diamond' || shape === 'triangle' ? 28 : TEXT.padding

  const width = Math.max(20, node.width - inset * 2)
  const lines = drawableLines(body, Math.max(4, Math.floor(width / (TEXT.size * CHARACTER))))
  if (lines.length === 0) return ''

  const align = node.align ?? (shape === 'rectangle' || shape === 'rounded' || shape === 'plain' ? 'left' : 'centre')
  const valign = node.valign ?? (shape === 'triangle' ? 'bottom' : shape === 'ellipse' || shape === 'diamond' ? 'middle' : 'top')

  const height = lines.reduce(
    (total, line) => total + (line.heading ? HEADING.lineHeight : TEXT.lineHeight),
    0
  )

  const top =
    valign === 'middle'
      ? node.y + (node.height - height) / 2
      : valign === 'bottom'
        ? node.y + node.height - height - inset
        : node.y + inset

  const anchor = align === 'centre' ? 'middle' : align === 'right' ? 'end' : 'start'
  const x =
    align === 'centre'
      ? node.x + node.width / 2
      : align === 'right'
        ? node.x + node.width - inset
        : node.x + inset

  let cursor = top
  const drawn = lines.map((line) => {
    const step = line.heading ? HEADING.lineHeight : TEXT.lineHeight
    cursor += step
    if (line.text === '') return ''

    // The baseline sits a little above the bottom of the line box.
    const baseline = cursor - step * 0.25
    const size = line.heading ? HEADING.size : TEXT.size
    const weight = line.heading ? ' font-weight="650"' : ''

    return `<text x="${x}" y="${round(baseline)}" font-size="${size}"${weight} text-anchor="${anchor}" fill="${theme.ink}">${escapeXml(line.text)}</text>`
  })

  return drawn.filter((line) => line !== '').join('\n    ')
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * The whole canvas as an SVG document.
 *
 * Cards are drawn in the same order the application paints them, so a canvas
 * that reads correctly on screen reads correctly in the file. Edges go
 * underneath, because a line crossing a card it does not touch is noise.
 */
export function canvasToSvg(canvas: CanvasData, options: SvgOptions): string {
  const { theme, padding = 60, scale = 1 } = options

  const bounds = canvasBounds(canvas.nodes)
  const width = Math.max(1, bounds.width + padding * 2)
  const height = Math.max(1, bounds.height + padding * 2)
  const originX = bounds.x - padding
  const originY = bounds.y - padding

  const byId = new Map(canvas.nodes.map((node) => [node.id, node]))

  const arrows = new Set<string>()
  const edges = canvas.edges.map((edge) => {
    const from = byId.get(edge.fromNode)
    const to = byId.get(edge.toNode)
    if (!from || !to) return ''

    const sides = bestSides(from, to)
    const fromSide = edge.fromSide ?? sides.from
    const toSide = edge.toSide ?? sides.to
    const a = anchorOf(from, fromSide)
    const b = anchorOf(to, toSide)

    const colour = theme.colour(edge.color) ?? theme.muted
    arrows.add(colour)

    const line = `<path d="${edgePath(a, fromSide, b, toSide)}" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" marker-end="url(#arrow-${arrowId(colour)})" />`

    if (!edge.label) return line

    const middle = edgeMidpoint(a, fromSide, b, toSide)
    const label = `<text x="${round(middle.x)}" y="${round(middle.y - 6)}" font-size="11" text-anchor="middle" fill="${theme.muted}" paint-order="stroke" stroke="${theme.background}" stroke-width="4" stroke-linejoin="round">${escapeXml(edge.label)}</text>`

    return `${line}\n    ${label}`
  })

  const nodes = inPaintOrder(canvas.nodes).map((node) => {
    const fill = theme.colour(node.color) ?? theme.card
    const stroke = theme.colour(node.color) ?? theme.line
    const outline = shapeOf(node, fill, stroke)
    const text = nodeText(node, theme)

    return [outline, text].filter((part) => part !== '').join('\n    ')
  })

  const markers = [...arrows]
    .map(
      (colour) =>
        `<marker id="arrow-${arrowId(colour)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="${colour}" /></marker>`
    )
    .join('\n      ')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${round(width * scale)}" height="${round(height * scale)}" viewBox="${round(originX)} ${round(originY)} ${round(width)} ${round(height)}" font-family="${FONT}">
  <defs>
    ${markers}
  </defs>
  <rect x="${round(originX)}" y="${round(originY)}" width="${round(width)}" height="${round(height)}" fill="${theme.background}" />
  <g>
    ${edges.filter((edge) => edge !== '').join('\n    ')}
  </g>
  <g>
    ${nodes.filter((node) => node !== '').join('\n    ')}
  </g>
</svg>
`
}

/*
 * A marker needs an id, and a colour is not one: `#e0e0e0` and
 * `var(--x)` both contain characters an id cannot hold.
 */
function arrowId(colour: string): string {
  let hash = 0
  for (let at = 0; at < colour.length; at++) hash = (hash * 31 + colour.charCodeAt(at)) | 0
  return Math.abs(hash).toString(36)
}
