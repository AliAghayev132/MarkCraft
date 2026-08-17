export type ExportFormat = 'md' | 'html' | 'pdf' | 'json' | 'png' | 'txt' | 'rtf' | 'docx'

export interface ExportRequest {
  format: ExportFormat
  /** Filename without extension, used to seed the save dialog. */
  suggestedName: string
  /** Canonical Markdown source. Always supplied — `md` export uses it verbatim. */
  markdown: string
  /** Pre-rendered document body HTML. Required for `html`, `pdf` and `png`. */
  html?: string
  /**
   * The document as structured data, serialised by the renderer.
   *
   * Built there rather than in main because parsing Markdown is the renderer's
   * job and there is exactly one parser — main writing its own would be a
   * second, quietly diverging definition of what a heading is.
   */
  json?: string
  /** Directory the document lives in, used to resolve relative image paths. */
  baseDir: string | null
  /** When omitted a save dialog is shown. */
  targetPath?: string
  options: ExportOptions
}

export interface ExportOptions {
  includeStyles: boolean
  theme: 'light' | 'dark'
  embedImages: boolean
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3'
  landscape: boolean
  margins: 'default' | 'none' | 'minimum'
  printBackground: boolean
  headerFooter: boolean
  title: string
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeStyles: true,
  theme: 'light',
  embedImages: true,
  pageSize: 'A4',
  landscape: false,
  margins: 'default',
  printBackground: true,
  headerFooter: false,
  title: ''
}

export interface ExportResult {
  path: string
  format: ExportFormat
  bytes: number
}

export interface PrintRequest {
  html: string
  baseDir: string | null
  title: string
  theme: 'light' | 'dark'
  headerFooter: boolean
}

export type ShareTarget = 'copy-markdown' | 'copy-html' | 'copy-path' | 'reveal' | 'email' | 'os'

export interface ShareRequest {
  target: ShareTarget
  markdown: string
  html?: string
  path: string | null
  title: string
  /** Email only. Pre-fills the draft's To: line; blank is fine. */
  recipient?: string
}
