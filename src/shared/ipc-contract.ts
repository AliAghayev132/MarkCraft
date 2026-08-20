// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasData } from './utils/canvas'
import type { SessionEvent, SessionRole } from './utils/session'
import type { LinkGraphResult } from './utils/links'
import type { CardState, StudyRecord } from './utils/cards'
import type { DayRecord } from './utils/streak'
import type { HttpRequest, HttpResponse } from './utils/http'
import type { RunResult } from './utils/runners'
import type {
  AiChunkEvent,
  AiDoneEvent,
  AiKeyStatus,
  AiRunRequest,
  AiRunResult,
  AiTestResult,
  AppInfo,
  HistoryEntry,
  HistoryVersion,
  TrashEntry,
  CustomIcon,
  DirEntry,
  ExportRequest,
  ExportResult,
  FileContent,
  FileStamp,
  PendingOpen,
  PinnedFile,
  PrintRequest,
  RecentFile,
  RecentWorkspace,
  RecoveryRecord,
  Settings,
  ShareRequest,
  WatchEvent,
  WindowState,
  WorkspaceReplaceRequest,
  WorkspaceReplaceResponse,
  WorkspaceSearchRequest,
  WorkspaceSearchResponse,
  WorkspaceState,
  WriteOutcome,
  WriteRequest
} from './types'

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/**
 * The single source of truth for the renderer <-> main boundary.
 *
 * Main registers a handler for every key; preload projects every key onto
 * `window.api`; the renderer consumes it through `renderer/services`. Adding a
 * channel in one place fails to compile in the others until all three are
 * wired, which is what keeps the IPC surface honest.
 */
export interface IpcApi {
  // ── Application ──────────────────────────────────────────────────────────
  'app:getInfo': { req: void; res: AppInfo }
  'app:openExternal': { req: { url: string }; res: void }
  'app:setDocumentEdited': { req: { edited: boolean }; res: void }
  'app:setRepresentedFilename': { req: { path: string | null }; res: void }
  'app:confirmQuit': { req: { allow: boolean }; res: void }
  'app:toggleDevTools': { req: void; res: void }
  /** Collects files the OS supplied before the renderer was listening. */
  'app:takePendingOpen': { req: void; res: PendingOpen[] }

  // ── Window chrome (driven by the custom title bar) ───────────────────────
  'window:minimize': { req: void; res: void }
  'window:toggleMaximize': { req: void; res: void }
  'window:close': { req: void; res: void }
  'window:getState': { req: void; res: WindowState }
  'window:setTitle': { req: { title: string }; res: void }

  // ── Filesystem ───────────────────────────────────────────────────────────
  'files:read': { req: { path: string }; res: FileContent }
  'files:write': { req: WriteRequest; res: WriteOutcome }
  'files:stat': { req: { path: string }; res: DirEntry }
  'files:list': { req: { path: string; showHidden: boolean }; res: DirEntry[] }
  'files:createFile': { req: { path: string; content?: string }; res: DirEntry }
  'files:createDirectory': { req: { path: string }; res: DirEntry }
  'files:rename': { req: { from: string; to: string }; res: DirEntry }
  'files:delete': { req: { paths: string[]; toTrash: boolean }; res: void }
  'files:duplicate': { req: { path: string }; res: DirEntry }
  'files:move': { req: { sources: string[]; targetDir: string }; res: DirEntry[] }
  'files:copy': { req: { sources: string[]; targetDir: string }; res: DirEntry[] }
  'files:reveal': { req: { path: string }; res: void }
  'files:readAsDataUrl': { req: { path: string }; res: { dataUrl: string; bytes: number } }
  'files:writeBinary': {
    req: { path: string; base64: string; overwrite?: boolean }
    res: DirEntry
  }
  /** Copies an arbitrary external file into the document's asset folder. */
  'files:importAsset': {
    req: {
      sourcePath: string
      documentPath: string | null
      folder: string
      /** Processed bytes to write instead of copying the source file. */
      data?: { base64: string; name: string }
    }
    res: { path: string; relative: string }
  }
  'files:stampOf': { req: { path: string }; res: FileStamp | null }
  /**
   * Whether a path is there — answered with a boolean rather than by letting a
   * read fail. Asking by probing works, but it writes an error to the log for
   * something entirely routine, and a log full of routine errors is a log
   * nobody reads.
   */
  'files:exists': { req: { path: string }; res: boolean }

  // ── Native dialogs (used only where unavoidable, per the UI rules) ───────
  'dialog:openFiles': { req: { multiple: boolean }; res: string[] }
  'dialog:openFolder': { req: void; res: string | null }
  'dialog:saveFile': {
    req: { suggestedName: string; extensions: string[]; defaultDir?: string | null }
    res: string | null
  }

