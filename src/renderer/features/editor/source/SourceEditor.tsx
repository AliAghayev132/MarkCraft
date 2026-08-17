// ── @lib ───────────────────────────────────────────────────────────────────
import { EditorState, EditorView } from '@lib/editor/codemirror'
import { useEffect, useLayoutEffect, useRef } from '@lib/react'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'
import {
  buildExtensions,
  readOnlyExtension,
  reconfigureFor
} from './extensions'

// ── types ──────────────────────────────────────────────────────────────────
import type { SourceEditorProps } from './types'

/**
 * Per-document editor state cache.
 *
 * Switching tabs must not lose undo history, cursor or scroll position, and
 * rebuilding a `EditorState` for a large document on every switch is
 * measurably slow. `EditorState` is immutable, so keeping one per document and
 * swapping the view's state is both correct and effectively free.
 */
const stateCache = new Map<string, EditorState>()

export function disposeSourceState(documentId: string): void {
  stateCache.delete(documentId)
}

export function SourceEditor({
  documentId,
  value,
  settings,
  readOnly = false,
  onChange,
  onCursor,
  onScroll,
  onSave,
  revealLine
}: SourceEditorProps): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewRef = useRef<EditorView | null>(null)
  const documentIdRef = useRef(documentId)

  // Callbacks live in a ref so the extension list is built exactly once; a new
  // closure identity must never cause the editor to be reconstructed.
  const callbacks = useRef({ onChange, onCursor, onScroll, onSave })
  callbacks.current = { onChange, onCursor, onScroll, onSave }

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    const extensions = buildExtensions(settings, {
      onChange: (text) => callbacks.current.onChange(text),
      onCursor: (line, column, length) => callbacks.current.onCursor(line, column, length),
      onScroll: (top) => callbacks.current.onScroll?.(top),
      onSave: () => callbacks.current.onSave?.()
    })

    const initial =
      stateCache.get(documentIdRef.current) ??
      EditorState.create({ doc: value, extensions })

    const view = new EditorView({ state: initial, parent: host })
    viewRef.current = view
    editorRegistry.setSourceView(view)

    return () => {
      stateCache.set(documentIdRef.current, view.state)
      editorRegistry.setSourceView(null)
      view.destroy()
      viewRef.current = null
    }
    // Intentionally mounted once: document switching and settings changes are
    // handled by the effects below rather than by remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Document switching ───────────────────────────────────────────────── */
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (documentIdRef.current === documentId) return

    stateCache.set(documentIdRef.current, view.state)
    documentIdRef.current = documentId

    const cached = stateCache.get(documentId)
    if (cached && cached.doc.toString() === value) {
      view.setState(cached)
    } else {
      const extensions = buildExtensions(settings, {
        onChange: (text) => callbacks.current.onChange(text),
        onCursor: (line, column, length) => callbacks.current.onCursor(line, column, length),
        onScroll: (top) => callbacks.current.onScroll?.(top),
        onSave: () => callbacks.current.onSave?.()
      })
      view.setState(EditorState.create({ doc: value, extensions }))
    }
    // `value`/`settings` are read, not depended on: this effect must run only
    // when the document identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  /* ── External content replacement (revert, reload from disk, rich edit) ── */
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (documentIdRef.current !== documentId) return

    const current = view.state.doc.toString()
    if (current === value) return

    // Keep the caret where it was if the document is still long enough,
    // otherwise clamp — reloading a file must not throw the cursor to 0.
    const anchor = Math.min(view.state.selection.main.anchor, value.length)

    view.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      selection: { anchor },
      // The replacement is not a user edit; it must not be undoable as one.
      annotations: []
    })
  }, [value, documentId])

  /* ── Settings ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    viewRef.current?.dispatch({ effects: reconfigureFor(settings) })
  }, [settings])

  /* ── Read-only ────────────────────────────────────────────────────────── */
  useEffect(() => {
    viewRef.current?.dispatch({ effects: readOnlyExtension(readOnly) })
  }, [readOnly])

  /* ── Reveal a specific line (search results, go to line) ──────────────── */
  useEffect(() => {
    const view = viewRef.current
    if (!view || !revealLine) return

    const lineNumber = Math.max(1, Math.min(revealLine, view.state.doc.lines))
    const line = view.state.doc.line(lineNumber)

    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      scrollIntoView: true
    })
    view.focus()
  }, [revealLine])

  return (
    <div
      ref={hostRef}
      className="mc-source-host"
      onFocus={() => editorRegistry.setSurface('source')}
    />
  )
}
