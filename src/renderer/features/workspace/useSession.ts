// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useRef } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { pathKey } from '@shared'
import type { PersistedTab, WorkspaceState } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { getSettings, toast, workspaceService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, expandedChanged, getState, sidebarViewChanged, store } from '@store'
import {
  cursorMoved,
  documentActivated,
  documentRemoved,
  fileAdopted,
  pinToggled,
  wordGoalSet
} from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { readAllowingRemembered } from '@features/documents'
import { loadChildren, openWorkspace } from '@features/explorer'

// ── types ──────────────────────────────────────────────────────────────────
import type { WorkspaceState as WorkspaceSliceState } from '@store/slices/types'

/**
 * Workspace session persistence.
 *
 * Restores the open folder, the expanded directories, the open tabs and the
 * active document — so reopening a project puts the user back exactly where
 * they left off. State is written on a debounce and flushed when the window is
 * hidden, so a crash costs at most a couple of seconds of layout state.
 */
const SAVE_DEBOUNCE_MS = 900

export function useSession(): void {
  const restoredRef = useRef(false)
  const saveTimer = useRef<number | null>(null)

  /* ── Restore ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    void (async () => {
      // The "no folder" slot remembers which workspace was last open.
      const bootstrap = await workspaceService.loadState(null)
      const root = bootstrap.rootPath

      const state = root ? await workspaceService.loadState(root) : bootstrap
      if (root) await openWorkspace(root)

      for (const path of state.expandedPaths) {
        dispatch(expandedChanged({ directory: path, expanded: true }))
        await loadChildren(path)
      }

      if (state.sidebarView) dispatch(sidebarViewChanged(state.sidebarView))

      await restoreTabs(state.tabs, state.activeTabId)
    })()
  }, [])

  /* ── Persist ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    const schedule = (): void => {
      if (!restoredRef.current) return
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        saveTimer.current = null
        void persist()
      }, SAVE_DEBOUNCE_MS)
    }

    const unsubscribe = store.subscribe(schedule)

    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') void persist()
    }
    const onUnload = (): void => void persist()

    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('beforeunload', onUnload)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('beforeunload', onUnload)
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    }
  }, [])
}

async function persist(): Promise<void> {
  const { documents, workspace } = getState()

  const tabs: PersistedTab[] = documents.order
    .map((id) => documents.entities[id])
    .filter((document): document is NonNullable<typeof document> => Boolean(document))
    // Untitled documents live in the recovery journal, not the session file —
    // duplicating their content here would create two sources of truth.
    .filter((document) => document.path !== null)
    .map((document) => ({
      id: document.id,
      path: document.path,
      title: document.title,
      viewMode: document.viewMode,
      cursor: document.cursor,
      scrollTop: document.scrollTop,
      pinned: document.pinned,
      wordGoal: document.wordGoal
    }))

  const state: WorkspaceState = {
    rootPath: workspace.root,
    expandedPaths: resolveExpandedPaths(workspace),
    tabs,
    activeTabId: documents.activeId,
    sidebarView: workspace.sidebarView,
    updatedAt: Date.now()
  }

  // Main also records the root in the "no folder" slot, so the next launch
  // knows which workspace to reopen. Doing it there rather than with a second
  // save from here is what keeps the two records in step.
  await workspaceService.saveState(state)
}

/**
 * `expanded` holds normalised keys; the real paths are recovered from the
 * loaded listings so the saved session contains paths the OS understands.
 */
function resolveExpandedPaths(workspace: WorkspaceSliceState): string[] {
  const paths = new Set<string>()
  if (workspace.root) paths.add(workspace.root)

  for (const entries of Object.values(workspace.children)) {
    for (const entry of entries) {
      if (entry.kind === 'directory' && workspace.expanded[pathKey(entry.path)]) {
        paths.add(entry.path)
      }
    }
  }

  return [...paths]
}

/**
 * Reopens the documents the last session was left with.
 *
 * Restoring silently is the right default — it is what the user expects — but
 * it is also the one launch behaviour that can be *wrong*: they may have
 * finished with those files and want a clean start. So it is announced, with a
 * one-click way out, rather than presented as a fait accompli or, worse, as a
 * modal that has to be dismissed on every launch.
 */
async function restoreTabs(tabs: PersistedTab[], activeId: string | null): Promise<void> {
  const defaultViewMode = getSettings().markdown.defaultViewMode
  let activeDocumentId: string | null = null
  const restored: string[] = []

  for (const tab of tabs) {
    if (!tab.path) continue

    try {
      // Same authorisation path as opening a file by hand: the guard starts
      // empty each launch, so a tab outside the current workspace has to be
      // re-granted from what main remembers or it silently disappears.
      const file = await readAllowingRemembered(tab.path)
      const action = fileAdopted(file, tab.viewMode ?? defaultViewMode)
      dispatch(action)

      const id = action.payload.id
      dispatch(cursorMoved({ id, cursor: tab.cursor }))
      if (tab.pinned) dispatch(pinToggled({ id, pinned: true }))
      if (tab.wordGoal) dispatch(wordGoalSet({ id, goal: tab.wordGoal }))
      if (tab.id === activeId) activeDocumentId = id
      restored.push(id)
    } catch {
      // The file was deleted or moved while the app was closed. Dropping it
      // silently is correct — a modal per missing file on every launch would be
      // hostile.
    }
  }

  if (activeDocumentId) dispatch(documentActivated(activeDocumentId))

  if (restored.length > 0) {
    toast.custom({
      tone: 'info',
      title: t('session.restored', { count: restored.length }),
      // Long-lived rather than sticky: it must outlast a glance at the screen
      // without becoming something to dismiss.
      duration: 8000,
      key: 'session-restored',
      action: {
        label: t('session.startFresh'),
        onClick: () => {
          // Nothing has been edited yet, so this cannot discard work.
          for (const id of restored) dispatch(documentRemoved(id))
        }
      }
    })
  }
}
