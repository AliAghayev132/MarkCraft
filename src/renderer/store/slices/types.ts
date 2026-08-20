/**
 * Slices contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type {
  CursorPosition,
  DirEntry,
  Eol,
  FileStamp,
  Settings,
  SortDirection,
  SortKey,
  ViewMode
} from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { LocaleMeta } from '@i18n/types'

export type ExternalState = 'none' | 'changed' | 'removed'

/**
 * One open document.
 *
 * `content` is the canonical Markdown — the single source of truth every view
 * derives from. `savedContent` is what is currently on disk, which is what makes
 * both the dirty indicator and Revert exact rather than a guess.
 */
export interface DocumentModel {
  id: string
  path: string | null
  title: string
  content: string
  savedContent: string
  stamp: FileStamp | null
  eol: Eol
  bom: boolean
  viewMode: ViewMode
  cursor: CursorPosition
  scrollTop: number
  /** Set when the file changed underneath us; drives the reload banner. */
  external: ExternalState
  externalStamp: FileStamp | null
  pinned: boolean
  /**
   * A word target for this document, or null for none.
   *
   * Per document rather than global: a target belongs to the thing being
   * written, and one number for every file the user ever opens is not a goal,
   * it is a nag.
   */
  wordGoal: number | null
  /**
   * Locked against editing.
   *
   * A guard against the accidental keystroke in a document that is finished,
   * signed off, or someone else's — not a security boundary. It lives on the
   * open document rather than on disk: making the *file* read-only is the
   * operating system's job, and an editor that quietly changed file permissions
   * would be doing something the user did not ask for.
   */
  locked: boolean
  /** Assigned lazily so untitled tabs are numbered in creation order. */
  untitledIndex: number | null
}

/** A closed tab, kept so it can be reopened in its original position. */
export interface ClosedDocument {
  path: string | null
  title: string
  content: string
  index: number
}

export interface DocumentsState {
  entities: Record<string, DocumentModel>
  order: string[]
  activeId: string | null
  /** Stack of recently closed documents, for "Reopen Closed Tab". */
  closed: ClosedDocument[]
  nextUntitled: number
}

export interface I18nState {
  /** The user's preference: a locale code, or "system". */
  preference: string
  /** The locale actually in use after resolution against what is installed. */
  language: string
  direction: 'ltr' | 'rtl'
  /** Metadata only — the message trees themselves stay out of the store. */
  available: (LocaleMeta & { source: 'builtin' | 'custom'; coverage: number })[]
}

export interface SettingsState {
  values: Settings
  loaded: boolean
  systemPrefersDark: boolean
}

export type ToastTone = 'success' | 'info' | 'warning' | 'danger'

export interface ToastAction {
  label: string
  /** Key into the callback registry — see `store/callbacks.ts`. */
  callbackId: string
}

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  description?: string
  /** 0 keeps the toast until it is dismissed explicitly. */
  duration: number
  action?: ToastAction
  /** Repeated toasts with the same key replace rather than stack. */
  key?: string
}

export interface ToastsState {
  items: Toast[]
}

/** The application's exclusive overlays — at most one is open at a time. */
export type InsertDialogId = 'link' | 'image' | 'table' | 'language' | null

export interface UiState {
  /** Which insert dialog is open, if any. Opened by a command, rendered by a layer. */
  insertDialog: InsertDialogId
  /**
   * Reading mode.
   *
   * Entered only when the operating system launched the application with a
   * document — double-clicking a `.md` file should present the document, not an
   * editor. It is a presentation state, not a document property: the same file
   * opened from inside the app is not in reading mode, and leaving it opens the
   * full application around the document already loaded.
   */
  readerMode: boolean
}

export interface TreeNode extends DirEntry {
  depth: number
}

export type { SidebarView } from '@shared'
import type { SidebarView } from '@shared'

export interface ClipboardState {
  paths: string[]
  mode: 'copy' | 'cut'
}

export interface WorkspaceState {
  root: string | null
  rootName: string
  /** Children per directory, keyed by normalised path. Populated on expand. */
  children: Record<string, DirEntry[]>
  /**
   * Expanded and loading directories as key sets.
   *
   * Plain objects rather than `Set`s: Redux state must stay serialisable for
   * time travel and the store's own integrity checks to mean anything.
   */
  expanded: Record<string, true>
  loading: Record<string, true>
  selection: string[]
  /** Anchor for shift-click range selection. */
  lastSelected: string | null
  filter: string
  sortKey: SortKey
  sortDirection: SortDirection
  foldersFirst: boolean
  showHidden: boolean
  sidebarView: SidebarView
  clipboard: ClipboardState | null
}
