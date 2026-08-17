// ── @shared ────────────────────────────────────────────────────────────────
import { basename, dirname, dropKindFor, dropMarkdown, relativeFrom } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService, getSettings, resolveDroppedPaths, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState, selectActiveDocument } from '@store'

// ── ./ ─────────────────────────────────────────────────────────────────────
import { editorRegistry } from './editor-registry'

/**
 * Anything dropped onto the editor becomes the Markdown it ought to be.
 *
 * Files are copied into the document's asset folder first, the same way the
 * image dialog does it, so the link keeps working when the folder is moved or
 * shared. A path straight off the user's disk would break the moment the
 * document travelled anywhere.
 */
const INLINE_LIMIT = 96 * 1024

export async function handleEditorDrop(transfer: DataTransfer | null): Promise<boolean> {
  const paths = await resolveDroppedPaths(transfer)
  if (paths.length === 0) return false

  const document = selectActiveDocument(getState())
  if (!document) return false

  if (!document.path) {
    // An asset folder is relative to a document that has a location.
    toast.warning(t('drop.saveFirstTitle'), t('drop.saveFirstBody'))
    return true
  }

  const settings = getSettings()
  const snippets: string[] = []

  for (const source of paths) {
    const name = basename(source)

    try {
      const href = await hrefFor(source, document.path, settings.markdown)
      const contents = await inlineContentsFor(source, name)
      snippets.push(dropMarkdown(name, href, contents))
    } catch (error) {
      toast.error(t('drop.failed', { name }), error instanceof Error ? error.message : String(error))
    }
  }

  if (snippets.length === 0) return true

  // Blank-line separated: each dropped file is its own block, and a fence
  // pressed against a paragraph does not parse.
  editorRegistry.insertText(`${snippets.join('\n\n')}\n`)
  return true
}

async function hrefFor(
  source: string,
  documentPath: string,
  markdown: ReturnType<typeof getSettings>['markdown']
): Promise<string> {
  if (markdown.imageHandling !== 'relative') {
    return relativeFrom(dirname(documentPath), source)
  }

  const asset = await fileService.importAsset(source, documentPath, markdown.imageFolder)
  return asset.relative
}

/**
 * The text of a source file, when it is small enough to belong in a document.
 *
 * A large file is linked instead. Inlining a megabyte of SQL would not be the
 * user's intent, and it would make the document slower to open than the file
 * they dropped.
 */
async function inlineContentsFor(source: string, name: string): Promise<string | undefined> {
  if (dropKindFor(name) !== 'code') return undefined

  try {
    const stat = await fileService.stat(source)
    if (stat.size > INLINE_LIMIT) return undefined

    const file = await fileService.read(source)
    return file.content
  } catch {
    // Unreadable — `dropMarkdown` falls back to a link, which is honest.
    return undefined
  }
}
