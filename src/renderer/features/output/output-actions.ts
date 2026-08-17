// ── @shared ────────────────────────────────────────────────────────────────
import { basename } from '@shared'
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportFormat,
  type ExportOptions,
  type ShareTarget
} from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService, getSettings, isServiceError, outputService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { documentDirectory, getState, selectActiveDocument, suggestedFileName } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { buildDocumentJson } from './export-json'
import { renderDocumentHtml } from './export-html'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel } from '@store/slices/types'

function activeDocument(): DocumentModel | null {
  return selectActiveDocument(getState())
}

export async function exportDocument(
  format: ExportFormat,
  overrides: Partial<ExportOptions> = {}
): Promise<void> {
  const document = activeDocument()
  if (!document) return

  const settings = getSettings()
  const options: ExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    // Exported documents default to the light theme: a dark PDF is almost
    // never what someone wants on paper or in an email.
    theme: 'light',
    title: document.title.replace(/\.[^.]+$/, ''),
    ...overrides
  }

  try {
    const result = await outputService.export({
      format,
      suggestedName: suggestedFileName(document),
      markdown: document.content,
      html:
        format === 'md' || format === 'json' || format === 'txt'
          ? undefined
          : renderDocumentHtml(document.content, settings.markdown),
      json:
        format === 'json'
          ? JSON.stringify(buildDocumentJson(document, settings.markdown, new Date().toISOString()), null, 2)
          : undefined,
      baseDir: documentDirectory(document),
      options
    })

    toast.custom({
      tone: 'success',
      title: `Exported as ${format.toUpperCase()}`,
      description: basename(result.path),
      action: {
        label: 'Show in folder',
        onClick: () => void fileService.reveal(result.path)
      }
    })
  } catch (error) {
    if (isServiceError(error) && error.isCancellation) return
    toast.error('Export failed', isServiceError(error) ? error.message : String(error))
  }
}

export async function printDocument(): Promise<void> {
  const document = activeDocument()
  if (!document) return

  const settings = getSettings()

  try {
    await outputService.print({
      html: renderDocumentHtml(document.content, settings.markdown),
      baseDir: documentDirectory(document),
      title: document.title.replace(/\.[^.]+$/, ''),
      // Printing renders the document, never the editor UI (§22).
      theme: 'light',
      headerFooter: true
    })
  } catch (error) {
    toast.error('Print failed', isServiceError(error) ? error.message : String(error))
  }
}

export async function shareDocument(target: ShareTarget, recipient?: string): Promise<void> {
  const document = activeDocument()
  if (!document) return

  const settings = getSettings()

  try {
    const result = await outputService.share({
      target,
      markdown: document.content,
      html: renderDocumentHtml(document.content, settings.markdown),
      path: document.path,
      title: document.title.replace(/\.[^.]+$/, ''),
      recipient
    })

    if (result.message) {
      if (result.ok) toast.success(result.message)
      else toast.warning(result.message)
    }
  } catch (error) {
    toast.error('Share failed', isServiceError(error) ? error.message : String(error))
  }
}

