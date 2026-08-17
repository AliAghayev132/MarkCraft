// ── @lib ───────────────────────────────────────────────────────────────────
import { visit } from '@lib/markdown/hast'
import type { HastElement, HastRoot } from '@lib/markdown/unified'

/**
 * Gives every heading a stable id, so `#a-section` links work.
 *
 * The slug follows GitHub's rule, because that is the one people have already
 * typed into their documents: lower-case, punctuation dropped, spaces to
 * hyphens. A document that renders correctly on GitHub renders correctly here,
 * which matters more than any scheme of our own.
 *
 * Duplicates get `-1`, `-2` — again GitHub's behaviour, and the reason the
 * counter is per-render rather than global: two documents may each have their
 * own "Installation" without one of them getting a suffix.
 */
export function withHeadingIds(tree: HastRoot): HastRoot {
  const used = new Map<string, number>()

  visit(tree, 'element', (node: HastElement) => {
    if (!/^h[1-6]$/.test(node.tagName)) return
    if (typeof node.properties?.id === 'string') return

    const base = slugify(textOf(node))
    if (!base) return

    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)

    node.properties = { ...node.properties, id: seen === 0 ? base : `${base}-${seen}` }
  })

  return tree
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    // Keep letters, numbers, spaces and hyphens — in any script, so an
    // Azerbaijani or Russian heading gets a readable anchor rather than an
    // empty one.
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
}

/** The heading's visible text, with any inline markup flattened out. */
function textOf(node: HastElement): string {
  let text = ''

  visit(node, 'text', (child: { value?: string }) => {
    if (typeof child.value === 'string') text += child.value
  })

  return text
}
