/**
 * Syntax-tree utilities.
 *
 * These are the tools the rich-editor bridge and the export renderer use to
 * move between HTML, hast and mdast. Kept apart from `unified.ts` because they
 * are tree *operations* rather than pipeline stages.
 */

export { visit } from 'unist-util-visit'

// ── HTML <-> hast ──────────────────────────────────────────────────────────
export { fromHtml } from 'hast-util-from-html'
export { toHtml } from 'hast-util-to-html'

// ── hast -> mdast (the return leg of the rich-editor round trip) ───────────
export { toMdast } from 'hast-util-to-mdast'

// ── hast -> React elements (the preview) ───────────────────────────────────
export { toJsxRuntime } from 'hast-util-to-jsx-runtime'

/**
 * The JSX factories `toJsxRuntime` needs. They are React's automatic-runtime
 * internals rather than part of its public component API, so they live beside
 * the consumer that requires them instead of in `lib/react`.
 */
export { Fragment, jsx, jsxs } from 'react/jsx-runtime'
