// ── @shared ────────────────────────────────────────────────────────────────
import {
  anchorFor,
  annotationFileFor,
  parseAnnotations,
  serialiseAnnotations,
  type Annotation
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState, selectActiveDocument } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'

/**
 * A document's comments, held outside React.
 *
 * Outside because two very different things need them at once: a panel that
 * lists them, and the editor that has to mark the passages. Routing the list
 * through Redux would re-render the editor's whole subtree whenever somebody
 * typed a character into a comment box.
 *
 * Comments live in a file beside the document — `notes.md.comments.json` —
 * rather than inside it. A comment is not part of what was written: putting it
 * in the Markdown would change the document for everyone who opens it in
 * anything else, and deleting the comments would then be an edit.
 */
const listeners = new Set<() => void>()

interface State {
  /** The document the comments belong to, or null when none is open. */
  path: string | null
  annotations: Annotation[]
  loading: boolean
}

let state: State = { path: null, annotations: [], loading: false }

function emit(): void {
  for (const listener of listeners) listener()
}

function set(next: Partial<State>): void {
  state = { ...state, ...next }
  emit()
}

async function readFile(path: string): Promise<Annotation[]> {
  const side = annotationFileFor(path)

  // Asked rather than probed: most documents have no comments, and letting the
  // read fail would write an error to the log every time one is opened.
  if (!(await fileService.exists(side))) return []

  try {
    return parseAnnotations((await fileService.read(side)).content)
  } catch {
    return []
  }
}

async function writeFile(path: string, annotations: readonly Annotation[]): Promise<void> {
  const side = annotationFileFor(path)

  try {
    if (annotations.length === 0) {
      // An empty side-file is litter in somebody's folder. Removing the last
      // comment removes the file with it.
      if (await fileService.exists(side)) await fileService.remove([side], false)
      return
    }

    await fileService.write({ path: side, content: serialiseAnnotations(annotations), eol: 'lf' })
  } catch (error) {
    toast.error(t('comments.saveFailed'), error instanceof Error ? error.message : String(error))
  }
}

export const annotationStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  get(): State {
    return state
  },

  /** Loads the comments for a document, or clears them when none is open. */
  async open(path: string | null): Promise<void> {
    if (path === state.path) return

    if (path === null) {
      set({ path: null, annotations: [], loading: false })
      return
    }

    set({ path, annotations: [], loading: true })
    const annotations = await readFile(path)

    // The document may have been closed, or another opened, while this read
    // was in flight; the answer is then about a file nobody is looking at.
    if (state.path !== path) return
    set({ annotations, loading: false })
  },

  /** Re-reads from disk — for when the side-file changed underneath us. */
  async reload(): Promise<void> {
    const path = state.path
    if (path === null) return

    const annotations = await readFile(path)
    if (state.path === path) set({ annotations })
  },

  async replace(annotations: Annotation[]): Promise<void> {
    const path = state.path
    if (path === null) return

    set({ annotations })
    await writeFile(path, annotations)
  }
}

/**
 * The passage to comment on, as offsets into the Markdown.
 *
 * The source editor knows exactly. The rich editor cannot — its positions
 * count nodes in a tree — so what was selected is looked for in the Markdown
 * instead. That finds the wrong occurrence only when the same words appear
 * twice and the writer picked the second, and the comment then sits on the
 * first: visibly wrong, in the same document, where it can be moved. Refusing
 * to take a comment at all would be worse.
 */
function rangeToComment(content: string): { from: number; to: number } | null {
  const exact = editorRegistry.selectionRange()
  if (exact && exact.from !== exact.to) return exact

  const text = editorRegistry.selectedText().trim()
  if (text === '') return null

  const at = content.indexOf(text)
  return at === -1 ? null : { from: at, to: at + text.length }
}

/** A new id, unique enough for a list one person is writing. */
function newId(): string {
  return `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
}

/**
 * Leaves a comment on whatever is selected.
 *
 * Refuses an empty selection rather than commenting on the caret: a comment
 * has to be *about* something, and one anchored to a point between two
 * characters cannot be found again once either of them changes.
 */
export async function addComment(body: string): Promise<boolean> {
  const document = selectActiveDocument(getState())
  if (!document?.path) {
    toast.info(t('comments.needsFile'))
    return false
  }

  const range = rangeToComment(document.content)
  if (!range) {
    toast.info(t('comments.needsSelection'))
    return false
  }

  const annotation: Annotation = {
    id: newId(),
    anchor: anchorFor(document.content, range.from, range.to),
    body,
    createdAt: Date.now(),
    resolved: false
  }

  await annotationStore.replace([...annotationStore.get().annotations, annotation])
  return true
}

export async function editComment(id: string, body: string): Promise<void> {
  await annotationStore.replace(
    annotationStore.get().annotations.map((each) => (each.id === id ? { ...each, body } : each))
  )
}

export async function resolveComment(id: string): Promise<void> {
  await annotationStore.replace(
    annotationStore
      .get()
      .annotations.map((each) => (each.id === id ? { ...each, resolved: !each.resolved } : each))
  )
}

export async function deleteComment(id: string): Promise<void> {
  await annotationStore.replace(
    annotationStore.get().annotations.filter((each) => each.id !== id)
  )
}
