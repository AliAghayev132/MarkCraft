// ── @lib ───────────────────────────────────────────────────────────────────
import { createSelector, createSlice, nanoid, type PayloadAction } from '@lib/redux'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename, dirname, pathKey, pathsEqual, stem } from '@shared'
import type { CursorPosition, FileContent, FileStamp, ViewMode } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { ClosedDocument, DocumentModel, DocumentsState, ExternalState } from '@store/slices/types'

const initialState: DocumentsState = {
  entities: {},
  order: [],
  activeId: null,
  closed: [],
  nextUntitled: 1
}

const MAX_CLOSED_HISTORY = 12

/**
 * A brand-new untitled document is dirty the moment it contains anything, so
 * its "saved" baseline is a value the content can never equal.
 */
const NEVER_SAVED = ''

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    untitledCreated: {
      reducer(
        state,
        action: PayloadAction<{ id: string; content: string; viewMode: ViewMode }>
      ) {
        const { id, content, viewMode } = action.payload
        const index = state.nextUntitled

        state.entities[id] = {
          id,
          path: null,
          title: `Untitled-${index}`,
          content,
          savedContent: content === '' ? '' : NEVER_SAVED,
          stamp: null,
          eol: 'lf',
          bom: false,
          viewMode,
          cursor: { line: 1, column: 1 },
          scrollTop: 0,
          external: 'none',
          externalStamp: null,
          pinned: false,
          locked: false,
          wordGoal: null,
          untitledIndex: index
        }

        state.order.push(id)
        state.activeId = id
        state.nextUntitled = index + 1
      },
      prepare(content: string, viewMode: ViewMode) {
        return { payload: { id: nanoid(), content, viewMode } }
      }
    },

    fileAdopted: {
      reducer(state, action: PayloadAction<{ id: string; file: FileContent; viewMode: ViewMode }>) {
        const { id, file, viewMode } = action.payload

        state.entities[id] = {
          id,
          path: file.path,
          title: basename(file.path),
          content: file.content,
          savedContent: file.content,
          stamp: file.stamp,
          eol: file.eol,
          bom: file.bom,
          viewMode,
          cursor: { line: 1, column: 1 },
          scrollTop: 0,
          external: 'none',
          externalStamp: null,
          pinned: false,
          locked: false,
          wordGoal: null,
          untitledIndex: null
        }

        state.order.push(id)
        state.activeId = id
      },
      prepare(file: FileContent, viewMode: ViewMode) {
        return { payload: { id: nanoid(), file, viewMode } }
      }
    },

    contentChanged(state, action: PayloadAction<{ id: string; content: string }>) {
      const document = state.entities[action.payload.id]
      if (document) document.content = action.payload.content
    },

    documentSaved(
      state,
      action: PayloadAction<{ id: string; path: string; stamp: FileStamp; content: string }>
    ) {
      const { id, path, stamp, content } = action.payload
      const document = state.entities[id]
      if (!document) return

      document.path = path
      document.title = basename(path)
      document.savedContent = content
      document.stamp = stamp
      document.external = 'none'
      document.externalStamp = null
      document.untitledIndex = null
    },

    pathChanged(state, action: PayloadAction<{ id: string; path: string }>) {
      const document = state.entities[action.payload.id]
      if (!document) return
      document.path = action.payload.path
      document.title = basename(action.payload.path)
    },

    viewModeChanged(state, action: PayloadAction<{ id: string; viewMode: ViewMode }>) {
      const document = state.entities[action.payload.id]
      if (document) document.viewMode = action.payload.viewMode
    },

    cursorMoved(state, action: PayloadAction<{ id: string; cursor: CursorPosition }>) {
      const document = state.entities[action.payload.id]
      if (!document) return
      const { line, column } = action.payload.cursor
      if (document.cursor.line === line && document.cursor.column === column) return
      document.cursor = { line, column }
    },

    scrollChanged(state, action: PayloadAction<{ id: string; scrollTop: number }>) {
      const document = state.entities[action.payload.id]
      if (document) document.scrollTop = action.payload.scrollTop
    },

    externalStateChanged(
      state,
      action: PayloadAction<{ id: string; external: ExternalState; stamp: FileStamp | null }>
    ) {
      const document = state.entities[action.payload.id]
      if (!document) return
      document.external = action.payload.external
      document.externalStamp = action.payload.stamp
    },

    wordGoalSet(state, action: PayloadAction<{ id: string; goal: number | null }>) {
      const document = state.entities[action.payload.id]
      if (document) document.wordGoal = action.payload.goal
    },

    lockToggled(state, action: PayloadAction<{ id: string; locked: boolean }>) {
      const document = state.entities[action.payload.id]
      if (document) document.locked = action.payload.locked
    },

    pinToggled(state, action: PayloadAction<{ id: string; pinned: boolean }>) {
      const document = state.entities[action.payload.id]
      if (document) document.pinned = action.payload.pinned
    },

    documentReverted(state, action: PayloadAction<string>) {
      const document = state.entities[action.payload]
      if (!document || document.savedContent === NEVER_SAVED) return
      document.content = document.savedContent
      document.external = 'none'
    },

    documentActivated(state, action: PayloadAction<string | null>) {
      state.activeId = action.payload
    },

    documentRemoved(state, action: PayloadAction<string>) {
      const id = action.payload
      const document = state.entities[id]
      if (!document) return

      const index = state.order.indexOf(id)
      state.order = state.order.filter((entry) => entry !== id)
      delete state.entities[id]

      // Activate the neighbour to the right, falling back to the left — the
      // behaviour every tabbed editor has trained users to expect.
      if (state.activeId === id) {
        state.activeId = state.order[Math.min(index, state.order.length - 1)] ?? null
      }

      state.closed = [
        { path: document.path, title: document.title, content: document.content, index },
        ...state.closed
      ].slice(0, MAX_CLOSED_HISTORY)
    },

    documentsReordered(state, action: PayloadAction<{ from: number; to: number }>) {
      const { from, to } = action.payload
      if (from === to || from < 0 || to < 0) return
      const [moved] = state.order.splice(from, 1)
      if (moved) state.order.splice(to, 0, moved)
    },

    closedDocumentPopped(state) {
      state.closed.shift()
    },

    documentsReset() {
      return initialState
    }
  }
})

