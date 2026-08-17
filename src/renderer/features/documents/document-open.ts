// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { dialogService, isServiceError, toast, watcherService, workspaceService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, documentActivated, fileAdopted, getState, selectDocumentByPath, untitledCreated } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
// ── @shared ────────────────────────────────────────────────────────────────
import { MARKDOWN_EXTENSIONS } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
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
  const existing = selectDocumentByPath(getState(), path)
  if (existing) {
    if (options.activate !== false) dispatch(documentActivated(existing.id))
    return existing.id
  }

  try {
    const file = await readAllowingRemembered(path)
    const action = fileAdopted(file, defaultViewMode())
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
  const markdownLike = paths.filter((path) =>
    MARKDOWN_EXTENSIONS.some((extension) => path.toLowerCase().endsWith(`.${extension}`))
  )

  const skipped = paths.length - markdownLike.length
  if (skipped > 0) {
    toast.warning(
      t('notifications.skippedFiles', { count: skipped }),
      t('notifications.skippedFilesDetail')
    )
  }

  // Sequential so tab order matches the order the user selected them.
  for (const path of markdownLike) {
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

