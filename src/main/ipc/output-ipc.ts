// ── node: ──────────────────────────────────────────────────────────────────
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { BrowserWindow, ShareMenu, clipboard, shell } from 'electron'

// ── ../services ────────────────────────────────────────────────────────────
import { openEmailDraft } from '../services/email-draft'
import { runExport, runPrint } from '../services/export-service'
import { buildHtmlDocument } from '../services/document-template'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle } from './register'

export function registerOutputHandlers(): void {
  handle('export:run', async (request) => {
    const result = await runExport(request)
    if (!result) {
      throw Object.assign(new Error('Export cancelled'), { code: 'CANCELLED' })
    }
    return result
  })

  handle('print:run', (request) => runPrint(request))

  handle('share:run', async (request) => {
    switch (request.target) {
      case 'copy-markdown':
        clipboard.writeText(request.markdown)
        return { ok: true, message: 'Markdown copied to clipboard' }

      case 'copy-html': {
        const html = buildHtmlDocument({
          title: request.title,
          body: request.html ?? '',
          theme: 'light',
          includeStyles: true,
          baseDir: null
        })
        // Both flavours so a rich target pastes formatted and a plain one
        // still receives something sensible.
        clipboard.write({ text: request.html ?? request.markdown, html })
        return { ok: true, message: 'HTML copied to clipboard' }
      }

      case 'copy-path': {
        if (!request.path) return { ok: false, message: 'Document has not been saved yet' }
        clipboard.writeText(request.path)
        return { ok: true, message: 'Path copied to clipboard' }
      }

      case 'reveal': {
        if (!request.path) return { ok: false, message: 'Document has not been saved yet' }
        const resolved = await pathGuard.assert(request.path)
        shell.showItemInFolder(resolved)
        return { ok: true, message: 'Revealed in file manager' }
      }

      case 'email':
        // A draft with the file attached, not a mailto: body — see
        // services/email-draft.ts for why that distinction matters.
        return openEmailDraft({
          subject: request.title || 'Document',
          to: request.recipient?.trim() ?? '',
          markdown: request.markdown,
          fileName: request.path ? path.basename(request.path) : request.title
        })

      case 'os': {
        if (process.platform !== 'darwin') {
          return {
            ok: false,
            message: 'The system share sheet is only available on macOS'
          }
        }
        if (!request.path) return { ok: false, message: 'Save the document first' }

        const window = BrowserWindow.getFocusedWindow()
        if (!window) return { ok: false, message: 'No active window' }

        const menu = new ShareMenu({ filePaths: [await pathGuard.assert(request.path)] })
        menu.popup({ window })
        return { ok: true, message: '' }
      }

      default:
        return { ok: false, message: 'Unsupported share target' }
    }
  })
}

export function suggestedExportName(documentPath: string | null, fallback: string): string {
  if (!documentPath) return fallback
  const base = path.basename(documentPath)
  return base.slice(0, base.length - path.extname(base).length)
}