  // ── Workspace, recents, pins ─────────────────────────────────────────────
  'workspace:loadState': { req: { root: string | null }; res: WorkspaceState }
  'workspace:saveState': { req: WorkspaceState; res: void }
  'workspace:recentFiles': { req: void; res: RecentFile[] }
  'workspace:addRecentFile': { req: { path: string }; res: RecentFile[] }
  'workspace:removeRecentFile': { req: { path: string }; res: RecentFile[] }
  'workspace:clearRecentFiles': { req: void; res: RecentFile[] }
  'workspace:recentWorkspaces': { req: void; res: RecentWorkspace[] }
  'workspace:addRecentWorkspace': { req: { path: string }; res: RecentWorkspace[] }
  'workspace:removeRecentWorkspace': { req: { path: string }; res: RecentWorkspace[] }
  'workspace:clearRecentWorkspaces': { req: void; res: RecentWorkspace[] }
  'workspace:pins': { req: void; res: PinnedFile[] }
  'workspace:togglePin': { req: { path: string }; res: PinnedFile[] }
  /**
   * Re-grants a path the user opened in an earlier session.
   *
   * Resolves to `true` only if the path is actually present in main's own
   * recent/pinned lists — the renderer cannot use this to name arbitrary paths.
   */
  'workspace:authorizeRemembered': { req: { path: string }; res: boolean }

  // ── Icons (user-supplied SVG files) ──────────────────────────────────────
  'icons:list': { req: void; res: CustomIcon[] }
  'icons:import': { req: void; res: CustomIcon[] }
  'icons:remove': { req: { id: string }; res: CustomIcon[] }
  'icons:reveal': { req: void; res: void }

  // ── Languages (user-supplied translation files) ──────────────────────────
  'locales:list': { req: void; res: { code: string; messages: Record<string, unknown> }[] }
  'locales:reveal': { req: void; res: void }
  'locales:writeTemplate': { req: { code: string; content: string }; res: { path: string } }

  // ── Settings ─────────────────────────────────────────────────────────────
  'settings:get': { req: void; res: Settings }
  'settings:update': { req: { patch: DeepPartial<Settings> }; res: Settings }
  'settings:reset': { req: { section?: keyof Settings }; res: Settings }
  'settings:revealFile': { req: void; res: void }

  // ── File watching ────────────────────────────────────────────────────────
  'watcher:watchFiles': { req: { paths: string[] }; res: void }
  'watcher:unwatchFiles': { req: { paths: string[] }; res: void }
  'watcher:watchDirectories': { req: { paths: string[] }; res: void }
  'watcher:unwatchDirectories': { req: { paths: string[] }; res: void }
  'watcher:reset': { req: void; res: void }

  // ── Crash recovery journal ───────────────────────────────────────────────
  'recovery:list': { req: void; res: RecoveryRecord[] }
  'recovery:put': { req: RecoveryRecord; res: void }
  'recovery:drop': { req: { id: string }; res: void }
  'recovery:clear': { req: void; res: void }

  // ── Search ───────────────────────────────────────────────────────────────
  'search:workspace': { req: WorkspaceSearchRequest; res: WorkspaceSearchResponse }
  'search:replace': { req: WorkspaceReplaceRequest; res: WorkspaceReplaceResponse }
  'search:cancel': { req: void; res: void }

  // ── Links ────────────────────────────────────────────────────────────────
  'links:graph': { req: { root: string }; res: LinkGraphResult }

  // ── Study ────────────────────────────────────────────────────────────────
  'study:load': { req: { path: string }; res: Record<string, StudyRecord> }
  'study:save': {
    req: { path: string; card: string; state: CardState; due: number }
    res: void
  }
  'study:reset': { req: { path: string }; res: void }

  // ── Writing streak ───────────────────────────────────────────────────────
  'streak:load': { req: void; res: DayRecord[] }
  'streak:add': { req: { day: string; added: number }; res: DayRecord[] }
  'streak:reset': { req: void; res: void }

  // ── HTTP tester ──────────────────────────────────────────────────────────
  /** User-initiated only. See http-service for the guards it goes through. */
  'http:send': { req: HttpRequest; res: HttpResponse }

  // ── Running a code block ─────────────────────────────────────────────────
  /** One block, once, because the user pressed Run. See run-service. */
  'run:code': { req: { language: string; code: string }; res: RunResult }

  // ── Locking a document ───────────────────────────────────────────────────
  /*
   * The passphrase crosses here and is stored on neither side. It exists for
   * the length of one call — see crypto-service.
   */
  'crypto:encrypt': { req: { text: string; passphrase: string; hint?: string }; res: string }
  'crypto:decrypt': { req: { json: string; passphrase: string }; res: string }
  'crypto:generateKey': { req: void; res: string }

  // ── Working on one canvas together ───────────────────────────────────────
  /*
   * Local network only. See session-service: nothing here reaches the internet
   * and nothing about the document leaves the network the people are on.
   */
  'session:host': { req: { canvas: CanvasData; name: string; port?: number }; res: { address: string } }
  'session:join': { req: { host: string; port: number; name: string }; res: { joined: true } }
  'session:leave': { req: void; res: { left: true } }
  'session:canvas': { req: { canvas: CanvasData }; res: { sent: true } }
  'session:cursor': { req: { x: number; y: number }; res: { sent: true } }
  'session:selection': { req: { ids: string[] }; res: { sent: true } }
  'session:where': { req: void; res: { address: string; name: string; role: SessionRole } }

