// ── node: ──────────────────────────────────────────────────────────────────
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// ── electron ───────────────────────────────────────────────────────────────
import { BrowserWindow, dialog } from 'electron'

// ── @shared ────────────────────────────────────────────────────────────────
import { markdownToRtf, toPlainText } from '@shared'

// ── ./services ─────────────────────────────────────────────────────────────
import { markdownToDocx } from './docx-service'
import type { ExportRequest, ExportResult, PrintRequest } from '@shared'

// ── ./services ─────────────────────────────────────────────────────────────
import { buildHtmlDocument, inlineImages } from './document-template'

// ── ../security ────────────────────────────────────────────────────────────
import { atomicWriteFile } from '../security/atomic-write'
import { pathGuard } from '../security/path-guard'

// ── ../util ────────────────────────────────────────────────────────────────
import { logger } from '../util/logger'

const EXTENSION_FOR: Record<ExportRequest['format'], string> = {
  md: 'md',
  html: 'html',
  pdf: 'pdf',
  json: 'json',
  png: 'png',
  txt: 'txt',
  rtf: 'rtf',
  docx: 'docx'
}

/* A comfortable reading measure, and a ceiling so a book-length document
   cannot ask the compositor for a gigapixel image. */
const IMAGE_WIDTH = 900
const IMAGE_MAX_HEIGHT = 16000

const PAGE_SIZES = {
  A4: 'A4',
  A3: 'A3',
  Letter: 'Letter',
  Legal: 'Legal'
} as const

/**
 * Renders `html` in an offscreen window and hands back the loaded window.
 *
 * The window is created with node integration off and its own isolated session;
 * it only ever loads a local temp file we produced, never remote content.
 */
