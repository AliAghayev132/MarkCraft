// ── @lib ───────────────────────────────────────────────────────────────────
import {
  type ChangeSpec,
  EditorSelection,
  type EditorState,
  type EditorView,
  redo,
  undo
} from '@lib/editor/codemirror'

// ── types ──────────────────────────────────────────────────────────────────
import type { SelectionContext } from './types'

export function selectionOf(view: EditorView): SelectionContext {
  const range = view.state.selection.main
  return {
    from: range.from,
    to: range.to,
    text: view.state.sliceDoc(range.from, range.to),
    empty: range.empty
  }
}

/**
 * Wraps (or unwraps) each selection range with `marker`.
 *
 * With an empty selection the markers are inserted and the caret is placed
 * between them, so `Ctrl+B` then typing produces bold text — the behaviour of
 * every word processor.
 */
export function toggleWrap(view: EditorView, marker: string, endMarker = marker): boolean {
  const { state } = view

  view.dispatch(
    state.changeByRange((range) => {
      const before = state.sliceDoc(Math.max(0, range.from - marker.length), range.from)
      const after = state.sliceDoc(range.to, Math.min(state.doc.length, range.to + endMarker.length))

      // Already wrapped just outside the selection — remove the markers.
      if (before === marker && after === endMarker) {
        return {
          changes: [
            { from: range.from - marker.length, to: range.from },
            { from: range.to, to: range.to + endMarker.length }
          ],
          range: EditorSelection.range(range.from - marker.length, range.to - marker.length)
        }
      }

      const selected = state.sliceDoc(range.from, range.to)

      // Already wrapped inside the selection — strip them.
      if (
        selected.length >= marker.length + endMarker.length &&
        selected.startsWith(marker) &&
        selected.endsWith(endMarker)
      ) {
        const inner = selected.slice(marker.length, selected.length - endMarker.length)
        return {
          changes: { from: range.from, to: range.to, insert: inner },
          range: EditorSelection.range(range.from, range.from + inner.length)
        }
      }

      return {
        changes: { from: range.from, to: range.to, insert: `${marker}${selected}${endMarker}` },
        range: range.empty
          ? EditorSelection.cursor(range.from + marker.length)
          : EditorSelection.range(
              range.from + marker.length,
              range.to + marker.length
            )
      }
    })
  )

  view.focus()
  return true
}

/**
 * Applies or removes a line prefix (`# `, `> `, `- `, `1. `) across every line
 * the selection touches. If every line already has the prefix, it is removed.
 */
export function toggleLinePrefix(
  view: EditorView,
  prefix: string | ((lineIndex: number) => string),
  matcher: RegExp
): boolean {
  const { state } = view
  const range = state.selection.main
  const firstLine = state.doc.lineAt(range.from).number
  const lastLine = state.doc.lineAt(range.to).number

  const lines = []
  for (let number = firstLine; number <= lastLine; number++) {
    lines.push(state.doc.line(number))
  }

  const allPrefixed = lines.every((line) => matcher.test(line.text))
  const changes: ChangeSpec[] = []

  lines.forEach((line, index) => {
    if (allPrefixed) {
      const match = line.text.match(matcher)
      if (match) changes.push({ from: line.from, to: line.from + match[0].length })
    } else {
      const existing = line.text.match(matcher)
      const insert = typeof prefix === 'function' ? prefix(index) : prefix
      changes.push({
        from: line.from,
        to: existing ? line.from + existing[0].length : line.from,
        insert
      })
    }
  })

  if (changes.length === 0) return false

  view.dispatch({ changes, selection: mapAfterInsert(state, changes) })
  view.focus()
  return true
}

/**
 * Maps the selection across a change, biased to land *after* an insertion.
 *
 * CodeMirror's default bias puts a cursor sitting exactly at an insertion point
 * *before* the new text. For a line prefix that is precisely the wrong side: the
 * user clicks Heading 1 on an empty line and the caret ends up to the left of
 * the `# ` they just asked for, so the next thing they type lands outside the
 * marker. Everywhere else the two biases agree, which is why this went unnoticed
 * until someone started a heading or a list on a blank line.
 */
function mapAfterInsert(state: EditorState, changes: ChangeSpec): EditorSelection {
  return state.selection.map(state.changes(changes), 1)
}

