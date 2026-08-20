/**
 * Markdown formatting as a pure operation on text and a selection.
 *
 * The editor's own commands work on CodeMirror ranges and change specs, which
 * is the right mechanism there and no use anywhere else. A card on the canvas
 * is a plain text field, and so is any other place a small piece of Markdown
 * gets written — the *rules* are the same in all of them, and this is where
 * they live so they are only decided once.
 *
 * Everything here takes a document and gives one back. Nothing touches the DOM,
 * nothing knows what a caret is, and every case can be stated as a sentence
 * about a string.
 */

export interface TextDocument {
  text: string
  /** Selection start, in characters. Equal to `to` when nothing is selected. */
  from: number
  to: number
}

const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value))

function normalise(document: TextDocument): TextDocument {
  const length = document.text.length
  const from = clamp(Math.min(document.from, document.to), 0, length)
  const to = clamp(Math.max(document.from, document.to), 0, length)
  return { text: document.text, from, to }
}

/**
 * Wraps the selection in a marker, or takes the marker off if it is already
 * there.
 *
 * The markers just outside the selection count as being on it. Someone who
 * selects the words inside `**bold**` by double-clicking has selected `bold`,
 * not `**bold**`, and pressing bold again has to make it plain rather than
 * adding a second pair.
 */
export function toggleWrap(
  document: TextDocument,
  marker: string,
  endMarker = marker
): TextDocument {
  const { text, from, to } = normalise(document)
  const selected = text.slice(from, to)

  // Already wrapped, inside the selection.
  if (
    selected.length >= marker.length + endMarker.length &&
    selected.startsWith(marker) &&
    selected.endsWith(endMarker)
  ) {
    const inner = selected.slice(marker.length, selected.length - endMarker.length)
    return {
      text: text.slice(0, from) + inner + text.slice(to),
      from,
      to: from + inner.length
    }
  }

  /*
   * Already wrapped, just outside it — but only when the run of markers out
   * there is exactly this marker and no longer. `this` selected inside
   * `**this**` is surrounded by a run of two asterisks; asking for italic there
   * means `***this***`, not peeling one asterisk off a pair that belongs
   * together.
   */
  const before = text.slice(Math.max(0, from - marker.length), from)
  const after = text.slice(to, to + endMarker.length)
  const exactRun =
    runLengthBefore(text, from, marker[0]) === marker.length &&
    runLengthAfter(text, to, endMarker[endMarker.length - 1]) === endMarker.length

  if (before === marker && after === endMarker && exactRun) {
    const start = from - marker.length
    return {
      text: text.slice(0, start) + selected + text.slice(to + endMarker.length),
      from: start,
      to: start + selected.length
    }
  }

  return {
    text: text.slice(0, from) + marker + selected + endMarker + text.slice(to),
    // The selection keeps hold of the words, not the markers, so pressing
    // italic straight after bold wraps the same text again.
    from: from + marker.length,
    to: to + marker.length
  }
}

/** How many of `character` sit immediately before `at`. */
function runLengthBefore(text: string, at: number, character: string): number {
  let run = 0
  while (at - run - 1 >= 0 && text[at - run - 1] === character) run++
  return run
}

/** How many of `character` sit immediately after `at`. */
function runLengthAfter(text: string, at: number, character: string): number {
  let run = 0
  while (at + run < text.length && text[at + run] === character) run++
  return run
}

/* ────────────────────────────────────────────────────────────────────────────
 * Whole lines
 * ─────────────────────────────────────────────────────────────────────────── */

interface LineSpan {
  start: number
  end: number
}

function linesTouched(text: string, from: number, to: number): LineSpan[] {
  const spans: LineSpan[] = []

  let start = text.lastIndexOf('\n', from - 1) + 1
  for (;;) {
    const newline = text.indexOf('\n', start)
    const end = newline === -1 ? text.length : newline
    spans.push({ start, end })

    if (newline === -1 || end >= to) break
    start = newline + 1
  }

  return spans
}

/**
 * Puts a prefix on every line the selection touches, or takes it off when all
 * of them already have it.
 *
 * All of them, not any: a selection where one line is quoted and three are not
 * is someone asking for four quoted lines, not for one to be unquoted.
 */