async function withOffscreenDocument<T>(
  html: string,
  action: (window: BrowserWindow) => Promise<T>
): Promise<T> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markcraft-'))
  const tempFile = path.join(tempDir, 'document.html')
  await fs.writeFile(tempFile, html, 'utf8')

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      javascript: false,
      webSecurity: true
    }
  })

  try {
    await window.loadFile(tempFile)
    // Give the layout engine a frame to settle fonts and images.
    await new Promise((resolve) => setTimeout(resolve, 120))
    return await action(window)
  } finally {
    if (!window.isDestroyed()) window.destroy()
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/**
 * The whole document as one tall PNG.
 *
 * A screenshot is bounded by the window, so the window is grown to the
 * document's own height before the capture — otherwise everything below the
 * fold is silently missing, which is the worst possible failure for an image
 * export because it looks like it worked.
 *
 * This is the one offscreen render with scripting on, because measuring the
 * layout requires running a line of JavaScript in the page. The body it loads
 * has already been through the Markdown pipeline's allowlist, which removes
 * every script, handler and javascript: URL — so enabling it gives the document
 * no code of its own, only ours.
 */
async function captureImage(html: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'markcraft-'))
  const tempFile = path.join(tempDir, 'document.html')
  await fs.writeFile(tempFile, html, 'utf8')

  const window = new BrowserWindow({
    show: false,
    width: IMAGE_WIDTH,
    height: 1024,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      offscreen: true
    }
  })

  try {
    await window.loadFile(tempFile)
    await new Promise((resolve) => setTimeout(resolve, 150))

    const height = (await window.webContents.executeJavaScript(
      'Math.ceil(Math.max(document.body.scrollHeight, document.documentElement.scrollHeight))'
    )) as number

    const clamped = Math.max(200, Math.min(Number(height) || 1024, IMAGE_MAX_HEIGHT))
    window.setContentSize(IMAGE_WIDTH, clamped)

    // The resize needs a frame to lay out and paint before it can be captured.
    await new Promise((resolve) => setTimeout(resolve, 250))

    const image = await window.webContents.capturePage()
    return image.toPNG()
  } finally {
    if (!window.isDestroyed()) window.destroy()
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

async function resolveTarget(request: ExportRequest): Promise<string | null> {
  if (request.targetPath) {
    return pathGuard.assert(request.targetPath)
  }

  const extension = EXTENSION_FOR[request.format]
  const parent = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const defaultPath = path.join(
    request.baseDir ?? os.homedir(),
    `${request.suggestedName || 'document'}.${extension}`
  )

  const result = parent
    ? await dialog.showSaveDialog(parent, {
        defaultPath,
        filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
      })
    : await dialog.showSaveDialog({ defaultPath })

  if (result.canceled || !result.filePath) return null

  // The user picked this location, so it becomes reachable for this session.
  pathGuard.grantFile(result.filePath)
  return result.filePath
}

export async function runExport(request: ExportRequest): Promise<ExportResult | null> {
  const target = await resolveTarget(request)
  if (!target) return null

  const title = request.options.title || request.suggestedName || 'Document'

  if (request.format === 'md') {
    await atomicWriteFile(target, request.markdown)
    const stats = await fs.stat(target)
    return { path: target, format: 'md', bytes: stats.size }
  }

  /*
   * Plain text is the Markdown with its syntax removed, not the Markdown
   * renamed. Someone asking for .txt wants prose to paste somewhere that has
   * no idea what a hash means.
   */
  if (request.format === 'txt') {
    await atomicWriteFile(target, toPlainText(request.markdown))
    const stats = await fs.stat(target)
    return { path: target, format: 'txt', bytes: stats.size }
  }

  /*
   * Rich text is generated here rather than from the rendered HTML: RTF has no
   * way to carry the HTML's styling, and going through it would mean deciding
   * twice what a heading looks like. The Markdown is the honest source.
   */
  if (request.format === 'rtf') {
    await atomicWriteFile(target, markdownToRtf(request.markdown, title))
    const stats = await fs.stat(target)
    return { path: target, format: 'rtf', bytes: stats.size }
  }

  if (request.format === 'docx') {
    const docx = await markdownToDocx(request.markdown, title)
    await atomicWriteFile(target, docx)
    return { path: target, format: 'docx', bytes: docx.byteLength }
  }

  if (request.format === 'json') {
    if (!request.json) {
      throw Object.assign(new Error('Structured data was not supplied for this export'), {
        code: 'INVALID_ARGUMENT'
      })
    }
    await atomicWriteFile(target, request.json)
    const stats = await fs.stat(target)
    return { path: target, format: 'json', bytes: stats.size }
  }

  if (!request.html) {
    throw Object.assign(new Error('Rendered HTML was not supplied for this export'), {
      code: 'INVALID_ARGUMENT'
    })
  }

  const body = request.options.embedImages
    ? await inlineImages(request.html, request.baseDir)
    : request.html

  const html = buildHtmlDocument({
    title,
    body,
    theme: request.options.theme,
    includeStyles: request.options.includeStyles,
    // With images inlined there is nothing left to resolve relatively.
    baseDir: request.options.embedImages ? null : request.baseDir
  })

  if (request.format === 'html') {
    await atomicWriteFile(target, html)
    const stats = await fs.stat(target)
    return { path: target, format: 'html', bytes: stats.size }
  }

  if (request.format === 'png') {
    const png = await captureImage(html)
    await atomicWriteFile(target, png)
    return { path: target, format: 'png', bytes: png.byteLength }
  }

  const pdf = await withOffscreenDocument(html, (window) =>
    window.webContents.printToPDF({
      pageSize: PAGE_SIZES[request.options.pageSize],
      landscape: request.options.landscape,
      printBackground: request.options.printBackground,
      margins: marginsFor(request.options.margins),
      displayHeaderFooter: request.options.headerFooter,
      headerTemplate: request.options.headerFooter ? headerTemplate(title) : undefined,
      footerTemplate: request.options.headerFooter ? FOOTER_TEMPLATE : undefined,
      generateTaggedPDF: true
    })
  )

  await atomicWriteFile(target, pdf)
  return { path: target, format: 'pdf', bytes: pdf.byteLength }
}

/**
 * Margins in inches. The `@page` rule in the document stylesheet already sets a
 * sensible print margin, so "default" leaves the page box alone and the other
 * presets only tighten it.
 */
function marginsFor(preset: 'default' | 'none' | 'minimum'): {
  top: number
  bottom: number
  left: number
  right: number
} {
  switch (preset) {
    case 'none':
      return { top: 0, bottom: 0, left: 0, right: 0 }
    case 'minimum':
      return { top: 0.15, bottom: 0.15, left: 0.15, right: 0.15 }
    default:
      return { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
  }
}

function headerTemplate(title: string): string {
  return `<div style="font-size:8px;width:100%;padding:0 16mm;color:#8b93a1;">
  <span>${title.replace(/[<>&]/g, '')}</span>
</div>`
}

const FOOTER_TEMPLATE = `<div style="font-size:8px;width:100%;padding:0 16mm;color:#8b93a1;text-align:right;">
  <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>`

/**
 * Printing renders the *document*, never the editor chrome — an offscreen
 * window is loaded with the same paged stylesheet the PDF export uses and the
 * OS print dialog is raised from there.
 */
export async function runPrint(request: PrintRequest): Promise<{ printed: boolean }> {
  const body = await inlineImages(request.html, request.baseDir)
  const html = buildHtmlDocument({
    title: request.title,
    body,
    theme: request.theme,
    includeStyles: true,
    baseDir: null
  })

  return withOffscreenDocument(
    html,
    (window) =>
      new Promise<{ printed: boolean }>((resolve) => {
        window.webContents.print(
          {
            silent: false,
            printBackground: true,
            ...(request.headerFooter ? { header: request.title, footer: '' } : {})
          },
          (success, failureReason) => {
            if (!success && failureReason && failureReason !== 'cancelled') {
              logger.warn(`print failed: ${failureReason}`)
            }
            resolve({ printed: success })
          }
        )
      })
  )
}
