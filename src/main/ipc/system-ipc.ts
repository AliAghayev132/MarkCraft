// ── electron ───────────────────────────────────────────────────────────────
import { app, clipboard, nativeImage, nativeTheme, shell } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import type { AppInfo } from '@shared'

// ── ../services ────────────────────────────────────────────────────────────
import { revealSettingsFile } from '../services/settings-service'
import { takePendingOpen } from '../services/open-queue'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

// ── ../window ──────────────────────────────────────────────────────────────
import {
  approveQuit,
  currentWindowState,
  getMainWindow,
  openExternalSafely
} from '../window/main-window'

export function registerSystemHandlers(): void {
  // ── Application ──────────────────────────────────────────────────────────
  handle('app:getInfo', (): AppInfo => {
    const documents = safePath('documents')
    return {
      name: app.getName(),
      version: app.getVersion(),
      electron: process.versions.electron ?? '',
      chrome: process.versions.chrome ?? '',
      node: process.versions.node ?? '',
      platform: process.platform,
      isPackaged: app.isPackaged,
      userDataPath: app.getPath('userData'),
      homePath: app.getPath('home'),
      documentsPath: documents
    }
  })

  // Also the signal that the renderer's listeners are in place — see
  // services/open-queue.ts for why this is a pull rather than a push.
  handle('app:takePendingOpen', () => takePendingOpen())

  handle('app:openExternal', ({ url }) => openExternalSafely(requireString(url, 'url')))

  handle('app:setDocumentEdited', ({ edited }) => {
    // macOS shows a dot in the close button; a no-op elsewhere.
    getMainWindow()?.setDocumentEdited(Boolean(edited))
  })

  handle('app:setRepresentedFilename', ({ path }) => {
    if (process.platform !== 'darwin') return
    getMainWindow()?.setRepresentedFilename(path ?? '')
  })

  handle('app:confirmQuit', ({ allow }) => {
    approveQuit(Boolean(allow))
  })

  handle('app:toggleDevTools', () => {
    const window = getMainWindow()
    if (!window) return
    if (window.webContents.isDevToolsOpened()) window.webContents.closeDevTools()
    else window.webContents.openDevTools({ mode: 'detach' })
  })

  // ── Window chrome ────────────────────────────────────────────────────────
  handle('window:minimize', () => {
    getMainWindow()?.minimize()
  })

  handle('window:toggleMaximize', () => {
    const window = getMainWindow()
    if (!window) return
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
  })

  handle('window:close', () => {
    getMainWindow()?.close()
  })

  handle('window:getState', () => currentWindowState())

  handle('window:setTitle', ({ title }) => {
    getMainWindow()?.setTitle(title || 'MarkCraft')
  })

  // ── Clipboard ────────────────────────────────────────────────────────────
  handle('clipboard:writeText', ({ text }) => {
    clipboard.writeText(typeof text === 'string' ? text : '')
  })

  handle('clipboard:readText', () => clipboard.readText())

  handle('clipboard:readHtml', () => clipboard.readHTML())

  handle('clipboard:readImage', () => {
    const image = clipboard.readImage()
    if (image.isEmpty()) return null
    return { base64: image.toPNG().toString('base64'), ext: 'png' }
  })

  // ── Settings file reveal is here because it needs `shell`. ───────────────
  handle('settings:revealFile', () => revealSettingsFile())
}

function safePath(name: 'documents'): string {
  try {
    const target = app.getPath(name)
    // The user's Documents folder is a sensible default save location, so it is
    // granted up front — the "new document" flow would otherwise be blocked.
    pathGuard.grantRoot(target)
    return target
  } catch {
    return app.getPath('home')
  }
}

export function watchSystemTheme(emit: (shouldUseDark: boolean) => void): void {
  nativeTheme.on('updated', () => emit(nativeTheme.shouldUseDarkColors))
}

export function revealInFolder(target: string): void {
  shell.showItemInFolder(target)
}

export function imageFromDataUrl(dataUrl: string): Electron.NativeImage {
  return nativeImage.createFromDataURL(dataUrl)
}
