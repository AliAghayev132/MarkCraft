// ── @shared ────────────────────────────────────────────────────────────────
import {
  basename,
  dirname,
  ensureExtension,
  isDescendantPath,
  joinPath,
  pathKey
} from '@shared'
import type { DirEntry } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { dialogService, fileService, isServiceError, toast, watcherService, workspaceService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, getState, pathChanged, selectDocumentByPath } from '@store'
import {
  childrenLoaded,
  clipboardChanged,
  expandedChanged,
  loadingChanged,
  rootOpened,
  selectionChanged,
  workspaceReset
} from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { closeDocument, openPath, openPaths } from '@features/documents'
import { trashSignal } from '@features/trash'

/** A folder that is no longer there, as opposed to one that cannot be read. */
function isMissing(error: unknown): boolean {
  return isServiceError(error) && error.code === 'ENOENT'
}

function report(error: unknown, fallbackKey: string): void {
  if (isServiceError(error)) {
    if (error.isCancellation) return
    toast.error(t(`errors.codes.${error.code}`), error.message)
    return
  }
  toast.error(t(fallbackKey), error instanceof Error ? error.message : String(error))
}

/* ────────────────────────────────────────────────────────────────────────────
 * Workspace lifecycle
 * ─────────────────────────────────────────────────────────────────────────── */

export async function openWorkspace(root: string): Promise<void> {
  // Loading the workspace's saved state is also what grants the folder to the
  // path guard. Doing it here rather than relying on the caller means every
  // route into a workspace — the dialog, session restore, the recent list —
  // is authorised before anything tries to read the folder.
  await workspaceService.loadState(root)

  dispatch(rootOpened({ root }))
  void workspaceService.addRecentWorkspace(root)
  await loadChildren(root)
  void watcherService.watchDirectories([root])
}

/**
 * Opens a document from the recent or pinned list, and its folder with it.
 *
 * A remembered file usually lives outside whatever folder happens to be open,
 * which left the user with two problems at once: the explorer kept showing
 * something unrelated, and the path guard — which starts empty every launch —
 * refused the read. Adopting the file's own folder as the workspace answers
 * both, because granting the folder is what authorises the file inside it.
 */
export async function openRecentDocument(path: string): Promise<void> {
  const { root } = getState().workspace
  const folder = dirname(path)

  const alreadyReachable = root !== null && (root === folder || isDescendantPath(root, path))
  if (!alreadyReachable && folder !== '' && folder !== path) {
    try {
      await openWorkspace(folder)
    } catch (error) {
      // A missing or unreadable folder must not stop the file itself from
      // opening — `openPath` still has the remembered-grant fallback.
      report(error, 'errors.openFolderFailed')
    }
  }

  await openPath(path)
}

export async function openWorkspaceFromDialog(): Promise<void> {
  try {
    const folder = await dialogService.openFolder()
    if (folder) await openWorkspace(folder)
  } catch (error) {
    report(error, 'errors.openFolderFailed')
  }
}

export async function closeWorkspace(): Promise<void> {
  await watcherService.reset()
  dispatch(workspaceReset())
}

/**
 * Loads one directory level.
 *
 * Directories are read on expand rather than recursively up front — the single
 * most important decision for staying responsive in a large repository.
 */
export async function loadChildren(directory: string, force = false): Promise<void> {
  const workspace = getState().workspace
  const key = pathKey(directory)

  if (!force && workspace.children[key]) return
  if (workspace.loading[key]) return

  dispatch(loadingChanged({ directory, loading: true }))
  try {
    const entries = await fileService.list(directory, workspace.showHidden)
    dispatch(childrenLoaded({ directory, entries }))
    void watcherService.watchDirectories([directory])
  } catch (error) {
    /*
     * A folder that is simply gone is not a failure worth a toast. The
     * expansion is restored from a previous session, so any folder deleted or
     * renamed since then lands here — greeting the user with a red error on
     * every launch for a folder they themselves removed is noise, and noise is
     * how the one error that matters gets ignored. It is collapsed instead.
     */
    if (isMissing(error)) {
      dispatch(expandedChanged({ directory, expanded: false }))
      void watcherService.unwatchDirectories([directory])
    } else {
      report(error, 'errors.readFolderFailed')
    }

    dispatch(childrenLoaded({ directory, entries: [] }))
  } finally {
    dispatch(loadingChanged({ directory, loading: false }))
  }
}

