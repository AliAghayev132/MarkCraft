// ── @lib ───────────────────────────────────────────────────────────────────
import { jsx, jsxs, toJsxRuntime, visit } from '@lib/markdown/hast'
import type { HastElement, HastRoot } from '@lib/markdown/unified'
import { Fragment, type ReactElement, createElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { dirname, joinPath } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { appService, fileService } from '@services'

// ── @features ──────────────────────────────────────────────────────────────
import { applyHighlighting } from './highlight'
import { withCallouts } from './callouts'
import { withHeadingIds } from './headings'
import { CodeBlock, MermaidDiagram } from '@features/editor/preview'
import { markdownToHast } from './processor'

// ── types ──────────────────────────────────────────────────────────────────
import type { RenderContext } from './types'

/**
 * Tags source positions onto block-level elements.
 *
 * This is what makes preview<->source scroll synchronisation honest: instead of
 * guessing from scroll percentages (which drifts badly when a document contains
 * a large image or code block), we can map a source line to the exact element
 * that came from it.
 */
function withSourcePositions(tree: HastRoot): HastRoot {
  visit(tree, 'element', (node: HastElement) => {
    const line = node.position?.start?.line
    if (typeof line === 'number') {
      node.properties = { ...node.properties, 'data-line': String(line) }
    }
  })
  return tree
}

const ABSOLUTE_URL = /^(https?:|mailto:|tel:|data:|mcfile:)/i

function isMarkdownTarget(href: string): boolean {
  return /\.(md|markdown|mdown|mkd|mdx|txt)(#.*)?$/i.test(href)
}

/** Markdown -> React elements, sanitised, highlighted and position-tagged. */
export function renderMarkdown(markdown: string, context: RenderContext): ReactElement {
  let tree = markdownToHast(markdown, context.gfm)
  tree = withSourcePositions(tree)
  tree = withHeadingIds(tree)
  tree = withCallouts(tree)
  if (context.highlight) tree = applyHighlighting(tree)

  return toJsxRuntime(tree, {
    Fragment,
    jsx: jsx as never,
    jsxs: jsxs as never,
    components: buildComponents(context)
  }) as ReactElement
}

type Components = Parameters<typeof toJsxRuntime>[1]['components']

function buildComponents(context: RenderContext): Components {
  return {
    a: (props: Record<string, unknown>) => {
      const href = typeof props.href === 'string' ? props.href : ''
      const { children, ...rest } = props as { children?: React.ReactNode }

      return createElement(
        'a',
        {
          ...rest,
          href,
          // Every navigation is intercepted: external links go to the OS
          // browser, relative Markdown links open as documents, and nothing
          // ever navigates the renderer itself.
          onClick: (event: React.MouseEvent) => {
            event.preventDefault()
            if (!href) return

            if (ABSOLUTE_URL.test(href)) {
              void appService.openExternal(href)
              return
            }

            if (href.startsWith('#')) {
              const target = document.getElementById(href.slice(1))
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              return
            }

            if (context.baseDir && isMarkdownTarget(href) && context.onOpenDocument) {
              const [pathPart] = href.split('#')
              context.onOpenDocument(resolveRelative(context.baseDir, pathPart ?? href))
            }
          }
        },
        children
      )
    },

    img: (props: Record<string, unknown>) => {
      const src = typeof props.src === 'string' ? props.src : ''
      const resolved =
        src && !ABSOLUTE_URL.test(src) && context.baseDir
          ? // Local images are served over the guarded private scheme rather
            // than file://, so `webSecurity` stays on.
            fileService.assetUrl(resolveRelative(context.baseDir, src))
          : src

      return createElement('img', { ...props, src: resolved, loading: 'lazy', draggable: false })
    },

    /*
     * A ```mermaid fence is a diagram, not code. Detected here rather than in
     * the pipeline because the engine is loaded on demand and rendering is
     * asynchronous — which a hast transform cannot be.
     */
    pre: (props: Record<string, unknown>) => {
      const diagram = mermaidSource(props)
      if (diagram !== null) return createElement(MermaidDiagram, { code: diagram })

      const fence = fenceOf(props)
      return createElement(CodeBlock, {
        language: fence.language,
        text: fence.text,
        children: props.children as never
      })
    },

    input: (props: Record<string, unknown>) =>
      // Task-list checkboxes are read-only in the preview: the document is
      // edited in the editor, and a click here would silently desync the two.
      createElement('input', { ...props, disabled: true, readOnly: true, tabIndex: -1 })
  }
}

/**
 * The text of a mermaid fence, or null for any other block.
 *
 * Read from the rendered children rather than the source: by this point the
 * fence is a pre/code pair, and the class name is the only place the language
 * survives.
 */
/** The language and the raw text of a fence, read back off the rendered pair. */
function fenceOf(props: Record<string, unknown>): { language: string | null; text: string } {
  const child = props.children as { props?: Record<string, unknown> } | undefined
  const code = child?.props

  const raw = code?.className
  const classes = Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : ''
  const match = classes.match(/\blanguage-([\w+#-]+)\b/)

  return { language: match?.[1] ?? null, text: plainText(code?.children) }
}

/** Highlighting turns the source into nested elements; the clipboard wants the text. */
function plainText(node: unknown): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(plainText).join('')

  const element = node as { props?: { children?: unknown } } | null
  return element?.props?.children === undefined ? '' : plainText(element.props.children)
}

function mermaidSource(props: Record<string, unknown>): string | null {
  const child = props.children as { props?: Record<string, unknown> } | undefined
  const code = child?.props
  if (!code) return null

  const raw = code.className
  const classes = Array.isArray(raw) ? raw.join(' ') : typeof raw === 'string' ? raw : ''
  if (!/\blanguage-mermaid\b/.test(classes)) return null

  const text = code.children
  return typeof text === 'string' ? text : null
}

function resolveRelative(baseDir: string, relative: string): string {
  const cleaned = decodeURI(relative).replace(/^\.\//, '')
  let dir = baseDir
  let rest = cleaned

  while (rest.startsWith('../')) {
    dir = dirname(dir)
    rest = rest.slice(3)
  }

  return joinPath(dir, rest.replace(/\//g, '/'))
}
