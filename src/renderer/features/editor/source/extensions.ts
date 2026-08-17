// ── @lib ───────────────────────────────────────────────────────────────────
import {
  bracketMatching,
  closeBrackets,
  closeBracketsKeymap,
  Compartment,
  defaultKeymap,
  drawSelection,
  dropCursor,
  EditorState,
  EditorView,
  type Extension,
  foldGutter,
  foldKeymap,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSelectionMatches,
  history,
  historyKeymap,
  indentOnInput,
  indentUnit,
  indentWithTab,
  keymap,
  Prec,
  lineNumbers,
  markdown,
  markdownKeymap,
  rectangularSelection,
  search,
  standardKeymap,
  type StateEffect
} from '@lib/editor/codemirror'
import { codeLanguages } from '@lib/editor/languages'

// ── @shared ────────────────────────────────────────────────────────────────
import type { EditorSettings } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { slashExtension } from '@features/slash'
import { themeExtensions } from './theme'

// ── types ──────────────────────────────────────────────────────────────────
import type { SourceEditorCallbacks } from './types'

/**
 * Compartments let a settings change (font size, wrapping, line numbers) be
 * applied by dispatching a reconfigure effect instead of tearing down the
 * editor. That matters for more than performance: rebuilding the state would
 * discard undo history and the cursor, which users read as data loss.
 */
export const compartments = {
  lineNumbers: new Compartment(),
  lineWrapping: new Compartment(),
  activeLine: new Compartment(),
  brackets: new Compartment(),
  indent: new Compartment(),
  tabSize: new Compartment(),
  autoIndent: new Compartment(),
  spellCheck: new Compartment(),
  readOnly: new Compartment()
}

function settingsExtensions(settings: EditorSettings): Extension[] {
  return [
    compartments.lineNumbers.of(
      settings.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []
    ),
    compartments.lineWrapping.of(settings.wordWrap ? EditorView.lineWrapping : []),
    compartments.activeLine.of(settings.highlightActiveLine ? highlightActiveLine() : []),
    compartments.brackets.of(settings.bracketMatching ? [bracketMatching(), closeBrackets()] : []),
    compartments.indent.of(
      indentUnit.of(settings.insertSpaces ? ' '.repeat(settings.tabSize) : '\t')
    ),
    compartments.tabSize.of(EditorState.tabSize.of(settings.tabSize)),
    compartments.autoIndent.of(settings.autoIndent ? indentOnInput() : []),
    compartments.spellCheck.of(
      EditorView.contentAttributes.of({
        spellcheck: String(settings.spellCheck),
        autocorrect: 'off',
        autocapitalize: 'off'
      })
    ),
    compartments.readOnly.of([])
  ]
}

/** Reconfigure effects for a settings change, applied via a single dispatch. */
export function reconfigureFor(settings: EditorSettings): StateEffect<unknown>[] {
  return [
    compartments.lineNumbers.reconfigure(
      settings.lineNumbers ? [lineNumbers(), highlightActiveLineGutter()] : []
    ),
    compartments.lineWrapping.reconfigure(settings.wordWrap ? EditorView.lineWrapping : []),
    compartments.activeLine.reconfigure(settings.highlightActiveLine ? highlightActiveLine() : []),
    compartments.brackets.reconfigure(
      settings.bracketMatching ? [bracketMatching(), closeBrackets()] : []
    ),
    compartments.indent.reconfigure(
      indentUnit.of(settings.insertSpaces ? ' '.repeat(settings.tabSize) : '\t')
    ),
    compartments.tabSize.reconfigure(EditorState.tabSize.of(settings.tabSize)),
    compartments.autoIndent.reconfigure(settings.autoIndent ? indentOnInput() : []),
    compartments.spellCheck.reconfigure(
      EditorView.contentAttributes.of({
        spellcheck: String(settings.spellCheck),
        autocorrect: 'off',
        autocapitalize: 'off'
      })
    )
  ]
}

export function buildExtensions(
  settings: EditorSettings,
  callbacks: SourceEditorCallbacks
): Extension[] {
  return [
    // ── Language ───────────────────────────────────────────────────────────
    markdown({ codeLanguages, addKeymap: false }),

    // ── Core editing behaviour ─────────────────────────────────────────────
    history(),
    drawSelection(),
    dropCursor(),
    rectangularSelection(),
    highlightSelectionMatches(),
    foldGutter({ openText: '⌄', closedText: '›' }),
    EditorState.allowMultipleSelections.of(true),

    // The search *state* is enabled (so Find Next, match highlighting and the
    // query cursor all work) while its built-in panel stays hidden — the
    // application draws its own (§26).
    search({ top: true }),

    ...settingsExtensions(settings),
    ...themeExtensions(),

    // The `/` block menu. Its keymap is raised above everything, including the
    // Markdown one below, so Enter picks a block instead of breaking the line.
    slashExtension(),

    /*
     * ── Keymaps ────────────────────────────────────────────────────────────
     *
     * The Markdown keymap is raised above the defaults on purpose. Enter is
     * bound by both, the first binding to return true wins, and the default
     * one always returns true — so pressing Enter inside a list ran plain
     * "insert a newline" and the list simply stopped. Continuing the list is
     * the whole reason the Markdown keymap is here, so it goes first.
     */
    Prec.high(keymap.of([...markdownKeymap])),

    keymap.of([
      // Save is bound here as well as globally so it survives even while focus
      // is deep inside the editor's own handlers.
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          callbacks.onSave?.()
          return true
        }
      },
      ...closeBracketsKeymap,
      ...standardKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      indentWithTab
    ]),

    // ── Change and selection reporting ─────────────────────────────────────
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        callbacks.onChange(update.state.doc.toString())
      }

      if (update.selectionSet || update.docChanged) {
        const range = update.state.selection.main
        const line = update.state.doc.lineAt(range.head)
        callbacks.onCursor(line.number, range.head - line.from + 1, range.to - range.from)
      }
    }),

    EditorView.domEventHandlers({
      scroll: (_event, view) => {
        callbacks.onScroll?.(view.scrollDOM.scrollTop)
        return false
      }
    })
  ]
}

export function readOnlyExtension(readOnly: boolean): StateEffect<unknown> {
  return compartments.readOnly.reconfigure(
    readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []
  )
}