export async function toggleDirectory(directory: string): Promise<void> {
  const willExpand = !getState().workspace.expanded[pathKey(directory)]

  dispatch(expandedChanged({ directory, expanded: willExpand }))
  if (willExpand) await loadChildren(directory)
  else void watcherService.unwatchDirectories([directory])
}

export async function refreshDirectory(directory: string): Promise<void> {
  await loadChildren(directory, true)
}

export async function refreshWorkspace(): Promise<void> {
  const workspace = getState().workspace
  if (!workspace.root) return

  // Re-read every directory the user currently has open, and nothing else.
  const open = new Set<string>([workspace.root])
  for (const entries of Object.values(workspace.children)) {
    for (const entry of entries) {
      if (entry.kind === 'directory' && workspace.expanded[pathKey(entry.path)]) open.add(entry.path)
    }
  }

  for (const directory of open) {
    await loadChildren(directory, true)
  }
  toast.success(t('notifications.workspaceRefreshed'))
}

/* ────────────────────────────────────────────────────────────────────────────
 * Creation
 * ─────────────────────────────────────────────────────────────────────────── */

function existingNamesIn(directory: string): string[] {
  return (getState().workspace.children[pathKey(directory)] ?? []).map((entry) => entry.name)
}

export async function createFileIn(directory: string): Promise<void> {
  const name = await dialogs.fileName({
    title: t('dialogs.newFileTitle'),
    initialValue: 'Untitled.md',
    confirmLabel: t('common.create'),
    existingNames: existingNamesIn(directory)
  })
  if (!name) return

  try {
    const entry = await fileService.createFile(joinPath(directory, ensureExtension(name, '.md')), '')
    await refreshDirectory(directory)
    dispatch(selectionChanged({ paths: [entry.path] }))
    await openPath(entry.path)
  } catch (error) {
    report(error, 'errors.createFileFailed')
  }
}