  // ── Output ───────────────────────────────────────────────────────────────
  'export:run': { req: ExportRequest; res: ExportResult }
  'print:run': { req: PrintRequest; res: { printed: boolean } }
  'share:run': { req: ShareRequest; res: { ok: boolean; message: string } }

  // ── Clipboard ────────────────────────────────────────────────────────────
  'clipboard:writeText': { req: { text: string }; res: void }
  'clipboard:readText': { req: void; res: string }
  /** The HTML flavour, empty when the clipboard holds none. */
  'clipboard:readHtml': { req: void; res: string }
  'clipboard:readImage': { req: void; res: { base64: string; ext: string } | null }

  // ── Assistance from a user-supplied model ────────────────────────────────
  'ai:run': { req: AiRunRequest; res: AiRunResult }
  'ai:cancel': { req: { runId: string }; res: void }
  'ai:test': { req: { profileId: string }; res: AiTestResult }
  'ai:listModels': { req: { profileId: string }; res: string[] }
  /** The key crosses the bridge exactly once, in this direction only. */
  'ai:setKey': { req: { profileId: string; key: string }; res: void }
  'ai:keyStatus': { req: void; res: AiKeyStatus[] }
  'ai:encryptionAvailable': { req: void; res: boolean }

  // ── Deleted documents ────────────────────────────────────────────────────
  'trash:list': { req: void; res: TrashEntry[] }
  'trash:restore': { req: { id: string }; res: { path: string } }
  'trash:purge': { req: { id: string }; res: void }
  'trash:clear': { req: void; res: void }

  // ── Document history ─────────────────────────────────────────────────────
  'history:list': { req: { path: string }; res: HistoryEntry[] }
  'history:read': { req: { path: string; id: string }; res: HistoryVersion | null }
  'history:purge': { req: { path: string; id: string }; res: void }
  'history:clear': { req: { path: string }; res: void }
}

export type IpcChannel = keyof IpcApi
export type IpcRequest<C extends IpcChannel> = IpcApi[C]['req']
export type IpcResponse<C extends IpcChannel> = IpcApi[C]['res']

/** Push channels: main -> renderer. */
export interface IpcEvents {
  'event:watch': WatchEvent
  'event:windowState': WindowState
  'event:systemTheme': { shouldUseDark: boolean }
  'event:command': { commandId: string }
  /**
   * Files the OS handed us.
   *
   * `reason` is why: `launch` means the application was *started* by these
   * files (double-clicked in Explorer), which is what puts the renderer into
   * reading mode; `external` means it was already running, and the files are
   * simply opened as tabs so an editing session is never interrupted.
   */
  'event:openPaths': { paths: string[]; reason: 'launch' | 'external' }
  'event:quitRequested': { reason: 'quit' | 'close' }
  'event:powerSuspend': Record<string, never>
  /** One slice of a streamed answer. */
  'event:aiChunk': AiChunkEvent
  'event:aiDone': AiDoneEvent
  /** Somebody else moved, selected something, or changed the canvas. */
  'event:session': SessionEvent
}

export type IpcEventName = keyof IpcEvents

/**
 * Every push channel, as a value.
 *
 * The preload needs a runtime list to check against, and keeping a second copy
 * of it there meant a channel could be declared in the contract, sent by main,
 * and silently refused at the bridge — which is what happened the first time
 * this list was not derived from anything. Adding a channel above without
 * adding it here is now a type error.
 */
export const IPC_EVENT_NAMES = [
  'event:watch',
  'event:windowState',
  'event:systemTheme',
  'event:command',
  'event:openPaths',
  'event:quitRequested',
  'event:powerSuspend',
  'event:aiChunk',
  'event:aiDone',
  'event:session'
] as const satisfies readonly IpcEventName[]

/** Compile-time proof that the list above names every channel, not merely some. */
export type _AllEventsListed = IpcEventName extends (typeof IPC_EVENT_NAMES)[number]
  ? true
  : never

export const IPC_CHANNEL_PREFIX = 'markcraft'

/** Every channel that accepts a filesystem path must go through the path guard. */
export const PATH_BEARING_CHANNELS: ReadonlySet<string> = new Set<IpcChannel>([
  'files:read',
  'files:write',
  'files:stat',
  'files:list',
  'files:createFile',
  'files:createDirectory',
  'files:rename',
  'files:delete',
  'files:duplicate',
  'files:move',
  'files:copy',
  'files:reveal',
  'files:readAsDataUrl',
  'files:writeBinary',
  'files:importAsset',
  'files:stampOf',
  'files:exists',
  'search:workspace',
  'search:replace',
  'links:graph',
  'study:load',
  'study:save',
  'study:reset',
  'history:list',
  'history:read',
  'history:purge',
  'history:clear'
])
