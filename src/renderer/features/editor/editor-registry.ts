// ── @lib ───────────────────────────────────────────────────────────────────
import type { EditorView } from '@lib/editor/codemirror'
import type { Editor as RichEditor } from '@lib/editor/tiptap'

// ── types ──────────────────────────────────────────────────────────────────
import type { EditorSurface } from './types'

/**
 * A tiny, deliberately non-reactive registry of the live editor instances.
 *
 * The toolbar, command palette and keyboard shortcuts all need to act on
 * "whatever the user is editing right now". Threading editor instances through
 * React props would re-render the tree on every focus change; holding them here
 * keeps the formatting commands one function call away from any caller while
 * the editors themselves stay uncontrolled.
 */
class EditorRegistry {
  private sourceView: EditorView | null = null
  private richEditor: RichEditor | null = null
  private surface: EditorSurface = null
  private readonly listeners = new Set<() => void>()

  setSourceView(view: EditorView | null): void {
    this.sourceView = view
    this.emit()
  }

  setRichEditor(editor: RichEditor | null): void {
    this.richEditor = editor
    this.emit()
  }

  setSurface(surface: EditorSurface): void {
    if (this.surface === surface) return
    this.surface = surface
    this.emit()
  }

  getSourceView(): EditorView | null {
    return this.sourceView
  }

  getRichEditor(): RichEditor | null {
    return this.richEditor
  }

  /** Which surface last had focus — the target for formatting commands. */
  getSurface(): EditorSurface {
    return this.surface
  }

  /**
   * Inserts text at the caret of whichever surface is active.
   *
   * Here rather than in each caller because "the thing the user is editing"
   * is exactly what this registry knows, and an emoji, a snippet and a
   * template all need the same answer.
   */
  insertText(text: string, cursorOffset?: number): void {
    const caret = cursorOffset ?? text.length

    if (this.surface === 'rich') {
      const editor = this.richEditor
      if (!editor) return

      // Where the text lands, so the caret can be moved back into it. Tiptap
      // leaves the caret at the end, which is wrong for a snippet that says
      // where it wants to be resumed.
      const at = editor.state.selection.from
      editor.chain().focus().insertContent(text).run()
      if (cursorOffset !== undefined) {
        editor.commands.setTextSelection(Math.min(at + caret, editor.state.doc.content.size))
      }
      return
    }

    const view = this.sourceView
    if (!view) return

    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + caret }
    })
    view.focus()
  }

  /**
   * What is selected on the active surface, or an empty string.
   *
   * Plain text in both cases: a snippet body is Markdown, and handing it a
   * ProseMirror fragment would make it a different thing depending on which
   * editor happened to be open.
   */
  selectedText(): string {
    if (this.surface === 'rich') {
      const editor = this.richEditor
      if (!editor) return ''
      const { from, to } = editor.state.selection
      return editor.state.doc.textBetween(from, to, '\n')
    }

    const view = this.sourceView
    if (!view) return ''
    const { from, to } = view.state.selection.main
    return view.state.sliceDoc(from, to)
  }

  /**
   * The selection as offsets into the Markdown, or null.
   *
   * Only the source editor can answer: a rich-editor position counts nodes in
   * a document tree, and pretending it were a character offset into the
   * Markdown would put a comment on the wrong sentence. A caller that needs an
   * answer from the rich editor has `selectedText()` and can look for it.
   */
  selectionRange(): { from: number; to: number } | null {
    if (this.surface === 'rich') return null

    const view = this.sourceView
    if (!view) return null

    const { from, to } = view.state.selection.main
    return { from, to }
  }

  /** Selects a passage and scrolls to it, so a list can point at the text. */
  revealRange(from: number, to: number): boolean {
    const view = this.sourceView
    if (!view) return false

    const end = Math.min(view.state.doc.length, Math.max(from, to))
    const start = Math.max(0, Math.min(from, to))

    view.dispatch({ selection: { anchor: start, head: end }, scrollIntoView: true })
    view.focus()
    return true
  }

  focusActive(): void {
    if (this.surface === 'rich') this.richEditor?.commands.focus()
    else this.sourceView?.focus()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}

export const editorRegistry = new EditorRegistry()
