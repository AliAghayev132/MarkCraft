// ── @lib ───────────────────────────────────────────────────────────────────
import { visit } from '@lib/markdown/hast'
import type { HastElement, HastRoot } from '@lib/markdown/unified'

/**
 * GitHub-style callouts: a blockquote opening with `[!NOTE]`.
 *
 * ```
 * > [!WARNING]
 * > This deletes the file.
 * ```
 *
 * Done as a hast transform rather than a React component so the result is
 * ordinary HTML with class names — which means an exported page and a printed
 * PDF carry the callout too. A component would render only inside the app, and
 * the export would quietly fall back to a plain quote.
 *
 * The syntax is GitHub's because that is what is already written in people's
 * documents; a document that renders correctly there renders correctly here.
 */
const KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const

export type CalloutKind = (typeof KINDS)[number]

const MARKER = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i

export function withCallouts(tree: HastRoot): HastRoot {
  visit(tree, 'element', (node: HastElement) => {
    if (node.tagName !== 'blockquote') return

    const paragraph = firstElement(node)
    if (!paragraph || paragraph.tagName !== 'p') return

    const lead = paragraph.children?.[0] as { type?: string; value?: string } | undefined
    if (lead?.type !== 'text' || typeof lead.value !== 'string') return

    const match = lead.value.match(MARKER)
    if (!match) return

    const kind = match[1].toLowerCase() as CalloutKind

    /*
     * The marker is consumed, not hidden. Leaving it in the text and covering
     * it with CSS would put `[!NOTE]` on the clipboard every time someone
     * copied the callout.
     */
    lead.value = lead.value.slice(match[0].length)

    // A callout whose first line is only the marker starts its prose on the
    // next line; the now-empty paragraph would otherwise leave a gap.
    if (lead.value.trim() === '' && paragraph.children.length === 1) {
      node.children = node.children.filter((child) => child !== paragraph)
    }

    node.properties = {
      ...node.properties,
      className: ['mc-callout', `mc-callout-${kind}`],
      'data-callout': kind
    }

    node.children = [titleNode(kind), ...node.children]
  })

  return tree
}

/**
 * The heading is generated rather than taken from the document, because the
 * marker carries no text — `[!NOTE]` is a kind, not a title. It is marked
 * `aria-hidden` so a screen reader hears the prose rather than a decorative
 * word repeated on every callout.
 */
function titleNode(kind: CalloutKind): HastElement {
  return {
    type: 'element',
    tagName: 'p',
    properties: { className: ['mc-callout-title'], 'aria-hidden': 'true' },
    children: [{ type: 'text', value: TITLES[kind] } as never]
  } as HastElement
}

const TITLES: Record<CalloutKind, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution'
}

function firstElement(node: HastElement): HastElement | null {
  for (const child of node.children ?? []) {
    if ((child as HastElement).type === 'element') return child as HastElement
  }
  return null
}

export { KINDS as CALLOUT_KINDS }
