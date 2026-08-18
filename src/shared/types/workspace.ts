// ── ./types ────────────────────────────────────────────────────────────────
import type { ViewMode } from './settings'

export interface CursorPosition {
  line: number
  column: number
}

export interface PersistedTab {
  id: string
  /** null for an untitled document that has never been saved. */
  path: string | null
  title: string
  viewMode: ViewMode
  cursor: CursorPosition
  scrollTop: number
  pinned: boolean
  /** A word target for this document, when the user set one. */
  wordGoal?: number | null
}

export interface WorkspaceState {
  rootPath: string | null
  expandedPaths: string[]
  tabs: PersistedTab[]
  activeTabId: string | null
  sidebarView: 'explorer' | 'outline' | 'book' | 'search' | 'recent' | 'trash'
  updatedAt: number
}

export const EMPTY_WORKSPACE_STATE: WorkspaceState = {
  rootPath: null,
  expandedPaths: [],
  tabs: [],
  activeTabId: null,
  sidebarView: 'explorer',
  updatedAt: 0
}

/**
 * A crash-recovery journal entry. Written from main on an idle tick while a
 * document is dirty, deleted the moment it is successfully saved.
 */
export interface RecoveryRecord {
  id: string
  path: string | null
  title: string
  content: string
  /** Hash of the on-disk content the edits were based on, if any. */
  baseHash: string | null
  updatedAt: number
}

/**
 * Mirrors `NodeJS.Platform` without depending on node types — this file is
 * compiled into the renderer as well, which has no Node typings by design.
 */
export type AppPlatform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd'

export interface AppInfo {
  name: string
  version: string
  electron: string
  chrome: string
  node: string
  platform: AppPlatform
  isPackaged: boolean
  userDataPath: string
  homePath: string
  documentsPath: string
}

export interface WindowState {
  maximized: boolean
  fullScreen: boolean
  focused: boolean
}
