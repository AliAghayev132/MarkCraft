// ── electron ───────────────────────────────────────────────────────────────
import { contextBridge, ipcRenderer, webUtils } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import type { IpcChannel, IpcEventName, IpcEvents, MarkCraftApi } from '@shared'
import { INTERNAL_GRANT_PATHS } from '@shared'

/**
 * The preload is the entire trust boundary. It exposes a fixed, enumerated set
 * of methods — no `ipcRenderer`, no `require`, no dynamic channel names. A
 * compromised renderer can therefore only reach the operations listed in the
 * shared contract, and only through main's validation and path guard.
 */
const invoke =
  (channel: IpcChannel) =>
  (request?: unknown): Promise<unknown> =>
    ipcRenderer.invoke(channel, request)

/** Builds `{ read, write, … }` for one namespace from its channel list. */
function namespace<T>(prefix: string, methods: readonly string[]): T {
  const target: Record<string, unknown> = {}
  for (const method of methods) {
    target[method] = invoke(`${prefix}:${method}` as IpcChannel)
  }
  return Object.freeze(target) as T
}

const api: MarkCraftApi = {
  app: namespace('app', [
    'getInfo',
    'openExternal',
    'setDocumentEdited',
    'setRepresentedFilename',
    'confirmQuit',
    'toggleDevTools',
    'takePendingOpen'
  ]),

  window: namespace('window', ['minimize', 'toggleMaximize', 'close', 'getState', 'setTitle']),

  files: namespace('files', [
    'read',
    'write',
    'stat',
    'list',
    'createFile',
    'createDirectory',
    'rename',
    'delete',
    'duplicate',
    'move',
    'copy',
    'reveal',
    'readAsDataUrl',
    'writeBinary',
    'importAsset',
    'stampOf', 'exists']),

  dialog: namespace('dialog', ['openFiles', 'openFolder', 'saveFile']),

  workspace: namespace('workspace', [
    'loadState',
    'saveState',
    'recentFiles',
    'addRecentFile',
    'removeRecentFile',
    'clearRecentFiles',
    'recentWorkspaces',
    'addRecentWorkspace',
    'removeRecentWorkspace',
    'clearRecentWorkspaces',
    'pins',
    'togglePin',
    'authorizeRemembered'
  ]),

  icons: namespace('icons', ['list', 'import', 'remove', 'reveal']),

  locales: namespace('locales', ['list', 'reveal', 'writeTemplate']),

  settings: namespace('settings', ['get', 'update', 'reset', 'revealFile']),

  watcher: namespace('watcher', [
    'watchFiles',
    'unwatchFiles',
    'watchDirectories',
    'unwatchDirectories',
    'reset'
  ]),

  recovery: namespace('recovery', ['list', 'put', 'drop', 'clear']),

  links: namespace('links', ['graph']),
  http: namespace('http', ['send']),
  run: namespace('run', ['code']),
  streak: namespace('streak', ['load', 'add', 'reset']),
  study: namespace('study', ['load', 'save', 'reset']),
  search: namespace('search', ['workspace', 'replace', 'cancel']),

  export: namespace('export', ['run']),
  print: namespace('print', ['run']),
  share: namespace('share', ['run']),

  clipboard: namespace('clipboard', ['writeText', 'readText', 'readImage', 'readHtml']),

  history: namespace('history', ['list', 'read', 'purge', 'clear']),

  trash: namespace('trash', ['list', 'restore', 'purge', 'clear']),

  ai: namespace('ai', [
    'run',
    'cancel',
    'test',
    'listModels',
    'setKey',
    'keyStatus',
    'encryptionAvailable'
  ]),

  events: {
    on<E extends IpcEventName>(event: E, listener: (payload: IpcEvents[E]) => void): () => void {
      if (!ALLOWED_EVENTS.has(event)) {
        throw new Error(`Unknown event channel: ${String(event)}`)
      }

      const wrapped = (_e: Electron.IpcRendererEvent, payload: IpcEvents[E]): void =>
        listener(payload)

      ipcRenderer.on(event, wrapped)
      return () => {
        ipcRenderer.removeListener(event, wrapped)
      }
    }
  },

  dnd: {
    async resolve(files: FileList | File[]): Promise<string[]> {
      const list = Array.from(files as ArrayLike<File>)
      const paths = list
        .map((file) => {
          try {
            // Returns '' for anything that is not a real on-disk file, which is
            // why a synthetic `new File(...)` cannot be used to forge a path.
            return webUtils.getPathForFile(file)
          } catch {
            return ''
          }
        })
        .filter((value): value is string => typeof value === 'string' && value.length > 0)

      if (paths.length === 0) return []
      return (await ipcRenderer.invoke(INTERNAL_GRANT_PATHS, paths)) as string[]
    }
  },

  assetUrl(absolutePath: string): string {
    return `mcfile://asset/?p=${encodeURIComponent(absolutePath)}`
  }
}

const ALLOWED_EVENTS = new Set<string>([
  'event:watch',
  'event:windowState',
  'event:systemTheme',
  'event:command',
  'event:openPaths',
  'event:quitRequested',
  'event:powerSuspend',
  'event:aiChunk',
  'event:aiDone'
])

contextBridge.exposeInMainWorld('api', api)

// Surfaced in the status bar so a user can report which build they are on.
contextBridge.exposeInMainWorld('markcraftVersions', Object.freeze({ ...process.versions }))
