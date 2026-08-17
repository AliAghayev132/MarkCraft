// ── @shared ────────────────────────────────────────────────────────────────
import { joinPath } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState } from '@store'

/** The canvas belonging to the open folder. */
export const CANVAS_NAME = 'canvas.canvas'

export function canvasFilePath(): string | null {
  const root = getState().workspace.root
  return root ? joinPath(root, CANVAS_NAME) : null
}

/** The file's contents, or an empty canvas when there is not one yet. */
export async function readCanvas(): Promise<string> {
  const path = canvasFilePath()
  if (!path) return ''

  // Asked rather than probed: a folder with no canvas is the normal case, and
  // letting the read fail would write an error to the log every time one is
  // opened.
  if (!(await fileService.exists(path))) return ''

  try {
    return (await fileService.read(path)).content
  } catch {
    return ''
  }
}

/**
 * Writes the canvas back.
 *
 * Through the ordinary write path, so it is atomic and lands in the same
 * history and conflict handling as any other file — a canvas is a document the
 * user can lose, and it deserves the same protections.
 */
export async function writeCanvas(json: string): Promise<string | null> {
  const path = canvasFilePath()
  if (!path) {
    toast.warning(t('canvas.needsFolder'))
    return null
  }

  try {
    await fileService.write({ path, content: json, eol: 'lf' })
    return path
  } catch (error) {
    toast.error(t('canvas.saveFailed'), error instanceof Error ? error.message : String(error))
    return null
  }
}
