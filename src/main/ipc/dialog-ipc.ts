// ── node: ──────────────────────────────────────────────────────────────────
import os from 'node:os'

// ── electron ───────────────────────────────────────────────────────────────
import { BrowserWindow, dialog } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import { MARKDOWN_EXTENSIONS } from '@shared'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle } from './register'

function parentWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

/**
 * Native dialogs are the one place the OS chrome is unavoidable — a sandboxed
 * renderer cannot browse the disk, and reimplementing a file picker would be
 * both worse and less trustworthy. Everything the dialog returns is treated as
 * an explicit user grant and added to the path guard.
 */
export function registerDialogHandlers(): void {
  handle('dialog:openFiles', async ({ multiple }) => {
    const parent = parentWindow()
    const options: Electron.OpenDialogOptions = {
      title: 'Open Markdown file',
      properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'],
      filters: [
        { name: 'Markdown', extensions: [...MARKDOWN_EXTENSIONS] },
        { name: 'All files', extensions: ['*'] }
      ]
    }

    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled) return []
    for (const filePath of result.filePaths) pathGuard.grantFile(filePath)
    return result.filePaths
  })

  handle('dialog:openFolder', async () => {
    const parent = parentWindow()
    const options: Electron.OpenDialogOptions = {
      title: 'Open folder as workspace',
      properties: ['openDirectory', 'createDirectory']
    }

    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)

    const folder = result.canceled ? null : (result.filePaths[0] ?? null)
    if (folder) pathGuard.grantRoot(folder)
    return folder
  })

  handle('dialog:saveFile', async ({ suggestedName, extensions, defaultDir }) => {
    const parent = parentWindow()
    const list = extensions.length > 0 ? extensions : ['md']
    const options: Electron.SaveDialogOptions = {
      title: 'Save as',
      defaultPath: `${defaultDir ?? os.homedir()}/${suggestedName || 'Untitled'}`,
      filters: [
        { name: list[0]?.toUpperCase() ?? 'File', extensions: list },
        { name: 'All files', extensions: ['*'] }
      ]
    }

    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options)

    const target = result.canceled ? null : (result.filePath ?? null)
    if (target) pathGuard.grantFile(target)
    return target
  })
}
