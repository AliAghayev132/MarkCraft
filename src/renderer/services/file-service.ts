// ── @shared ────────────────────────────────────────────────────────────────
import type { DirEntry, Eol, FileContent, FileStamp, WriteOutcome, WriteRequest } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { soft, unwrap } from './ipc'

/**
 * Ergonomic wrapper over the raw `files:*` contract.
 *
 * Components never call `window.api` — they call this. That keeps the IPC shape
 * free to change, and gives one obvious place to add caching or batching later.
 */
export const fileService = {
  read(path: string): Promise<FileContent> {
    return unwrap(window.api.files.read({ path }))
  },

  write(request: WriteRequest): Promise<WriteOutcome> {
    return unwrap(window.api.files.write(request))
  },

  /** Convenience for the common "save this document" shape. */
  save(options: {
    path: string
    content: string
    eol: Eol
    bom: boolean
    expect: FileStamp | null
    force?: boolean
  }): Promise<WriteOutcome> {
    return unwrap(
      window.api.files.write({
        path: options.path,
        content: options.content,
        eol: options.eol,
        bom: options.bom,
        expect: options.expect,
        force: options.force ?? false
      })
    )
  },

  /** True when the path is there. Never throws, never logs. */
  exists(path: string): Promise<boolean> {
    return soft(window.api.files.exists({ path }), false)
  },

  stat(path: string): Promise<DirEntry> {
    return unwrap(window.api.files.stat({ path }))
  },

  stampOf(path: string): Promise<FileStamp | null> {
    return soft(window.api.files.stampOf({ path }), null)
  },

  list(path: string, showHidden = false): Promise<DirEntry[]> {
    return unwrap(window.api.files.list({ path, showHidden }))
  },

  createFile(path: string, content = ''): Promise<DirEntry> {
    return unwrap(window.api.files.createFile({ path, content }))
  },

  createDirectory(path: string): Promise<DirEntry> {
    return unwrap(window.api.files.createDirectory({ path }))
  },

  rename(from: string, to: string): Promise<DirEntry> {
    return unwrap(window.api.files.rename({ from, to }))
  },

  remove(paths: string[], toTrash = true): Promise<void> {
    return unwrap(window.api.files.delete({ paths, toTrash }))
  },

  duplicate(path: string): Promise<DirEntry> {
    return unwrap(window.api.files.duplicate({ path }))
  },

  move(sources: string[], targetDir: string): Promise<DirEntry[]> {
    return unwrap(window.api.files.move({ sources, targetDir }))
  },

  copy(sources: string[], targetDir: string): Promise<DirEntry[]> {
    return unwrap(window.api.files.copy({ sources, targetDir }))
  },

  reveal(path: string): Promise<void> {
    return unwrap(window.api.files.reveal({ path }))
  },

  readAsDataUrl(path: string): Promise<{ dataUrl: string; bytes: number }> {
    return unwrap(window.api.files.readAsDataUrl({ path }))
  },

  writeBinary(path: string, base64: string, overwrite = false): Promise<DirEntry> {
    return unwrap(window.api.files.writeBinary({ path, base64, overwrite }))
  },

  importAsset(
    sourcePath: string,
    documentPath: string | null,
    folder: string,
    /** Processed bytes; when given they are written instead of the source. */
    data?: { base64: string; name: string }
  ): Promise<{ path: string; relative: string }> {
    return unwrap(window.api.files.importAsset({ sourcePath, documentPath, folder, data }))
  },

  /** Local image URL for the preview, served over the guarded private scheme. */
  assetUrl(absolutePath: string): string {
    return window.api.assetUrl(absolutePath)
  }
}

export const dialogService = {
  openFiles(multiple = true): Promise<string[]> {
    return unwrap(window.api.dialog.openFiles({ multiple }))
  },

  openFolder(): Promise<string | null> {
    return unwrap(window.api.dialog.openFolder())
  },

  saveFile(
    suggestedName: string,
    extensions: string[] = ['md'],
    defaultDir: string | null = null
  ): Promise<string | null> {
    return unwrap(window.api.dialog.saveFile({ suggestedName, extensions, defaultDir }))
  }
}

export const watcherService = {
  watchFiles(paths: string[]): Promise<void> {
    return soft(window.api.watcher.watchFiles({ paths }), undefined)
  },
  unwatchFiles(paths: string[]): Promise<void> {
    return soft(window.api.watcher.unwatchFiles({ paths }), undefined)
  },
  watchDirectories(paths: string[]): Promise<void> {
    return soft(window.api.watcher.watchDirectories({ paths }), undefined)
  },
  unwatchDirectories(paths: string[]): Promise<void> {
    return soft(window.api.watcher.unwatchDirectories({ paths }), undefined)
  },
  reset(): Promise<void> {
    return soft(window.api.watcher.reset(), undefined)
  }
}

/**
 * Resolves real paths from a drop event. Returns an empty array for drags that
 * did not originate from the filesystem (text selections, browser links).
 */
export async function resolveDroppedPaths(dataTransfer: DataTransfer | null): Promise<string[]> {
  if (!dataTransfer || dataTransfer.files.length === 0) return []
  return window.api.dnd.resolve(dataTransfer.files)
}
