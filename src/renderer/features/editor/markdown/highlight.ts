// ── @lib ───────────────────────────────────────────────────────────────────
import { visit } from '@lib/markdown/hast'
import { lowlight, resolveLanguage } from '@lib/markdown/highlight'
import type { HastContent, HastElement, HastRoot } from '@lib/markdown/unified'

/**
 * Code highlighting as a hast transformation.
 *
 * The highlighter itself lives in `@lib/markdown/highlight`; this module is the
 * application logic that walks a document and applies it. Keeping the two apart
 * is what makes swapping the engine — Shiki, say, for VS Code-grade fidelity at
 * the cost of async rendering — a change to one vendor module rather than to the
 * render pipeline.
 */

export { listSupportedLanguages, resolveLanguage } from '@lib/markdown/highlight'

/** Highlights a snippet directly — used by the rich editor's code-block node. */
export function highlightToHast(code: string, language: string | null): HastRoot {
  if (!language) return { type: 'root', children: [{ type: 'text', value: code }] }
  try {
    return lowlight.highlight(language, code) as HastRoot
  } catch {
    return { type: 'root', children: [{ type: 'text', value: code }] }
  }
}

function languageFromClassName(node: HastElement): string | null {
  const classes = node.properties?.className
  const list = Array.isArray(classes) ? classes.map(String) : []
  const match = list.find((name) => name.startsWith('language-'))
  return match ? match.slice('language-'.length) : null
}

/**
 * Replaces the text inside every fenced code block with the highlighter's token
 * tree.
 *
 * Runs *after* sanitisation on purpose: the class names it introduces are ours
 * and trusted, whereas anything the document supplied has already been filtered.
 */
export function applyHighlighting(tree: HastRoot): HastRoot {
  visit(tree, 'element', (node: HastElement, _index, parent) => {
    if (node.tagName !== 'code') return
    if (!parent || parent.type !== 'element' || (parent as HastElement).tagName !== 'pre') return

    const language = resolveLanguage(languageFromClassName(node) ?? undefined)
    const code = textContent(node)
    if (!code) return

    const existing = node.properties?.className
    const classes = Array.isArray(existing) ? existing.map(String) : []

    node.properties = {
      ...node.properties,
      className: language ? ['hljs', `language-${language}`, ...classes] : ['hljs', ...classes]
    }

    if (!language) return
    node.children = highlightToHast(code, language)
      .children as HastContent[] as HastElement['children']
  })

  return tree
}

function textContent(node: HastElement): string {
  let out = ''
  visit(node, 'text', (textNode: { value: string }) => {
    out += textNode.value
  })
  return out
}
