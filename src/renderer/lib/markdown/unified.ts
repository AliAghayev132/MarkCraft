/**
 * The unified / remark / rehype pipeline.
 *
 * This is the Markdown engine seam. Everything the document model does —
 * parsing, serialising, sanitising, rendering — goes through the bindings
 * re-exported here, so swapping an engine or adding a plugin (Mermaid, KaTeX,
 * footnote handling) is a change to this folder rather than a sweep through the
 * feature code.
 */

// ── Core ───────────────────────────────────────────────────────────────────
export { unified } from 'unified'
export type { Processor } from 'unified'

// ── Markdown (mdast) ───────────────────────────────────────────────────────
export { default as remarkParse } from 'remark-parse'
export { default as remarkGfm } from 'remark-gfm'
export { default as remarkStringify } from 'remark-stringify'
export type { Options as StringifyOptions } from 'remark-stringify'

// ── HTML to Markdown (hast → mdast) ────────────────────────────────────────
export { default as rehypeParse } from 'rehype-parse'
export { toMdast } from 'hast-util-to-mdast'

// ── Markdown to HTML (hast) ────────────────────────────────────────────────
export { default as remarkRehype } from 'remark-rehype'
export { default as rehypeRaw } from 'rehype-raw'
export { default as rehypeSanitize, defaultSchema } from 'rehype-sanitize'

// ── Tree types ─────────────────────────────────────────────────────────────
export type { Root as MdastRoot, RootContent as MdastContent } from 'mdast'
export type { Element as HastElement, Root as HastRoot, RootContent as HastContent } from 'hast'

// ── Math ───────────────────────────────────────────────────────────────────
// `$…$` and `$$…$$` become KaTeX-rendered HTML. Both plugins are small and
// synchronous, so they sit in the main pipeline; the stylesheet is what costs,
// and it is imported once by the preview.
export { default as remarkMath } from 'remark-math'
export { default as rehypeKatex } from 'rehype-katex'
