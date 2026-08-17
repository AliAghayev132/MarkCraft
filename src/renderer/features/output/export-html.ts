// ── @lib ───────────────────────────────────────────────────────────────────
import { toHtml } from '@lib/markdown/hast'

// ── @shared ────────────────────────────────────────────────────────────────
import type { MarkdownSettings } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { applyHighlighting, markdownToHast } from '@features/editor/markdown'

/**
 * Renders the document body to standalone HTML for export, print and
 * "copy as HTML".
 *
 * Deliberately independent of the on-screen preview: the preview rewrites local
 * image sources to the guarded `mcfile://` scheme, which is meaningless outside
 * the application. Here the original relative paths are preserved so the main
 * process can resolve and inline them against the document's folder.
 */
export function renderDocumentHtml(markdown: string, settings: MarkdownSettings): string {
  let tree = markdownToHast(markdown, settings.gfm)
  if (settings.codeHighlighting) tree = applyHighlighting(tree)
  return toHtml(tree, { allowDangerousHtml: false })
}
