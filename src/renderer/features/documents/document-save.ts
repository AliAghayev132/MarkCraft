// ── @shared ────────────────────────────────────────────────────────────────
import { basename, dayOf, dirname, DOCUMENT_EXTENSIONS, ENCRYPTED_EXTENSION, ensureExtension, type FileStamp } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { appService, dialogService, fileService, streakService, toast, watcherService, workspaceService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { contentChanged, dispatch, documentSaved, externalStateChanged, getState, isDirty, selectDirtyDocuments, suggestedFileName } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { computeStats } from '@features/editor/markdown'
import { encryptForSave, isEncryptedPath } from '@features/encrypted'
import { reportError } from './document-context'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'
import type { SaveResult } from './types'

/**
 * Writing documents back to disk, and putting them back the way disk has them.
 */
export async function saveDocument(
  id: string,
  options: { saveAs?: boolean; silent?: boolean } = {}
): Promise<SaveResult> {
  const document = getState().documents.entities[id]
  if (!document) return { saved: false, path: null }

  /*
   * Checked here rather than only in the editor, because a save can be reached
   * from autosave, from closing a tab, and from "save all" — none of which go
   * through a keystroke the read-only editor could have swallowed.
   */
  if (document.locked) {
    if (!options.silent) toast.warning(t('lock.cannotSave'))
    return { saved: false, path: null }
  }

  let targetPath = document.path

  if (!targetPath || options.saveAs) {
    const suggestion = ensureExtension(suggestedFileName(document), '.md')
    const chosen = await dialogService.saveFile(
      // `.hmd` is offered alongside the plain formats: choosing it in the save
      // dialog is how a document gets locked, with no separate command to find.
      suggestion,
      [...DOCUMENT_EXTENSIONS, ENCRYPTED_EXTENSION],
      targetPath ? dirname(targetPath) : null
    )
    if (!chosen) return { saved: false, path: null }
    targetPath = chosen
  }

  const files = getState().settings.values.files
  const eol = files.defaultEol === 'auto' ? document.eol : (files.defaultEol as 'lf' | 'crlf')

  /*
   * What actually goes to disk. For a `.hmd` path that is the ciphertext, and
   * a passphrase the user backs out of means nothing is written at all —
   * writing the plaintext to a file named `.hmd` would be the one mistake here
   * that cannot be taken back.
   */
  let payload = document.content
  if (isEncryptedPath(targetPath)) {
    const locked = await encryptForSave(targetPath, document.content)
    if (locked === null) return { saved: false, path: null }
    payload = locked
  }

  try {
    const outcome = await fileService.save({
      path: targetPath,
      content: payload,
      eol,
      bom: document.bom,
      // A brand-new path has nothing to conflict with; an existing one must
      // still match the stamp we loaded.
      expect: options.saveAs ? null : document.stamp
    })

    if (outcome.status === 'conflict') {
      return (await resolveConflict(document, targetPath, outcome.current)) ?? { saved: false, path: null }
    }

    dispatch(documentSaved({ id, path: targetPath, stamp: outcome.stamp, content: document.content }))
    recordWriting(document.savedContent, document.content)
    void workspaceService.addRecentFile(targetPath)
    void watcherService.watchFiles([targetPath])
    void appService.setDocumentEdited(false)

    if (!options.silent) toast.success(t('notifications.saved'), basename(targetPath))
    return { saved: true, path: targetPath }
  } catch (error) {
    reportError(error, 'errors.saveFailed')
    return { saved: false, path: null }
  }
}

/**
 * The file changed on disk between load and save. Nothing has been written yet
 * — the user genuinely chooses, and "overwrite" is never the default.
 */
async function resolveConflict(
  document: DocumentModel,
  targetPath: string,
  current: FileStamp
): Promise<SaveResult | null> {
  const choice = await dialogs.choose<'overwrite' | 'saveAs' | 'reload'>({
    title: t('dialogs.conflictTitle', { name: basename(targetPath) }),
    message: t('dialogs.conflictBody'),
    tone: 'warning',
    options: [
      { id: 'saveAs', label: t('dialogs.conflictSaveCopy'), variant: 'primary', autoFocus: true },
      { id: 'reload', label: t('dialogs.conflictReload') },
      { id: 'overwrite', label: t('dialogs.conflictOverwrite'), variant: 'dangerGhost' }
    ]
  })

  if (!choice) return null
  if (choice === 'saveAs') return saveDocument(document.id, { saveAs: true })

  if (choice === 'reload') {
    await reloadFromDisk(document.id)
    return { saved: false, path: targetPath }
  }

  try {
    const outcome = await fileService.save({
      path: targetPath,
      content: document.content,
      eol: document.eol,
      bom: document.bom,
      expect: current,
      force: true
    })

    if (outcome.status === 'written') {
      dispatch(
        documentSaved({
          id: document.id,
          path: targetPath,
          stamp: outcome.stamp,
          content: document.content
        })
      )
      toast.success(
        t('notifications.saved'),
        t('notifications.savedOverwrite', { name: basename(targetPath) })
      )
      return { saved: true, path: targetPath }
    }
  } catch (error) {
    reportError(error, 'errors.saveFailed')
  }

  return null
}

export async function saveAll(): Promise<number> {
  const dirty = selectDirtyDocuments(getState())
  let saved = 0

  for (const document of dirty) {
    const result = await saveDocument(document.id, { silent: true })
    if (result.saved) saved++
  }

  if (saved > 0) {
    toast.success(t('notifications.savedCount', { documents: t('common.documents', { count: saved }) }))
  }
  return saved
}

/* ────────────────────────────────────────────────────────────────────────────
 * Reverting and reloading
 * ─────────────────────────────────────────────────────────────────────────── */

export async function revertDocument(id: string): Promise<void> {
  const document = getState().documents.entities[id]
  if (!document?.path) return

  if (isDirty(document)) {
    const confirmed = await dialogs.confirm({
      title: t('dialogs.revertTitle'),
      message: t('dialogs.revertBody', { name: document.title }),
      confirmLabel: t('dialogs.revertAction'),
      tone: 'danger'
    })
    if (!confirmed) return
  }

  await reloadFromDisk(id)
  toast.info(t('notifications.reverted'), document.title)
}

export async function reloadFromDisk(id: string): Promise<void> {
  const document = getState().documents.entities[id]
  if (!document?.path) return

  try {
    const file = await fileService.read(document.path)
    dispatch(contentChanged({ id, content: file.content }))
    dispatch(documentSaved({ id, path: file.path, stamp: file.stamp, content: file.content }))
    dispatch(externalStateChanged({ id, external: 'none', stamp: null }))
  } catch (error) {
    reportError(error, 'errors.reloadFailed')
  }
}


/**
 * Adds what this save contributed to today's writing.
 *
 * The delta between what was on disk and what is now, so a day's work
 * accumulates across saves and across documents — the length of the open file
 * would credit one long document over five short ones, and would count the
 * same paragraph again every time it was saved.
 *
 * Fire-and-forget: a streak is a nicety, and a document must never fail to save
 * because a statistic could not be written.
 */
function recordWriting(before: string, after: string): void {
  const added = computeStats(after).words - computeStats(before).words
  if (added <= 0) return

  void streakService.add(dayOf(Date.now()), added)
}
