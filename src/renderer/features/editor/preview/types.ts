// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactNode } from '@lib/react'

/**
 * Preview contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { MarkdownSettings } from '@shared'

export interface PreviewHandle {
  /** Scrolls so the element produced by `line` sits near the top. */
  scrollToLine: (line: number) => void
  getElement: () => HTMLElement | null
  /** Rendered HTML, used by export, print and "copy as HTML". */
  getHtml: () => string
}

export interface PreviewProps {
  markdown: string
  baseDir: string | null
  settings: MarkdownSettings
  onOpenDocument?: (path: string) => void
  /** Reports the source line at the top of the viewport, for scroll sync. */
  onVisibleLine?: (line: number) => void
  className?: string
  ref?: React.Ref<PreviewHandle>
}

export interface MermaidDiagramProps {
  /** The fence's contents, verbatim. */
  code: string
}

export interface CodeBlockProps {
  /** The fence info string, or null for a bare fence. */
  language: string | null
  /** The raw source, for the clipboard — not the highlighted markup. */
  text: string
  children: ReactNode
}
