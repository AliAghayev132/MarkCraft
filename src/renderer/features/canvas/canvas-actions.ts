// ── @shared ────────────────────────────────────────────────────────────────
import { CANVAS_EXTENSION, joinPath } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState } from '@store'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { canvasTarget } from './canvas-store'

/**
 * The canvas the sidebar button opens when the user has not picked one.
 *
 * Every other canvas is a file they made and can name; this is the one that
 * exists so the button has somewhere to go in a workspace that has none yet.
 */
export const CANVAS_NAME = `canvas.${CANVAS_EXTENSION}`

export function defaultCanvasPath(): string | null {
  const root = getState().workspace.root
  return root ? joinPath(root, CANVAS_NAME) : null
}

/** Opens the workspace's default canvas, or says why it cannot. */
export function openDefaultCanvas(): void {
  const path = defaultCanvasPath()
  if (!path) {
    toast.warning(t('canvas.needsFolder'))
    return
  }
  canvasTarget.open(path)
}

/** The file's contents, or an empty canvas when there is not one yet. */
export async function readCanvas(path: string): Promise<string> {
  // Asked rather than probed: a canvas the user has only just named does not
  // exist yet, and letting the read fail would write an error to the log every
  // time one is created.
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
export async function writeCanvas(path: string, json: string): Promise<boolean> {
  try {
    await fileService.write({ path, content: json, eol: 'lf' })
    return true
  } catch (error) {
    toast.error(t('canvas.saveFailed'), error instanceof Error ? error.message : String(error))
    return false
  }
}
