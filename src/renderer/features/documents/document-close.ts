// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { toast, watcherService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { closedDocumentPopped, dispatch, documentActivated, documentRemoved, getState, isDirty, selectClosedDocuments, selectDirtyDocuments } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { disposeSourceState } from '@features/editor/source'
import { newDocument, openPath } from './document-open'
import { saveDocument } from './document-save'

/**
 * Closing documents, and undoing that.
 */
/* ────────────────────────────────────────────────────────────────────────────
 * Closing
 * ─────────────────────────────────────────────────────────────────────────── */

export async function closeDocument(
  id: string,
  options: { force?: boolean } = {}
): Promise<boolean> {
  const document = getState().documents.entities[id]
  if (!document) return true

  if (!options.force && isDirty(document)) {
    dispatch(documentActivated(id))
    const choice = await dialogs.unsavedChanges({ name: document.title })
    if (choice === null) return false
    if (choice === 'save') {
      const result = await saveDocument(id)
      if (!result.saved) return false
    }
  }

  if (document.path) void watcherService.unwatchFiles([document.path])
  disposeSourceState(id)
  dispatch(documentRemoved(id))
  return true
}

export async function closeOtherDocuments(keepId: string): Promise<void> {
  const ids = getState().documents.order.filter((id) => id !== keepId)
  for (const id of ids) {
    if (!(await closeDocument(id))) return
  }
}

export async function closeAllDocuments(): Promise<boolean> {
  const dirty = selectDirtyDocuments(getState())

  // One decision for the whole batch rather than a modal per tab.
  if (dirty.length > 1) {
    const choice = await dialogs.unsavedChanges({
      name: dirty[0]?.title ?? '',
      count: dirty.length
    })
    if (choice === null) return false

    if (choice === 'save') {
      for (const document of dirty) {
        const result = await saveDocument(document.id, { silent: true })
        if (!result.saved) return false
      }
    }

    for (const id of [...getState().documents.order]) {
      await closeDocument(id, { force: true })
    }
    return true
  }

  for (const id of [...getState().documents.order]) {
    if (!(await closeDocument(id))) return false
  }
  return true
}

export async function reopenClosedDocument(): Promise<void> {
  const entry = selectClosedDocuments(getState())[0]
  if (!entry) {
    toast.info(t('notifications.nothingToReopen'))
    return
  }

  dispatch(closedDocumentPopped())

  if (entry.path) {
    await openPath(entry.path)
  } else {
    dispatch(documentActivated(newDocument(entry.content)))
  }
}

