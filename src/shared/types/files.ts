/** Filesystem-facing domain types shared by main, preload and renderer. */

export type Eol = 'lf' | 'crlf'

export type EntryKind = 'file' | 'directory'

/**
 * Identity of a file's on-disk content at a point in time. Carried with every
 * loaded document so that saves can be conflict-checked and external changes
 * can be distinguished from our own writes.
 */
export interface FileStamp {
  mtimeMs: number
  size: number
  /** sha256 of the raw bytes, hex encoded. */
  hash: string
}

export interface DirEntry {
  name: string
  path: string
  kind: EntryKind
  size: number
  modifiedAt: number
  isSymlink: boolean
  /** Directories only: cheap hint used to decide whether to draw a twisty. */
  hasChildren: boolean
  /** Files only: lowercase extension without the dot. */
  ext: string
}

export interface FileContent {
  path: string
  content: string
  stamp: FileStamp
  eol: Eol
  /** True when the file began with a UTF-8 BOM, so we can round-trip it. */
  bom: boolean
}

export type WriteOutcome =
  | { status: 'written'; stamp: FileStamp }
  /** The file changed on disk since `expect` was taken. Nothing was written. */
  | { status: 'conflict'; current: FileStamp }

export interface WriteRequest {
  path: string
  content: string
  eol?: Eol
  bom?: boolean
  /** When present, the write aborts unless the file still matches this stamp. */
  expect?: FileStamp | null
  /** Explicit user override after a conflict was surfaced and acknowledged. */
  force?: boolean
}

export interface RecentFile {
  path: string
  name: string
  directory: string
  openedAt: number
}

export interface RecentWorkspace {
  path: string
  name: string
  openedAt: number
}

export interface PinnedFile {
  path: string
  name: string
  directory: string
  pinnedAt: number
}

/** Emitted from main when a watched path changes underneath us. */
export type WatchEvent =
  | { type: 'file-changed'; path: string; stamp: FileStamp }
  | { type: 'file-removed'; path: string }
  | { type: 'dir-changed'; path: string }

export const MARKDOWN_EXTENSIONS = ['md', 'markdown', 'mdown', 'mkd', 'mdx', 'txt'] as const

/** JSON Canvas — the open format the canvas reads and writes. */
export const CANVAS_EXTENSION = 'canvas'

/** A Markdown document encrypted with a key only its author has. */
export const ENCRYPTED_EXTENSION = 'hmd'

/**
 * What the file tree keeps when "Markdown only" is on.
 *
 * Wider than Markdown, because the filter is really "documents this
 * application opens" — and a canvas is one of those. Naming it after Markdown
 * is what hid every `.canvas` file the user made.
 */
export const DOCUMENT_EXTENSIONS = [
  ...MARKDOWN_EXTENSIONS,
  CANVAS_EXTENSION,
  ENCRYPTED_EXTENSION
] as const

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'] as const

/** Hard ceiling for opening a file in the editor (32 MB). */
export const MAX_OPEN_FILE_BYTES = 32 * 1024 * 1024

/** Above this size the rich (WYSIWYG) editor warns before rendering. */
export const RICH_EDITOR_WARN_BYTES = 512 * 1024

/**
 * A batch of files the OS asked the application to open.
 *
 * `reason` is why: `launch` means the application was *started* by these files,
 * which is what opens them in reading mode; `external` means it was already
 * running and they simply become tabs.
 */
export interface PendingOpen {
  paths: string[]
  reason: 'launch' | 'external'
}

/** One document waiting in MarkCraft's own trash. */
export interface TrashEntry {
  id: string
  name: string
  originalPath: string
  kind: 'file' | 'directory'
  size: number
  deletedAt: number
}
