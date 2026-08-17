// ── node: ──────────────────────────────────────────────────────────────────
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { BrowserWindow, app, shell } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import type { IpcEventName, IpcEvents, WindowState } from '@shared'

// ── ./window ───────────────────────────────────────────────────────────────
import { appIcon } from './splash-window'
import { loadWindowBounds, trackWindowBounds } from './window-state'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

// ── types ──────────────────────────────────────────────────────────────────
import type { CreateWindowOptions } from './types'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
/** Set by the renderer once it has decided it is safe to close. */
let quitApproved = false

export function getMainWindow(): BrowserWindow | null {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
}

export function approveQuit(allow: boolean): void {
  quitApproved = allow
  if (allow) {
    const window = getMainWindow()
    window?.destroy()
  }
}

export function isQuitApproved(): boolean {
  return quitApproved
}

/** Type-safe push to the renderer. */
export function emitToRenderer<E extends IpcEventName>(event: E, payload: IpcEvents[E]): void {
  const window = getMainWindow()
  if (!window) return
  window.webContents.send(event, payload)
}

export function currentWindowState(): WindowState {
  const window = getMainWindow()
  return {
    maximized: window?.isMaximized() ?? false,
    fullScreen: window?.isFullScreen() ?? false,
    focused: window?.isFocused() ?? false
  }
}

export async function createMainWindow(
  options: CreateWindowOptions = {}
): Promise<BrowserWindow> {
  const bounds = await loadWindowBounds()

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...(bounds.x !== null && bounds.y !== null ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: 720,
    minHeight: 480,
    show: false,
    backgroundColor: options.theme === 'light' ? '#f7f8fa' : '#12141a',
    icon: appIcon(),
    // The title bar is drawn by the application (see features/shell/TitleBar).
    // `frame: false` is the price of that: Windows Snap Layouts' hover menu is
    // unavailable, though dragging to a screen edge still snaps normally.
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    trafficLightPosition: process.platform === 'darwin' ? { x: 14, y: 14 } : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
      // Renderer never opens remote content; this closes the popup vector.
      webviewTag: false,
      navigateOnDragDrop: false
    }
  })

  trackWindowBounds(mainWindow)
  if (bounds.maximized) mainWindow.maximize()

  mainWindow.once('ready-to-show', () => {
    if (!options.deferShow) mainWindow?.show()
  })

  const pushState = (): void => emitToRenderer('event:windowState', currentWindowState())
  mainWindow.on('maximize', pushState)
  mainWindow.on('unmaximize', pushState)
  mainWindow.on('enter-full-screen', pushState)
  mainWindow.on('leave-full-screen', pushState)
  mainWindow.on('focus', pushState)
  mainWindow.on('blur', pushState)

  /**
   * Closing is a renderer decision: it owns the dirty-document state and shows
   * the custom "unsaved changes" modal. Main asks, then waits for the answer.
   */
  mainWindow.on('close', (event) => {
    if (quitApproved) return
    event.preventDefault()
    emitToRenderer('event:quitRequested', { reason: 'close' })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  hardenNavigation(mainWindow)

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

/**
 * The renderer is a local application shell, not a browser. It must never
 * navigate away from its own document, and any user-clicked external link is
 * handed to the OS browser instead of being loaded in-process.
 */
function hardenNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void openExternalSafely(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    const devServer = isDev ? process.env.ELECTRON_RENDERER_URL : undefined
    // The dev server is allowed to navigate the renderer (HMR full reloads);
    // in a packaged build nothing is.
    if (devServer && url.startsWith(devServer)) return
    event.preventDefault()
    void openExternalSafely(url)
  })

  window.webContents.on('will-attach-webview', (event) => event.preventDefault())

  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error(`renderer process gone: ${details.reason}`)
  })
}

const EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:'])

export async function openExternalSafely(rawUrl: string): Promise<void> {
  try {
    const url = new URL(rawUrl)
    if (!EXTERNAL_SCHEMES.has(url.protocol)) {
      logger.warn(`blocked external open for scheme ${url.protocol}`)
      return
    }
    await shell.openExternal(url.toString())
  } catch (error) {
    logger.warn(`blocked malformed external url: ${rawUrl}`, error)
  }
}
