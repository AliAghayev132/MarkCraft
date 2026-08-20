// ── types ──────────────────────────────────────────────────────────────────
import type { IpcResult } from './types'

// ── ./shared ───────────────────────────────────────────────────────────────
import type {
  IpcApi,
  IpcChannel,
  IpcEventName,
  IpcEvents,
  IpcRequest,
  IpcResponse
} from './ipc-contract'

/**
 * Every bridged method returns an `IpcResult`, never a rejected promise, so the
 * renderer is forced to handle the failure case at the call site instead of
 * discovering it through an unhandled rejection.
 */
export type Invoke<C extends IpcChannel> =
  IpcRequest<C> extends void
    ? () => Promise<IpcResult<IpcResponse<C>>>
    : (request: IpcRequest<C>) => Promise<IpcResult<IpcResponse<C>>>

type Bridge<Prefix extends string> = {
  [C in IpcChannel as C extends `${Prefix}:${infer Method}` ? Method : never]: Invoke<C>
}

/**
 * The complete surface exposed to the renderer. Derived from `IpcApi`, so it
 * cannot drift from the contract: adding a channel adds a method here
 * automatically, and the preload fails to compile until it implements it.
 */
export interface MarkCraftApi {
  app: Bridge<'app'>
  window: Bridge<'window'>
  files: Bridge<'files'>
  dialog: Bridge<'dialog'>
  workspace: Bridge<'workspace'>
  icons: Bridge<'icons'>
  locales: Bridge<'locales'>
  settings: Bridge<'settings'>
  watcher: Bridge<'watcher'>
  recovery: Bridge<'recovery'>
  links: Bridge<'links'>
  search: Bridge<'search'>
  http: Bridge<'http'>
  run: Bridge<'run'>
  crypto: Bridge<'crypto'>
  session: Bridge<'session'>
  streak: Bridge<'streak'>
  study: Bridge<'study'>
  export: Bridge<'export'>
  print: Bridge<'print'>
  share: Bridge<'share'>
  clipboard: Bridge<'clipboard'>
  ai: Bridge<'ai'>
  trash: Bridge<'trash'>
  history: Bridge<'history'>

  /** Subscribe to a main -> renderer push channel. Returns an unsubscribe fn. */
  events: {
    on<E extends IpcEventName>(event: E, listener: (payload: IpcEvents[E]) => void): () => void
  }

  /**
   * Resolves real filesystem paths from a genuine drag-and-drop / file input
   * `FileList` and grants them for this session. Renderer script cannot
   * fabricate the input, which is what makes the grant safe.
   */
  dnd: {
    resolve(files: FileList | File[]): Promise<string[]>
  }

  /** Builds the private-scheme URL used to display a local image safely. */
  assetUrl(absolutePath: string): string
}

/** Compile-time proof that every contract channel is reachable on the bridge. */
export type _AllChannelsBridged = IpcChannel extends `${keyof MarkCraftApi & string}:${string}`
  ? true
  : never

export type ApiNamespace = keyof MarkCraftApi

export type { IpcApi }
