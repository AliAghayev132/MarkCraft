// ── @lib ───────────────────────────────────────────────────────────────────
import type { MdastContent, MdastRoot } from '@lib/markdown/unified'

/**
 * `[[Another note]]` as a link to `Another note.md`.
 *
 * The syntax every note-taking tool settled on, and the one thing missing from
 * Markdown that makes a folder of documents feel like a set rather than a pile.
 * Written as a plain mdast transform rather than a micromark extension because
 * it is a text substitution, not a new block type — and because it must not
 * touch code, which micromark would make harder rather than easier.
 *
 * Always on: `[[x]]` has no other meaning in Markdown, so there is nothing for
 * it to break. The target is resolved by the same relative-path logic ordinary
 * `[text](file.md)` links use, so a wiki link is a link in every other respect.
 */

/** `[[target]]` or `[[target|label]]`, non-greedy so two on a line both match. */
const WIKI_LINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

/** Nodes whose text is content, not prose — never rewritten. */
const OPAQUE = new Set(['code', 'inlineCode', 'link', 'linkReference', 'definition', 'html'])

export function withWikiLinks(tree: MdastRoot): MdastRoot {
  visit(tree as unknown as Parent)
  return tree
}

interface Parent {
  type: string
  children?: MdastContent[]
}

function visit(node: Parent): void {
  if (!node.children) return

  const next: MdastContent[] = []
  let changed = false

  for (const child of node.children) {
    if (OPAQUE.has(child.type)) {
      next.push(child)
      continue
    }

    if (child.type !== 'text') {
      visit(child as Parent)
      next.push(child)
      continue
    }

    const expanded = expand(child.value)
    if (expanded === null) {
      next.push(child)
      continue
    }

    next.push(...expanded)
    changed = true
  }

  if (changed) node.children = next
}

/** Splits one text node into text and link nodes, or null if it has no links. */
function expand(value: string): MdastContent[] | null {
  WIKI_LINK.lastIndex = 0
  if (!WIKI_LINK.test(value)) return null

  WIKI_LINK.lastIndex = 0
  const parts: MdastContent[] = []
  let cursor = 0

  for (const match of value.matchAll(WIKI_LINK)) {
    const start = match.index ?? 0
    if (start > cursor) {
      parts.push({ type: 'text', value: value.slice(cursor, start) } as MdastContent)
    }

    const target = (match[1] ?? '').trim()
    const label = (match[2] ?? '').trim() || target

    parts.push({
      type: 'link',
      // A target that already names a file keeps its extension; anything else
      // is a note name, and notes are `.md`.
      url: /\.[a-z0-9]+$/i.test(target) ? target : `${target}.md`,
      title: null,
      children: [{ type: 'text', value: label }]
    } as unknown as MdastContent)

    cursor = start + match[0].length
  }

  if (cursor < value.length) {
    parts.push({ type: 'text', value: value.slice(cursor) } as MdastContent)
  }

  return parts
}
