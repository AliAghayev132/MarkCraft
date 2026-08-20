// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { dialogService, isServiceError, toast, watcherService, workspaceService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, documentActivated, fileAdopted, getState, selectDocumentByPath, untitledCreated } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
// ── @shared ────────────────────────────────────────────────────────────────
import { CANVAS_EXTENSION, DOCUMENT_EXTENSIONS, extensionOf } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { canvasTarget } from '@features/canvas'
import { decryptForOpen, isEncryptedPath } from '@features/encrypted'
import { defaultViewMode, readAllowingRemembered, reportError } from './document-context'

/**
 * Creating and opening documents.
 */
/* ────────────────────────────────────────────────────────────────────────────
 * Opening
 * ─────────────────────────────────────────────────────────────────────────── */

export function newDocument(initialContent = ''): string {
  const action = untitledCreated(initialContent, defaultViewMode())
  dispatch(action)
  return action.payload.id
}

export async function openPath(
  path: string,
  options: { activate?: boolean } = {}
): Promise<string | null> {
  /*
   * A canvas is a document, but not a text one: it belongs on the canvas
   * surface rather than in a tab beside the editor, where it would show as a
   * page of JSON. Handled here rather than at each call site so every way into
   * a file — the tree, the recent list, a drop onto the window — agrees.
   */
  if (extensionOf(path) === CANVAS_EXTENSION) {
    canvasTarget.open(path)
    return null
  }

  const existing = selectDocumentByPath(getState(), path)
  if (existing) {
    if (options.activate !== false) dispatch(documentActivated(existing.id))
    return existing.id
  }

  try {
    const file = await readAllowingRemembered(path)

    /*
     * A locked document is decrypted before it becomes a tab, so everything
     * downstream — the editor, search, statistics, export — sees ordinary
     * Markdown and none of them has to know the file was encrypted. Backing
     * out of the passphrase dialog is a decision, not a failure: nothing
     * opens, and nothing is said about it.
     */
    let opened = file
    if (isEncryptedPath(path)) {
      const text = await decryptForOpen(path, file.content)
      if (text === null) return null
      opened = { ...file, content: text }
    }

    const action = fileAdopted(opened, defaultViewMode())
    dispatch(action)

    void workspaceService.addRecentFile(path)
    void watcherService.watchFiles([path])

    return action.payload.id
  } catch (error) {
    if (isServiceError(error) && error.code === 'ENOENT') {
      toast.custom({
        tone: 'warning',
        title: t('notifications.fileGoneTitle'),
        description: path,
        action: {
          label: t('notifications.fileGoneAction'),
          onClick: () => void workspaceService.removeRecentFile(path)
        }
      })
      return null
    }
    reportError(error, 'errors.openFailed')
    return null
  }
}

export async function openPaths(paths: string[]): Promise<void> {
  const openable = paths.filter((path) =>
    DOCUMENT_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(`.${extension}`))
  )

  const skipped = paths.length - openable.length
  if (skipped > 0) {
    toast.warning(
      t('notifications.skippedFiles', { count: skipped }),
      t('notifications.skippedFilesDetail')
    )
  }

  // Sequential so tab order matches the order the user selected them.
  for (const path of openable) {
    await openPath(path)
  }
}

export async function openFromDialog(): Promise<void> {
  try {
    const paths = await dialogService.openFiles(true)
    await openPaths(paths)
  } catch (error) {
    reportError(error, 'errors.openFailed')
  }
}