export async function createFolderIn(directory: string): Promise<void> {
  const name = await dialogs.fileName({
    title: t('dialogs.newFolderTitle'),
    initialValue: 'New folder',
    confirmLabel: t('common.create'),
    existingNames: existingNamesIn(directory)
  })
  if (!name) return

  try {
    const entry = await fileService.createDirectory(joinPath(directory, name))
    await refreshDirectory(directory)
    dispatch(expandedChanged({ directory: entry.path, expanded: true }))
    dispatch(selectionChanged({ paths: [entry.path] }))
  } catch (error) {
    report(error, 'errors.createFolderFailed')
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Mutation
 * ─────────────────────────────────────────────────────────────────────────── */

export async function renameEntry(entry: DirEntry): Promise<void> {
  const parent = dirname(entry.path)
  const name = await dialogs.fileName({
    title: t(entry.kind === 'directory' ? 'dialogs.renameFolder' : 'dialogs.renameFile'),
    initialValue: entry.name,
    confirmLabel: t('common.rename'),
    existingNames: existingNamesIn(parent).filter((candidate) => candidate !== entry.name)
  })
  if (!name || name === entry.name) return

  try {
    const renamed = await fileService.rename(entry.path, joinPath(parent, name))
    await refreshDirectory(parent)

    // An open document must follow its file, or the next save writes to a path
    // that no longer exists.
    const open = selectDocumentByPath(getState(), entry.path)
    if (open) {
      dispatch(pathChanged({ id: open.id, path: renamed.path }))
      void watcherService.unwatchFiles([entry.path])
      void watcherService.watchFiles([renamed.path])
    }

    dispatch(selectionChanged({ paths: [renamed.path] }))
  } catch (error) {
    report(error, 'errors.renameFailed')
  }
}

export async function deleteEntries(entries: DirEntry[]): Promise<void> {
  if (entries.length === 0) return

  const toTrash = true
  if (getState().settings.values.files.confirmDelete) {
    const confirmed = await dialogs.confirmDelete({
      names: entries.map((entry) => entry.name),
      toTrash
    })
    if (!confirmed) return
  }

  try {
    const paths = entries.map((entry) => entry.path)

    // Close any open documents first so no tab is left pointing at nothing.
    for (const path of paths) {
      const open = selectDocumentByPath(getState(), path)
      if (open) await closeDocument(open.id, { force: true })
    }

    await fileService.remove(paths, toTrash)

    // The deleted list may be on screen behind the tree.
    trashSignal.bump()
    await refreshDirectory(dirname(entries[0]!.path))
    dispatch(selectionChanged({ paths: [] }))

    toast.success(
      entries.length === 1
        ? t('notifications.deleted', { name: entries[0]!.name })
        : t('notifications.deletedMany', { count: entries.length }),
      toTrash ? t('notifications.movedToTrash') : undefined
    )
  } catch (error) {
    report(error, 'errors.deleteFailed')
  }
}

export async function duplicateEntry(entry: DirEntry): Promise<void> {
  try {
    const copy = await fileService.duplicate(entry.path)
    await refreshDirectory(dirname(entry.path))
    dispatch(selectionChanged({ paths: [copy.path] }))
    toast.success(t('notifications.duplicated', { name: copy.name }))
  } catch (error) {
    report(error, 'errors.duplicateFailed')
  }
}

export function cutEntries(paths: string[]): void {
  dispatch(clipboardChanged({ paths, mode: 'cut' }))
  toast.info(t('notifications.cutItems', { items: t('common.items', { count: paths.length }) }))
}

export function copyEntries(paths: string[]): void {
  dispatch(clipboardChanged({ paths, mode: 'copy' }))
  toast.info(t('notifications.copiedItems', { items: t('common.items', { count: paths.length }) }))
}

export async function pasteInto(directory: string): Promise<void> {
  const clipboard = getState().workspace.clipboard
  if (!clipboard || clipboard.paths.length === 0) return

  // Pasting a folder into itself would recurse forever.
  if (clipboard.paths.some((source) => pathKey(directory).startsWith(pathKey(source)))) {
    toast.error(t('errors.pasteIntoItself'))
    return
  }

  try {
    if (clipboard.mode === 'cut') {
      const moved = await fileService.move(clipboard.paths, directory)
      for (const source of clipboard.paths) {
        await refreshDirectory(dirname(source))
        const open = selectDocumentByPath(getState(), source)
        const target = moved.find((entry) => entry.name === basename(source))
        if (open && target) dispatch(pathChanged({ id: open.id, path: target.path }))
      }
      dispatch(clipboardChanged(null))
    } else {
      await fileService.copy(clipboard.paths, directory)
    }

    await refreshDirectory(directory)
    dispatch(expandedChanged({ directory, expanded: true }))
  } catch (error) {
    report(error, 'errors.pasteFailed')
  }
}

export async function moveEntries(sources: string[], targetDir: string): Promise<void> {
  if (sources.length === 0) return
  if (sources.some((source) => pathKey(targetDir).startsWith(pathKey(source)))) {
    toast.error(t('errors.folderIntoItself'))
    return
  }
  if (sources.every((source) => pathKey(dirname(source)) === pathKey(targetDir))) return

  try {
    const moved = await fileService.move(sources, targetDir)

    for (const source of sources) {
      await refreshDirectory(dirname(source))
      const open = selectDocumentByPath(getState(), source)
      const target = moved.find((entry) => entry.name === basename(source))
      if (open && target) dispatch(pathChanged({ id: open.id, path: target.path }))
    }

    await refreshDirectory(targetDir)
    dispatch(expandedChanged({ directory: targetDir, expanded: true }))
    dispatch(selectionChanged({ paths: moved.map((entry) => entry.path) }))
  } catch (error) {
    report(error, 'errors.moveFailed')
  }
}

export async function togglePin(path: string): Promise<void> {
  const pins = await workspaceService.togglePin(path)
  const pinned = pins.some((pin) => pathKey(pin.path) === pathKey(path))
  toast.success(t(pinned ? 'notifications.pinned' : 'notifications.unpinned'), basename(path))
}

/** Called when the watcher reports a directory changed underneath us. */
export async function onDirectoryChanged(directory: string): Promise<void> {
  const workspace = getState().workspace
  if (!workspace.root) return
  if (!workspace.children[pathKey(directory)]) return
  await loadChildren(directory, true)
}

/** Files dragged in from the OS are opened, not moved. */
export async function openDroppedPaths(paths: string[]): Promise<void> {
  await openPaths(paths)
  const root = getState().workspace.root
  if (root) void refreshDirectory(root)
}
