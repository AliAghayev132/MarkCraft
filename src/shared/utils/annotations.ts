/**
 * Notes attached to a passage of a document.
 *
 * The hard part is not storing a comment, it is finding again what it was
 * about. An offset is worthless the moment somebody types a word above it, and
 * a document people comment on is a document people are editing. So a comment
 * remembers the words it was left on, plus a little of what came before and
 * after, and is re-found by looking for them.
 *
 * That is the W3C Web Annotation model's text-quote selector, and it is used
 * here for the same reason it exists there: it survives editing elsewhere in
 * the file, it survives the file being reformatted, and when the passage
 * really is gone it can say so instead of pointing at the wrong sentence.
 */

export interface TextAnchor {
  /** The words the comment was left on. */
  quote: string
  /** A little of what came before, to tell repeated quotes apart. */
  prefix: string
  /** A little of what came after, for the same reason. */
  suffix: string
  /**
   * Where it was when it was written.
   *
   * A hint, never a source of truth: it decides between equally good matches
   * and nothing else. Trusting it would put a comment on the wrong sentence
   * the first time somebody adds a paragraph.
   */
  start: number
}

export interface Annotation {
  id: string
  anchor: TextAnchor
  /** What the person wrote. */
  body: string
  /** Milliseconds since the epoch. */
  createdAt: number
  /** Dealt with, and out of the way — but not deleted. */
  resolved: boolean
}

/** A document's comments, as the side-file holds them. */
export interface AnnotationFile {
  version: 1
  annotations: Annotation[]
}

export const ANNOTATION_VERSION = 1

/*
 * How much context is kept either side. Enough to tell apart two occurrences
 * of a common phrase, short enough that reformatting a paragraph does not
 * change it beyond recognition.
 */
const CONTEXT = 32

/** The longest passage worth remembering in full. */
const MAX_QUOTE = 400

/** Builds the anchor for a selection. */
export function anchorFor(text: string, from: number, to: number): TextAnchor {
  const start = Math.max(0, Math.min(from, to))
  const end = Math.min(text.length, Math.max(from, to))

  return {
    quote: text.slice(start, Math.min(end, start + MAX_QUOTE)),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, Math.min(text.length, end + CONTEXT)),
    start
  }
}

export interface Located {
  from: number
  to: number
  /**
   * How sure the match is.
   *
   * `exact` means the quote and both sides of its context are where they were.
   * `moved` means the quote was found but its surroundings changed. Worth
   * distinguishing: a reader deciding whether to trust a comment wants to know
   * that the sentence around it was rewritten.
   */
  confidence: 'exact' | 'moved'
}

/** Every place the quote appears, in order. */
function occurrences(text: string, quote: string): number[] {
  if (quote === '') return []

  const found: number[] = []
  for (let at = text.indexOf(quote); at !== -1; at = text.indexOf(quote, at + 1)) {
    found.push(at)
    // A quote repeated hundreds of times is a single character or a line of
    // dashes; scoring them all would cost more than the answer is worth.
    if (found.length >= 64) break
  }
  return found
}

/** How much of the two strings agree, counting inwards from the join. */
function agreement(a: string, b: string, fromEnd: boolean): number {
  const length = Math.min(a.length, b.length)
  let same = 0

  for (let step = 1; step <= length; step++) {
    const left = fromEnd ? a[a.length - step] : a[step - 1]
    const right = fromEnd ? b[b.length - step] : b[step - 1]
    if (left !== right) break
    same++
  }

  return same
}

/**
 * Finds the passage a comment was left on.
 *
 * The quote decides; the context breaks ties. When the same words appear
 * several times — and in a document of headings and list items they will —
 * whichever occurrence has the most of the original text either side of it
 * wins, and the remembered offset only settles a draw.
 */
export function locate(text: string, anchor: TextAnchor): Located | null {
  const places = occurrences(text, anchor.quote)
  if (places.length === 0) return null

  let best = places[0]
  let bestScore = -1

  for (const at of places) {
    const before = text.slice(Math.max(0, at - CONTEXT), at)
    const after = text.slice(at + anchor.quote.length, at + anchor.quote.length + CONTEXT)

    const score =
      agreement(before, anchor.prefix, true) +
      agreement(after, anchor.suffix, false) -
      // A tie-break, not a vote: at most one point, so context always wins.
      Math.min(1, Math.abs(at - anchor.start) / Math.max(1, text.length))

    if (score > bestScore) {
      bestScore = score
      best = at
    }
  }

  const before = text.slice(Math.max(0, best - CONTEXT), best)
  const after = text.slice(best + anchor.quote.length, best + anchor.quote.length + CONTEXT)
  const intact =
    agreement(before, anchor.prefix, true) === Math.min(before.length, anchor.prefix.length) &&
    agreement(after, anchor.suffix, false) === Math.min(after.length, anchor.suffix.length)

  return {
    from: best,
    to: best + anchor.quote.length,
    confidence: intact ? 'exact' : 'moved'
  }
}

export interface PlacedAnnotation extends Annotation {
  /** Null when the passage it was left on is no longer in the document. */
  at: Located | null
}

/**
 * Every comment, with where it now sits.
 *
 * Ordered by position so the list beside the document reads down it, with the
 * ones whose passage has gone at the end — they still say something, and
 * throwing away somebody's note because they deleted the sentence would be
 * throwing away the reason the sentence went.
 */
export function placeAll(text: string, annotations: readonly Annotation[]): PlacedAnnotation[] {
  const placed = annotations.map((annotation) => ({
    ...annotation,
    at: locate(text, annotation.anchor)
  }))

  return placed.sort((a, b) => {
    if (a.at === null && b.at === null) return a.createdAt - b.createdAt
    if (a.at === null) return 1
    if (b.at === null) return -1
    return a.at.from - b.at.from || a.createdAt - b.createdAt
  })
}

/** The side-file's name for a document. */
export function annotationFileFor(documentPath: string): string {
  return `${documentPath}.comments.json`
}

/**
 * Reads a side-file, refusing anything that is not one.
 *
 * A side-file sits next to a document where anyone can open it, so it has to
 * survive being edited by hand and being replaced by something else entirely.
 * Anything unreadable becomes no comments rather than an error: the document
 * still opens, which is what matters.
 */
export function parseAnnotations(json: string): Annotation[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return []
  }

  if (typeof parsed !== 'object' || parsed === null) return []
  const list = (parsed as { annotations?: unknown }).annotations
  if (!Array.isArray(list)) return []

  return list.filter(isAnnotation)
}

function isAnnotation(value: unknown): value is Annotation {
  if (typeof value !== 'object' || value === null) return false
  const it = value as Record<string, unknown>

  if (typeof it.id !== 'string' || it.id === '') return false
  if (typeof it.body !== 'string') return false

  const anchor = it.anchor
  if (typeof anchor !== 'object' || anchor === null) return false
  const within = anchor as Record<string, unknown>

  return (
    typeof within.quote === 'string' &&
    typeof within.prefix === 'string' &&
    typeof within.suffix === 'string' &&
    typeof within.start === 'number'
  )
}

export function serialiseAnnotations(annotations: readonly Annotation[]): string {
  const file: AnnotationFile = { version: ANNOTATION_VERSION, annotations: [...annotations] }
  return `${JSON.stringify(file, null, 2)}\n`
}

/** A short label for a comment in a list, from the passage it is about. */
export function annotationLabel(anchor: TextAnchor, limit = 60): string {
  const flat = anchor.quote.replace(/\s+/g, ' ').trim()
  if (flat === '') return ''
  return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat
}
