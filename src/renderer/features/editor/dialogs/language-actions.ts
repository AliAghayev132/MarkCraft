// ── @lib ───────────────────────────────────────────────────────────────────
import { codeLanguages } from '@lib/editor/languages'

// ── @shared ────────────────────────────────────────────────────────────────
import { fenceAt, type SlashCandidate } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'

/**
 * The languages a fence can be set to.
 *
 * Taken from the highlighter's own table rather than a second list, so a
 * language can never be offered that nothing knows how to colour — and adding
 * a grammar keeps being the one-line change it is meant to be.
 */
export function languageChoices(): SlashCandidate[] {
  return codeLanguages
    .map((description) => ({
      id: description.name,
      label: description.name,
      keywords: [...(description.alias ?? [])]
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Rewrites the info string of the fence the caret is in.
 *
 * Only the info string is replaced, not the line and not the block: a
 * whole-document rewrite would land in the undo history as one enormous change
 * and would move every mark and selection in the file.
 */
export function setFenceLanguageAtCaret(language: string): boolean {
  const view = editorRegistry.getSourceView()
  if (!view) return false

  const { state } = view
  const caretLine = state.doc.lineAt(state.selection.main.head)
  const fence = fenceAt(state.doc.toString(), caretLine.number - 1)
  if (!fence) return false

  const opening = state.doc.line(fence.open + 1)

  view.dispatch({
    changes: {
      from: opening.from + fence.infoFrom,
      to: opening.from + fence.infoTo,
      insert: language.trim()
    }
  })
  view.focus()

  return true
}

/** Whether the caret is inside a fence — for enabling the command. */
export function caretIsInFence(): boolean {
  const view = editorRegistry.getSourceView()
  if (!view) return false

  const { state } = view
  return fenceAt(state.doc.toString(), state.doc.lineAt(state.selection.main.head).number - 1) !== null
}
