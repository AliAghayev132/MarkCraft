// ── @lib ───────────────────────────────────────────────────────────────────
import { DOMSerializer, type RichEditorInstance } from '@lib/editor/tiptap'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState, selectActiveDocument } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'
import { richHtmlToMarkdown } from '@features/editor/rich'

// ── types ──────────────────────────────────────────────────────────────────
import type { AiTarget } from './types'

/**
 * What the assistant should work on, and where the answer goes back.
 *
 * The rule is the one users already expect from every other editor: act on the
 * selection, or on the whole document when there is none. Both editing surfaces
 * have to answer it, and both have to answer it in *Markdown* — the document's
 * source of truth — rather than in whatever internal form they happen to use.
 */
export function readTarget(): AiTarget | null {
  const document = selectActiveDocument(getState())
  if (!document) return null

  const surface = editorRegistry.getSurface()

  if (surface === 'source') {
    const view = editorRegistry.getSourceView()
    const range = view?.state.selection.main

    if (view && range && range.from !== range.to) {
      return {
        scope: 'selection',
        text: view.state.sliceDoc(range.from, range.to),
        surface: 'source',
        range: { from: range.from, to: range.to }
      }
    }
  }

  if (surface === 'rich') {
    const editor = editorRegistry.getRichEditor()

    if (editor && !editor.state.selection.empty) {
      const markdown = selectionAsMarkdown(editor)
      if (markdown) return { scope: 'selection', text: markdown, surface: 'rich' }
    }
  }

  return {
    scope: 'document',
    text: document.content,
    surface: surface === 'rich' ? 'rich' : 'source'
  }
}

/**
 * Serialises the rich editor's selection through the same bridge the editor
 * round-trips through, so a selected table arrives as a table rather than as a
 * plain-text shadow of one.
 *
 * ProseMirror's serialiser is used rather than reading `innerHTML` off the live
 * view, which carries decorations, widgets and selection artefacts that are not
 * part of the document.
 */
function selectionAsMarkdown(editor: RichEditorInstance): string {
  const slice = editor.state.selection.content()
  const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content)

  const host = window.document.createElement('div')
  host.appendChild(fragment)

  return richHtmlToMarkdown(host.innerHTML, getState().settings.values.markdown).trim()
}
