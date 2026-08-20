// ── @shared ────────────────────────────────────────────────────────────────
import { basename, dirname, joinPath, markdownToCanvas, serialiseCanvas } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState, selectActiveDocument } from '@store'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { canvasTarget } from './canvas-store'

/**
 * Lays the open document out as a canvas beside it.
 *
 * A new file rather than a conversion: the document is still the document, and
 * somebody who wanted to see it as a canvas wanted both. Written next to it and
 * opened straight away, because a file that appears somewhere without being
 * shown is a file nobody finds.
 *
 * An unsaved document has nowhere to put one, and is told so rather than having
 * a canvas appear in a folder it has no connection to.
 */
export async function documentToCanvas(): Promise<void> {
  const document = selectActiveDocument(getState())
  if (!document) return

  if (!document.path) {
    toast.warning(t('canvas.fromDocumentNeedsFile'))
    return
  }

  const canvas = markdownToCanvas(document.content)
  if (canvas.nodes.length === 0) {
    toast.warning(t('canvas.fromDocumentEmpty'))
    return
  }

  const target = joinPath(
    dirname(document.path),
    `${basename(document.path).replace(/\.[^.]+$/, '')}.canvas`
  )

  try {
    await fileService.write({ path: target, content: serialiseCanvas(canvas), eol: 'lf' })
    toast.success(t('canvas.fromDocument'), basename(target))
    canvasTarget.open(target)
  } catch (error) {
    toast.error(
      t('canvas.fromDocumentFailed'),
      error instanceof Error ? error.message : String(error)
    )
  }
}