export function toggleHeading(view: EditorView, level: number): boolean {
  const marker = `${'#'.repeat(level)} `
  const { state } = view
  const line = state.doc.lineAt(state.selection.main.from)
  const current = line.text.match(/^(#{1,6})\s+/)

  // Switching between heading levels replaces the marker rather than toggling
  // the line back to a paragraph.
  if (current && current[1]?.length !== level) {
    const changes = { from: line.from, to: line.from + current[0].length, insert: marker }
    view.dispatch({ changes, selection: mapAfterInsert(state, changes) })
    view.focus()
    return true
  }

  return toggleLinePrefix(view, marker, /^#{1,6}\s+/)
}

/** Demotes a heading line back to a paragraph. */
export function clearHeading(view: EditorView): boolean {
  const { state } = view
  const range = state.selection.main
  const firstLine = state.doc.lineAt(range.from).number
  const lastLine = state.doc.lineAt(range.to).number
  const changes: ChangeSpec[] = []

  for (let number = firstLine; number <= lastLine; number++) {
    const line = state.doc.line(number)
    const match = line.text.match(/^#{1,6}\s+/)
    if (match) changes.push({ from: line.from, to: line.from + match[0].length })
  }

  if (changes.length === 0) return false
  view.dispatch({ changes })
  view.focus()
  return true
}

export function toggleQuote(view: EditorView): boolean {
  return toggleLinePrefix(view, '> ', /^>\s?/)
}

export function toggleBulletList(view: EditorView, bullet: string): boolean {
  return toggleLinePrefix(view, `${bullet} `, /^\s*([-*+]|\d+[.)])\s+/)
}

export function toggleOrderedList(view: EditorView): boolean {
  return toggleLinePrefix(view, (index) => `${index + 1}. `, /^\s*([-*+]|\d+[.)])\s+/)
}

export function toggleTaskList(view: EditorView): boolean {
  return toggleLinePrefix(view, '- [ ] ', /^\s*[-*+]\s+(\[[ xX]\]\s+)?/)
}

export function insertBlock(view: EditorView, text: string, cursorOffset?: number): boolean {
  const range = view.state.selection.main
  const line = view.state.doc.lineAt(range.from)

  // Start a new block rather than splicing into the middle of a paragraph.
  const needsLeadingBreak = line.text.trim().length > 0
  const prefix = needsLeadingBreak ? '\n\n' : ''
  const insert = `${prefix}${text}`
  const at = needsLeadingBreak ? line.to : line.from

  view.dispatch({
    changes: { from: at, to: Math.max(at, range.to), insert },
    selection: { anchor: at + (cursorOffset ?? insert.length) }
  })
  view.focus()
  return true
}

export function insertInline(view: EditorView, text: string, cursorOffset?: number): boolean {
  const range = view.state.selection.main
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: { anchor: range.from + (cursorOffset ?? text.length) }
  })
  view.focus()
  return true
}

export function insertCodeBlock(view: EditorView, language = ''): boolean {
  const selected = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)
  const body = selected || ''
  const text = `\`\`\`${language}\n${body}\n\`\`\``
  // Place the caret on the (possibly empty) body line.
  return insertBlock(view, text, `\`\`\`${language}\n`.length + body.length)
}

export function insertHorizontalRule(view: EditorView): boolean {
  return insertBlock(view, '---\n')
}

export function undoSource(view: EditorView): boolean {
  const result = undo(view)
  view.focus()
  return result
}

export function redoSource(view: EditorView): boolean {
  const result = redo(view)
  view.focus()
  return result
}

export function goToLine(view: EditorView, lineNumber: number): void {
  const clamped = Math.max(1, Math.min(lineNumber, view.state.doc.lines))
  const line = view.state.doc.line(clamped)
  view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true })
  view.focus()
}

/** Detects which formatting marks apply at the caret, for toolbar state. */
export function activeMarksAt(view: EditorView): Set<string> {
  const marks = new Set<string>()
  const { state } = view
  const range = state.selection.main
  const line = state.doc.lineAt(range.from)
  const before = state.sliceDoc(line.from, range.from)
  const after = state.sliceDoc(range.to, line.to)

  const headingMatch = line.text.match(/^(#{1,6})\s+/)
  if (headingMatch) marks.add(`heading-${headingMatch[1]?.length ?? 1}`)
  if (/^>\s?/.test(line.text)) marks.add('quote')
  if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line.text)) marks.add('task')
  else if (/^\s*[-*+]\s+/.test(line.text)) marks.add('bullet')
  if (/^\s*\d+[.)]\s+/.test(line.text)) marks.add('ordered')

  if (/\*\*[^*]*$/.test(before) && /^[^*]*\*\*/.test(after)) marks.add('bold')
  if (/(?<!\*)\*[^*]*$|_[^_]*$/.test(before) && /^[^*]*\*(?!\*)|^[^_]*_/.test(after))
    marks.add('italic')
  if (/~~[^~]*$/.test(before) && /^[^~]*~~/.test(after)) marks.add('strike')
  if (/`[^`]*$/.test(before) && /^[^`]*`/.test(after)) marks.add('code')

  return marks
}
