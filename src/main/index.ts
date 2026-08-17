// ── electron ───────────────────────────────────────────────────────────────
import { BrowserWindow, Menu, app, nativeTheme, session } from 'electron'

// ── ./services ─────────────────────────────────────────────────────────────
import { flushRecent } from './services/recent-service'
import { flushSettings, getSettings } from './services/settings-service'
import { enqueueOpen, isRendererReady } from './services/open-queue'
import { flushWorkspaces } from './services/workspace-service'
import { watcherService } from './services/watcher-service'

// ── ./security ─────────────────────────────────────────────────────────────
import { pathGuard } from './security/path-guard'

// ── ./window ───────────────────────────────────────────────────────────────
import { registerAssetProtocol, registerAssetSchemePrivileges } from './window/asset-protocol'
import { buildApplicationMenu } from './window/app-menu'
import {
  approveQuit,
  createMainWindow,
  emitToRenderer,
  getMainWindow,
  isQuitApproved
} from './window/main-window'
import { closeSplashWindow, createSplashWindow } from './window/splash-window'
import { flushWindowState } from './window/window-state'

// ── ./util ─────────────────────────────────────────────────────────────────
import { logger } from './util/logger'

// ── ./main ─────────────────────────────────────────────────────────────────
import { registerIpcHandlers } from './ipc'

/**
 * How long the splash stays up at minimum.
 *
 * Long enough to be a launch moment rather than a flicker, and short enough
 * that it is over before a cold start finishes anyway — on a warm start it is
 * the only thing the user waits for, which is why it is capped, not padded.
 */
const SPLASH_MIN_MS = 3000

const isDev = !app.isPackaged

// Must run before `app.whenReady()`.
registerAssetSchemePrivileges()

/**
 * A second launch (e.g. double-clicking a .md file in Explorer) focuses the
 * existing window and forwards the paths instead of starting a second copy.
 */
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const window = getMainWindow()
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
    }
    forwardOpenPaths(pathsFromArgv(argv), 'external')
  })

  void bootstrap()
}

async function bootstrap(): Promise<void> {
  await app.whenReady()

  app.setAppUserModelId('com.markcraft.app')
  applyContentSecurityPolicy()
  registerAssetProtocol()
  registerIpcHandlers()
  Menu.setApplicationMenu(buildApplicationMenu())

  nativeTheme.on('updated', () => {
    emitToRenderer('event:systemTheme', { shouldUseDark: nativeTheme.shouldUseDarkColors })
  })

  const settings = await getSettings()
  const splashShownAt = Date.now()

  /*
   * The splash opens in whatever mode the application was last left in — a
   * white flash before a dark editor is the most jarring thing a launch can do,
   * and the setting that prevents it is already on disk before any window
   * exists. `system` is resolved here because the splash cannot read the store.
   */
  const theme =
    settings.appearance.theme === 'system'
      ? nativeTheme.shouldUseDarkColors
        ? 'dark'
        : 'light'
      : settings.appearance.theme

  const splash = settings.appearance.splashScreen
    ? createSplashWindow({ theme, sound: settings.appearance.startupSound })
    : null

  // The main window is created hidden and revealed by the splash handoff, so
  // the two are never on screen together.
  const window = await createMainWindow({ deferShow: splash !== null, theme })

  if (splash) {
    const remaining = Math.max(0, SPLASH_MIN_MS - (Date.now() - splashShownAt))
    setTimeout(() => {
      closeSplashWindow()
      if (!window.isDestroyed()) window.show()
    }, remaining)
  }

  // Files passed on the command line at cold start. Queued until the renderer
  // collects them.
  const launchPaths = pathsFromArgv(process.argv)
  if (launchPaths.length > 0) {
    logger.info(`opening ${launchPaths.length} file(s) from the command line`)
    forwardOpenPaths(launchPaths, 'launch')
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow()
  })

  // macOS: opening a document from Finder. On a cold start this fires before
  // the window exists, which is exactly the launch case.
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    forwardOpenPaths([filePath], isRendererReady() ? 'external' : 'launch')
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  /**
   * Quitting is a renderer decision while documents are dirty — main asks and
   * waits for `app:confirmQuit`. Once approved, everything in flight is
   * flushed before the process exits so no debounced write is lost.
   */
  app.on('before-quit', (event) => {
    if (isQuitApproved()) return
    const window = getMainWindow()
    if (!window) {
      approveQuit(true)
      return
    }
    event.preventDefault()
    emitToRenderer('event:quitRequested', { reason: 'quit' })
  })

  app.on('will-quit', (event) => {
    event.preventDefault()
    void shutdown()
  })

  logger.info(`MarkCraft ${app.getVersion()} ready (${isDev ? 'development' : 'production'})`)
}

let shuttingDown = false

async function shutdown(): Promise<void> {
  if (shuttingDown) return
  shuttingDown = true

  try {
    await Promise.all([
      flushSettings(),
      flushRecent(),
      flushWorkspaces(),
      flushWindowState(),
      watcherService.dispose()
    ])
  } catch (error) {
    logger.error('shutdown flush failed', error)
  } finally {
    pathGuard.reset()
    app.exit(0)
  }
}

/**
 * Defence in depth. The renderer bundle is local and the navigation handlers
 * already block remote loads, but an explicit CSP means an injected `<script
 * src>` or `<img src=http://…>` from a malicious Markdown file simply fails.
 */
function applyContentSecurityPolicy(): void {
  const policy = isDev
    ? // Vite's dev server needs inline/eval for HMR and a websocket back to itself.
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: mcfile: ws: http://localhost:*; " +
      "img-src 'self' data: blob: mcfile:; " +
      "object-src 'none'; frame-src 'none'"
    : "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: mcfile:; " +
      "font-src 'self' data:; " +
      "media-src 'self' data: blob: mcfile:; " +
      "connect-src 'self'; " +
      "object-src 'none'; " +
      "frame-src 'none'; " +
      "base-uri 'none'; " +
      "form-action 'none'"

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy]
      }
    })
  })

  // Nothing in this application legitimately needs camera, geolocation, etc.
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
    const allowed = permission === 'clipboard-read' || permission === 'clipboard-sanitized-write'
    callback(allowed)
  })
}

function pathsFromArgv(argv: string[]): string[] {
  return argv
    .slice(isDev ? 2 : 1)
    .filter((arg) => !arg.startsWith('-'))
    .filter((arg) => /\.(md|markdown|mdown|mkd|mdx|txt)$/i.test(arg))
}

/**
 * Hands OS-supplied files to the renderer — or holds them until it is listening.
 * The queue and the reason for it live in `services/open-queue.ts`.
 */
function forwardOpenPaths(paths: string[], reason: 'launch' | 'external'): void {
  enqueueOpen(paths, reason)
}

process.on('uncaughtException', (error) => {
  logger.error('uncaught exception in main', error)
})

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection in main', reason)
})
