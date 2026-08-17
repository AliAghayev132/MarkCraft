// ── @lib ───────────────────────────────────────────────────────────────────
import {
  rehypeParse,
  remarkGfm,
  remarkStringify,
  toMdast,
  unified,
  type HastRoot,
  type MdastRoot
} from '@lib/markdown/unified'

/**
 * HTML into Markdown.
 *
 * Built on the pipeline the application already runs in the other direction
 * rather than on a second, separate HTML parser. That is not only one fewer
 * dependency: it means the two directions agree about what a table, a nested
 * list or a code block *is*, so text copied out of the preview and pasted back
 * in comes home unchanged.
 *
 * `remark-gfm` is on both ends, which is what carries tables, task lists and
 * strikethrough across instead of flattening them to paragraphs.
 */
const processor = unified()
  .use(rehypeParse, { fragment: true })
  .use(remarkStringify, {
    bullet: '-',
    emphasis: '_',
    strong: '*',
    fences: true,
    rule: '-'
  })
  .use(remarkGfm)

/*
 * A page's chrome is not its content. Pasting an article and getting its
 * navigation, cookie banner and footer is the failure that makes people stop
 * using a converter — these carry no prose worth keeping.
 */
const DROPPED = new Set(['script', 'style', 'noscript', 'nav', 'aside', 'footer', 'iframe', 'form'])

function prune(node: HastRoot): HastRoot {
  const walk = (children: HastRoot['children']): HastRoot['children'] =>
    children
      .filter((child) => !(child.type === 'element' && DROPPED.has(child.tagName)))
      .map((child) =>
        child.type === 'element'
          ? { ...child, children: walk(child.children as HastRoot['children']) }
          : child
      ) as HastRoot['children']

  return { ...node, children: walk(node.children) }
}

/** True when the text looks like a document rather than a stray angle bracket. */
export function looksLikeHtml(text: string): boolean {
  return /<([a-z][a-z0-9]*)\b[^>]*>[\s\S]*<\/\1>|<(br|hr|img|input)\b[^>]*\/?>/i.test(text)
}

export function htmlToMarkdown(html: string): string {
  if (html.trim() === '') return ''

  const hast = prune(processor.parse(html) as unknown as HastRoot)
  const mdast = toMdast(hast) as unknown as MdastRoot

  // Trailing whitespace from a page's indentation is not content.
  return String(processor.stringify(mdast as never)).trimEnd()
}