export function toggleLinePrefix(
  document: TextDocument,
  prefix: string,
  pattern: RegExp
): TextDocument {
  const { text, from, to } = normalise(document)
  const lines = linesTouched(text, from, to)
  const everyLine = lines.every((line) => pattern.test(text.slice(line.start, line.end)))

  let out = ''
  let at = 0
  let shiftFrom = 0
  let shiftTo = 0

  for (const line of lines) {
    out += text.slice(at, line.start)
    const content = text.slice(line.start, line.end)

    let replacement: string
    if (everyLine) {
      const match = content.match(pattern)
      replacement = match ? content.slice(match[0].length) : content
    } else {
      const match = content.match(pattern)
      replacement = prefix + (match ? content.slice(match[0].length) : content)
    }

    const delta = replacement.length - content.length
    if (line.start <= from) shiftFrom += delta
    if (line.start <= to) shiftTo += delta

    out += replacement
    at = line.end
  }
  out += text.slice(at)

  const length = out.length
  return {
    text: out,
    from: clamp(from + shiftFrom, 0, length),
    to: clamp(to + shiftTo, 0, length)
  }
}

const HEADING = /^#{1,6}[ \t]+/

/**
 * Makes the touched lines a heading of the given level, or plain paragraphs at
 * level zero.
 *
 * Choosing the level a line already has takes it back to a paragraph, which is
 * how the same button both applies and removes. Choosing a different level
 * replaces the marker rather than stacking hashes.
 */
export function setHeading(document: TextDocument, level: number): TextDocument {
  const { text, from, to } = normalise(document)
  const lines = linesTouched(text, from, to)

  const marker = level >= 1 && level <= 6 ? `${'#'.repeat(level)} ` : ''
  const alreadyThere =
    marker !== '' &&
    lines.every((line) => text.slice(line.start, line.end).startsWith(marker))

  const wanted = alreadyThere ? '' : marker

  let out = ''
  let at = 0
  let shiftFrom = 0
  let shiftTo = 0

  for (const line of lines) {
    out += text.slice(at, line.start)
    const content = text.slice(line.start, line.end)
    const existing = content.match(HEADING)
    const bare = existing ? content.slice(existing[0].length) : content
    const replacement = wanted + bare

    const delta = replacement.length - content.length
    if (line.start <= from) shiftFrom += delta
    if (line.start <= to) shiftTo += delta

    out += replacement
    at = line.end
  }
  out += text.slice(at)

  const length = out.length
  return {
    text: out,
    from: clamp(from + shiftFrom, 0, length),
    to: clamp(to + shiftTo, 0, length)
  }
}

/** The heading level of the line the caret is on, or 0 for a paragraph. */
export function headingLevelAt(document: TextDocument): number {
  const { text, from } = normalise(document)
  const start = text.lastIndexOf('\n', from - 1) + 1
  const newline = text.indexOf('\n', start)
  const line = text.slice(start, newline === -1 ? text.length : newline)

  return line.match(/^(#{1,6})[ \t]+/)?.[1].length ?? 0
}

/* ────────────────────────────────────────────────────────────────────────────
 * Links
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Turns the selection into a link.
 *
 * A selection that already looks like a URL becomes the target with the label
 * left to be typed; anything else becomes the label with the target left to be
 * typed. Either way the selection lands on the part still to be filled in, so
 * the next keystroke goes where it is wanted.
 */
export function insertLink(document: TextDocument, url = ''): TextDocument {
  const { text, from, to } = normalise(document)
  const selected = text.slice(from, to)

  const looksLikeUrl = /^(https?:\/\/|www\.|mailto:)\S+$/i.test(selected.trim())
  const label = looksLikeUrl ? '' : selected
  const target = url !== '' ? url : looksLikeUrl ? selected.trim() : ''

  const inserted = `[${label}](${target})`
  const text2 = text.slice(0, from) + inserted + text.slice(to)

  // On the empty half: the label when there is a target, the target otherwise.
  const start = label === '' ? from + 1 : from + label.length + 3
  const end = label === '' ? from + 1 : from + label.length + 3 + target.length

  return { text: text2, from: start, to: end }
}

/**
 * Puts text in, replacing the selection, and leaves the caret where it is most
 * likely wanted.
 */
export function insertText(
  document: TextDocument,
  inserted: string,
  cursorOffset = inserted.length
): TextDocument {
  const { text, from, to } = normalise(document)
  const at = from + cursorOffset

  return { text: text.slice(0, from) + inserted + text.slice(to), from: at, to: at }
}