export const {
  untitledCreated,
  fileAdopted,
  contentChanged,
  documentSaved,
  pathChanged,
  viewModeChanged,
  cursorMoved,
  scrollChanged,
  externalStateChanged,
  lockToggled,
  pinToggled,
  wordGoalSet,
  documentReverted,
  documentActivated,
  documentRemoved,
  documentsReordered,
  closedDocumentPopped,
  documentsReset
} = documentsSlice.actions

export const documentsReducer = documentsSlice.reducer

/* ────────────────────────────────────────────────────────────────────────────
 * Selectors
 *
 * Memoised where they derive a new array or object, so a component subscribing
 * to "the dirty documents" does not re-render on every keystroke in an
 * unrelated tab.
 * ─────────────────────────────────────────────────────────────────────────── */

interface WithDocuments {
  documents: DocumentsState
}

export const selectDocumentEntities = (state: WithDocuments): Record<string, DocumentModel> =>
  state.documents.entities

export const selectDocumentOrder = (state: WithDocuments): string[] => state.documents.order

export const selectActiveDocumentId = (state: WithDocuments): string | null =>
  state.documents.activeId

export const selectActiveDocument = (state: WithDocuments): DocumentModel | null => {
  const id = state.documents.activeId
  return id ? (state.documents.entities[id] ?? null) : null
}

export const selectDocumentById = (state: WithDocuments, id: string): DocumentModel | undefined =>
  state.documents.entities[id]

export const selectOpenDocuments = createSelector(
  [selectDocumentOrder, selectDocumentEntities],
  (order, entities) =>
    order.map((id) => entities[id]).filter((entry): entry is DocumentModel => Boolean(entry))
)

export const selectDirtyDocuments = createSelector([selectOpenDocuments], (documents) =>
  documents.filter(isDirty)
)

export const selectClosedDocuments = (state: WithDocuments): ClosedDocument[] =>
  state.documents.closed

export function selectDocumentByPath(state: WithDocuments, path: string): DocumentModel | null {
  for (const id of state.documents.order) {
    const document = state.documents.entities[id]
    if (document?.path && pathsEqual(document.path, path)) return document
  }
  return null
}

/* ── Derived helpers ─────────────────────────────────────────────────────── */

export function isDirty(document: DocumentModel | null | undefined): boolean {
  if (!document) return false
  return document.content !== document.savedContent
}

export function documentDirectory(document: DocumentModel | null): string | null {
  return document?.path ? dirname(document.path) : null
}

export function suggestedFileName(document: DocumentModel | null): string {
  if (!document) return 'Untitled'
  if (document.path) return stem(document.path)

  const firstHeading = document.content.match(/^\s{0,3}#\s+(.+)$/m)?.[1]?.trim()
  if (firstHeading) return firstHeading.replace(/[\\/:*?"<>|]/g, '').slice(0, 60)
  return document.title
}

/** Stable key for comparing document paths across platforms. */
export function documentKey(document: DocumentModel): string {
  return document.path ? pathKey(document.path) : document.id
}
