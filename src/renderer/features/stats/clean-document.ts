// ── @shared ────────────────────────────────────────────────────────────────
import { fixCount, fixMarkdown } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { getSettings, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { contentChanged, dispatch, getState, selectActiveDocument } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'

/**
 * Repairs the formatting problems that have one correct answer.
 *
 * Applied through the editor when there is one, so it lands in the undo history
 * as a single step — a clean-up that could not be undone in one press would be
 * a thing users are afraid to try. Only when there is no live source view does
 * it go through the store, which is the same route the AI apply takes.
 */
export function cleanDocument(): boolean {
  const document_ = selectActiveDocument(getState())
  if (!document_) return false

  const outcome = fixMarkdown(document_.content, {
    tabWidth: getSettings().editor.tabSize
  })

  if (outcome.clean) {
    toast.info(t('clean.nothing'))
    return false
  }

  const view = editorRegistry.getSourceView()
  if (view) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: outcome.text },
      // The caret would otherwise be mapped to wherever the last change landed,
      // which after a whole-document rewrite is nowhere meaningful.
      selection: { anchor: Math.min(view.state.selection.main.head, outcome.text.length) }
    })
  } else {
    dispatch(contentChanged({ id: document_.id, content: outcome.text }))
  }

  const rules = Object.keys(outcome.applied).sort().join(', ')
  toast.success(t('clean.done', { count: fixCount(outcome) }), rules)

  return true
}
