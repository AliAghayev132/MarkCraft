/**
 * A flat block model of a Markdown document.
 *
 * The word-processor exports — RTF and DOCX — both need the same thing: the
 * document reduced to headings, paragraphs, list items and code, with inline
 * emphasis marked but not yet expressed. Neither format has a nested document
 * model worth targeting, so flattening once here means the two renderers differ only
 * in the control words they emit, and a fix to list detection reaches both.
 */
export interface Span {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  strike?: boolean
  /** Link text; the target is dropped, see `parseInline`. */
  link?: boolean
}

export type Block =
  | { kind: 'heading'; level: number; spans: Span[] }
  | { kind: 'paragraph'; spans: Span[] }
  | { kind: 'bullet'; spans: Span[] }
  | { kind: 'ordered'; index: number; spans: Span[] }
  | { kind: 'task'; done: boolean; spans: Span[] }
  | { kind: 'quote'; spans: Span[] }
  | { kind: 'code'; text: string }
  | { kind: 'rule' }

const FENCE = /^\s*(```|~~~)/

/*
 * One pass, longest-marker-first so `***both***` is not eaten by the `**`
 * rule. Images are dropped and link targets discarded: a word processor has no
 * use for a relative path that will not resolve from wherever the file lands,
 * and the words are what the reader came for.
 */
const INLINE =
  /(`[^`]+`)|(\*\*\*[^*]+\*\*\*)|(\*\*[^*]+\*\*)|(~~[^~]+~~)|(\*[^*\n]+\*)|(_[^_\n]+_)|(!\[[^\]]*\]\([^)]*\))|(\[[^\]]*\]\([^)]*\))/

export function parseInline(text: string): Span[] {
  const spans: Span[] = []
  let rest = text

  const push = (span: Span): void => {
    if (span.text === '') return
    spans.push(span)
  }

  while (rest !== '') {
    const found = rest.match(INLINE)
    if (!found || found.index === undefined) {
      push({ text: rest })
      break
    }

    push({ text: rest.slice(0, found.index) })
    const token = found[0]

    if (token.startsWith('`')) push({ text: token.slice(1, -1), code: true })
    else if (token.startsWith('***')) push({ text: token.slice(3, -3), bold: true, italic: true })
    else if (token.startsWith('**')) push({ text: token.slice(2, -2), bold: true })
    else if (token.startsWith('~~')) push({ text: token.slice(2, -2), strike: true })
    else if (token.startsWith('![')) void 0 // an image carries no text worth keeping
    else if (token.startsWith('[')) push({ text: token.slice(1, token.indexOf(']')), link: true })
    else push({ text: token.slice(1, -1), italic: true })

    rest = rest.slice(found.index + token.length)
  }

  return spans
}

export function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').split('\n')
  const blocks: Block[] = []

  let inFence = false
  let marker = ''
  let ordinal = 0

  for (const line of lines) {
    const fence = line.match(FENCE)
    if (fence) {
      if (!inFence) {
        inFence = true
        marker = fence[1]
      } else if (line.trim().startsWith(marker)) {
        inFence = false
      }
      continue
    }

    // Inside a fence every line is code, spacing and asterisks included.
    if (inFence) {
      blocks.push({ kind: 'code', text: line })
      continue
    }

    if (line.trim() === '') {
      // A blank line ends a list, which is what restarts the numbering.
      ordinal = 0
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, spans: parseInline(heading[2].trim()) })
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: 'rule' })
      continue
    }

    const quote = line.match(/^\s*>\s?(.*)$/)
    if (quote) {
      blocks.push({ kind: 'quote', spans: parseInline(quote[1]) })
      continue
    }

    const task = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/)
    if (task) {
      blocks.push({ kind: 'task', done: task[1] !== ' ', spans: parseInline(task[2]) })
      continue
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/)
    if (bullet) {
      blocks.push({ kind: 'bullet', spans: parseInline(bullet[1]) })
      continue
    }

    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (numbered) {
      ordinal += 1
      blocks.push({ kind: 'ordered', index: ordinal, spans: parseInline(numbered[1]) })
      continue
    }

    ordinal = 0
    blocks.push({ kind: 'paragraph', spans: parseInline(line.trim()) })
  }

  return blocks
}
