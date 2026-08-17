// ── node: ──────────────────────────────────────────────────────────────────
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { shell } from 'electron'

// ── ../services ────────────────────────────────────────────────────────────
import { renameHistory, snapshot } from '../services/history-service'
import { moveToTrash } from '../services/trash-service'
import { getSettings } from '../services/settings-service'
import * as fsService from '../services/fs-service'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString, requireStringArray } from './register'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

export function registerFileHandlers(): void {
  handle('files:read', ({ path: target }) => fsService.readTextFile(requireString(target, 'path')))

  handle('files:write', async (request) => {
    requireString(request.path, 'path')
    if (typeof request.content !== 'string') {
      throw Object.assign(new Error('"content" must be a string'), { code: 'INVALID_ARGUMENT' })
    }

    const outcome = await fsService.writeTextFile(request)

    /*
     * The version is recorded only for a write that actually landed. A save
     * refused as a conflict has not changed the file, and filing it as a
     * version would put text in the history that is on nobody's disk.
     */
    if (outcome.status !== 'conflict') {
      const settings = await getSettings()
      await snapshot(request.path, request.content, settings.files.historyLimit).catch(
        (error: unknown) => {
          logger.warn('history: could not record a version', error)
          return null
        }
      )
    }

    return outcome
  })

  handle('files:stat', ({ path: target }) => fsService.statEntry(requireString(target, 'path')))

  handle('files:stampOf', ({ path: target }) => fsService.stampOf(requireString(target, 'path')))

  handle('files:list', ({ path: target, showHidden }) =>
    fsService.listDirectory(requireString(target, 'path'), Boolean(showHidden))
  )

  handle('files:createFile', ({ path: target, content }) =>
    fsService.createFile(requireString(target, 'path'), content ?? '')
  )

  handle('files:createDirectory', ({ path: target }) =>
    fsService.createDirectory(requireString(target, 'path'))
  )

  handle('files:rename', async ({ from, to }) => {
    const entry = await fsService.renameEntry(requireString(from, 'from'), requireString(to, 'to'))

    // History follows the document, or an ordinary rename would look exactly
    // like a deletion to it.
    await renameHistory(from, entry.path)
    return entry
  })

  handle('files:delete', async ({ paths, toTrash }) => {
    const settings = await getSettings()
    const targets = requireStringArray(paths, 'paths')

    /*
     * MarkCraft's own trash rather than the system one, so the deleted list in
     * the sidebar can show them and offer a permanent delete. Anything that
     * cannot be moved there still falls through to the old path, because
     * failing to delete is worse than deleting less recoverably.
     */
    if (toTrash ?? true) {
      const unmoved: string[] = []

      for (const target of targets) {
        try {
          await moveToTrash(target, settings.files.trashLimit)
        } catch (error) {
          logger.warn(`trash: falling back to a direct delete for ${target}`, error)
          unmoved.push(target)
        }
      }

      if (unmoved.length > 0) await fsService.deleteEntries(unmoved, true)
      return
    }

    await fsService.deleteEntries(targets, false)
  })

  handle('files:duplicate', ({ path: target }) =>
    fsService.duplicateEntry(requireString(target, 'path'))
  )

  handle('files:move', ({ sources, targetDir }) =>
    fsService.moveEntries(requireStringArray(sources, 'sources'), requireString(targetDir, 'targetDir'))
  )

  handle('files:copy', ({ sources, targetDir }) =>
    fsService.copyEntries(requireStringArray(sources, 'sources'), requireString(targetDir, 'targetDir'))
  )

  handle('files:reveal', async ({ path: target }) => {
    const resolved = await pathGuard.assert(requireString(target, 'path'))
    shell.showItemInFolder(resolved)
  })

  handle('files:readAsDataUrl', ({ path: target }) =>
    fsService.readAsDataUrl(requireString(target, 'path'))
  )

  handle('files:writeBinary', ({ path: target, base64, overwrite }) =>
    fsService.writeBinary(requireString(target, 'path'), requireString(base64, 'base64'), overwrite)
  )

  handle('files:exists', async ({ path: target }) =>
    fsService.exists(await pathGuard.assert(requireString(target, 'path')))
  )

  handle('files:importAsset', async ({ sourcePath, documentPath, folder, data }) => {
    requireString(sourcePath, 'sourcePath')

    if (!documentPath) {
      throw Object.assign(new Error('Save the document before adding local images.'), {
        code: 'INVALID_ARGUMENT'
      })
    }

    return fsService.importAsset(sourcePath, path.dirname(documentPath), folder || 'images', data)
  })
}
