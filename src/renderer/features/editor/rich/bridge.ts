// ── @lib ───────────────────────────────────────────────────────────────────
import { fromHtml, toHtml, toMdast, visit } from '@lib/markdown/hast'
import {
  type HastElement,
  type HastRoot,
  type MdastRoot
} from '@lib/markdown/unified'

// ── @shared ────────────────────────────────────────────────────────────────
import type { MarkdownSettings } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { markdownToHast, serializeMarkdown } from '@features/editor/markdown'

/**
 * The rich editor <-> Markdown bridge.
 *
 * Both directions travel through hast, and the Markdown side always uses the
 * application's one canonical serialiser. That is the whole point: the rich
 * editor cannot invent its own Markdown dialect, so a document edited in the
 * rich view is byte-identical to the same edit made in the source view.
 *
 *   Markdown ──parse──▶ mdast ──▶ hast ──▶ HTML ──▶ ProseMirror
 *   ProseMirror ──▶ HTML ──parse──▶ hast ──▶ mdast ──stringify──▶ Markdown
 *
 * ProseMirror is deliberately *not* given its own document model to own. It is
 * a view over the same text as everything else.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * Markdown -> HTML (for Tiptap's `setContent`)
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * GFM renders task lists as `<li><input type=checkbox>`, while Tiptap's
 * TaskList extension expects `data-type` markers. Translating here keeps the
 * schema honest instead of teaching the editor a second checkbox convention.
 */
function toTaskListMarkup(tree: HastRoot): HastRoot {
  visit(tree, 'element', (node: HastElement) => {
    if (node.tagName !== 'ul' && node.tagName !== 'ol') return

    const items = node.children.filter(
      (child): child is HastElement => child.type === 'element' && child.tagName === 'li'
    )
    const taskItems = items.filter((item) => findCheckbox(item) !== null)
    if (taskItems.length === 0) return

    node.properties = { ...node.properties, 'data-type': 'taskList' }

    for (const item of items) {
      const checkbox = findCheckbox(item)
      if (!checkbox) continue

      item.properties = {
        ...item.properties,
        'data-type': 'taskItem',
        'data-checked': checkbox.properties?.checked ? 'true' : 'false'
      }

      // Drop the raw input; the state now lives on the list item.
      removeNode(item, checkbox)

      // Tiptap requires the item's text to be wrapped in a block node.
      if (!item.children.some((child) => child.type === 'element' && isBlock(child.tagName))) {
        item.children = [
          {
            type: 'element',
            tagName: 'p',
            properties: {},
            children: [...item.children]
          } as HastElement
        ]
      }
    }
  })

  return tree
}

function findCheckbox(item: HastElement): HastElement | null {
  let found: HastElement | null = null
  visit(item, 'element', (node: HastElement) => {
    if (found) return
    if (node.tagName === 'input' && node.properties?.type === 'checkbox') found = node
  })
  return found
}

function removeNode(root: HastElement, target: HastElement): void {
  visit(root, 'element', (node: HastElement) => {
    const index = node.children.indexOf(target as never)
    if (index >= 0) node.children.splice(index, 1)
  })
}

const BLOCK_TAGS = new Set(['p', 'div', 'ul', 'ol', 'pre', 'blockquote', 'h1', 'h2', 'h3', 'h4'])

function isBlock(tagName: string): boolean {
  return BLOCK_TAGS.has(tagName)
}

export function markdownToRichHtml(markdown: string, settings: MarkdownSettings): string {
  const tree = toTaskListMarkup(markdownToHast(markdown, settings.gfm))
  return toHtml(tree, { allowDangerousHtml: false })
}

/* ────────────────────────────────────────────────────────────────────────────
 * HTML -> Markdown (from Tiptap's `getHTML`)
 * ─────────────────────────────────────────────────────────────────────────── */

/** Reverses `toTaskListMarkup` so GFM checkbox syntax is emitted again. */
function fromTaskListMarkup(tree: HastRoot): HastRoot {
  visit(tree, 'element', (node: HastElement) => {
    if (node.properties?.['dataType'] !== 'taskItem' && node.properties?.['data-type'] !== 'taskItem') {
      return
    }

    const checked =
      node.properties?.['dataChecked'] === 'true' || node.properties?.['data-checked'] === 'true'

    node.children.unshift({
      type: 'element',
      tagName: 'input',
      properties: { type: 'checkbox', checked, disabled: true },
      children: []
    } as HastElement)
  })

  return tree
}

/**
 * Inline tags Markdown has no syntax for.
 *
 * The default behaviour would unwrap them and silently drop the formatting; we
 * emit them as inline HTML instead, which is valid Markdown and round-trips.
 * Underline is the motivating case — §2 asks for it, and `<u>` is the only
 * honest way to represent it.
 */
const HTML_PASSTHROUGH_TAGS = ['u', 'mark', 'kbd', 'sub', 'sup', 'abbr'] as const

const passthroughHandlers = Object.fromEntries(
  HTML_PASSTHROUGH_TAGS.map((tag) => [
    tag,
    (_state: unknown, node: HastElement) => ({
      type: 'html' as const,
      value: toHtml(node, { allowDangerousHtml: false })
    })
  ])
)

export function richHtmlToMdast(html: string): MdastRoot {
  const tree = fromTaskListMarkup(fromHtml(html, { fragment: true }) as HastRoot)
  return toMdast(tree, {
    // Keep GFM constructs (tables, strikethrough, task lists) as real mdast
    // nodes rather than degrading them to raw HTML.
    newlines: false,
    handlers: passthroughHandlers as never
  }) as MdastRoot
}

export function richHtmlToMarkdown(html: string, settings: MarkdownSettings): string {
  const mdast = richHtmlToMdast(html)
  const markdown = serializeMarkdown(mdast, settings)
  // remark-stringify always terminates with a newline; keep exactly one.
  return markdown.replace(/\n+$/, '\n')
}

/**
 * True when a document contains constructs the rich editor would flatten.
 *
 * Rather than silently degrading them, the UI surfaces this before the user
 * switches modes (§5: "avoid destructive Markdown conversion").
 */
export function findLossyConstructs(markdown: string): string[] {
  const found: string[] = []

  if (/^\s*\[\^[^\]]+\]:/m.test(markdown)) found.push('footnotes')
  if (/^\s*\[[^\]]+\]:\s*\S+/m.test(markdown)) found.push('link reference definitions')
  if (/^---\n[\s\S]*?\n---/.test(markdown)) found.push('front matter')
  if (/<(?!\/?(b|i|em|strong|code|kbd|mark|br|sub|sup|del|u)\b)[a-z][^>]*>/i.test(markdown)) {
    found.push('raw HTML blocks')
  }
  if (/\$\$[\s\S]+?\$\$/.test(markdown)) found.push('math blocks')

  return found
}
