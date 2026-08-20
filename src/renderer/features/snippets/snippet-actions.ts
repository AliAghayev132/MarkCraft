// ── @shared ────────────────────────────────────────────────────────────────
import {
  expandSnippet,
  removeSnippet,
  stem,
  suggestSnippetName,
  upsertSnippet,
  type Snippet
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { toast, updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState, selectActiveDocument } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'

/**
 * The saved blocks, read without a hook.
 *
 * The slash menu is built inside a CodeMirror extension, which is not a React
 * tree — so the list has to be readable from anywhere. It comes from the same
 * store the settings screen writes to, so there is one copy of the truth.
 */
export function userSnippets(): Snippet[] {
  return getState().settings.values.snippets.items
}

/** A new id. Time-based, because the list is small and order is meaningful. */
export function newSnippetId(): string {
  return `snippet-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
}

export async function saveSnippet(snippet: Snippet): Promise<void> {
  await updateSettings({ snippets: { items: upsertSnippet(userSnippets(), snippet) } })
}

export async function deleteSnippet(id: string): Promise<void> {
  await updateSettings({ snippets: { items: removeSnippet(userSnippets(), id) } })
}

/**
 * Puts a snippet into whatever is being edited.
 *
 * The selection is read *before* the insertion replaces it, so `{{selection}}`
 * can wrap what was chosen — which is the whole point of having a snippet like
 * "wrap this in a callout".
 */
export function insertSnippet(snippet: Snippet): void {
  const document = selectActiveDocument(getState())

  const { text, cursor } = expandSnippet(snippet.body, {
    title: document ? stem(document.title) : '',
    selection: editorRegistry.selectedText(),
    now: new Date(),
    locale: getState().i18n.language
  })

  editorRegistry.insertText(text, cursor)
}

/**
 * Saves what is selected as a new snippet.
 *
 * Named from its first line rather than asking: somebody who selected a block
 * and reached for this wants it kept, and a dialog demanding a name before it
 * will do anything turns a one-second action into a decision. The name is
 * editable afterwards, in settings.
 */
export async function saveSelectionAsSnippet(): Promise<boolean> {
  const body = editorRegistry.selectedText()
  if (body.trim() === '') {
    toast.info(t('snippets.nothingSelected'))
    return false
  }

  const name = suggestSnippetName(body, t('snippets.untitled'))
  const snippet: Snippet = {
    id: newSnippetId(),
    name,
    // A trigger derived from the name is one the writer can guess later; a
    // clash is repaired below rather than refused, because refusing here would
    // lose the text they asked to keep.
    trigger: name,
    body
  }

  await saveSnippet(uniqueTrigger(snippet, userSnippets()))
  toast.success(t('snippets.savedToast', { name }))
  return true
}

/** The same snippet with a trigger nothing else is already using. */
function uniqueTrigger(snippet: Snippet, existing: readonly Snippet[]): Snippet {
  const taken = new Set(existing.filter((each) => each.id !== snippet.id).map((each) => each.trigger))

  let trigger = snippet.trigger
  for (let suffix = 2; taken.has(trigger); suffix++) trigger = `${snippet.trigger}-${suffix}`

  return { ...snippet, trigger }
}
