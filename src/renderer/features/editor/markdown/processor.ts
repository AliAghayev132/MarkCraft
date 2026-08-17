// ── @lib ───────────────────────────────────────────────────────────────────
import {
  defaultSchema,
  type StringifyOptions,
  type Processor,
  rehypeRaw,
  rehypeSanitize,
  remarkGfm,
  rehypeKatex,
  remarkMath,
  remarkParse,
  remarkRehype,
  remarkStringify,
  type HastRoot,
  type MdastRoot,
  unified
} from '@lib/markdown/unified'

// ── @shared ────────────────────────────────────────────────────────────────
import type { MarkdownSettings } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { withWikiLinks } from './wiki-links'

// ── types ──────────────────────────────────────────────────────────────────
import type { NormalizationCheck } from './types'

/**
 * The canonical Markdown pipeline.
 *
 * Markdown *text* is the document's single source of truth (see ARCHITECTURE.md
 * §"Document model"). mdast is the interchange format between the source view,
 * the rich view and the preview — never a second copy of the document.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * Serialisation
 *
 * These options are the application's one canonical output style. They are
 * user-visible in Settings → Markdown precisely because the rich editor
 * normalises to them: a user who cares about their file's exact formatting can
 * see, and change, the rules being applied.
 * ─────────────────────────────────────────────────────────────────────────── */

export function stringifyOptions(settings: MarkdownSettings): StringifyOptions {
  return {
    bullet: settings.bullet,
    emphasis: settings.emphasis,
    strong: settings.strong,
    fence: settings.fence,
    fences: true,
    incrementListMarker: settings.incrementListMarker,
    setext: settings.setext,
    listItemIndent: settings.listIndent,
    rule: '-',
    ruleSpaces: false,
    resourceLink: false,
    tightDefinitions: true,
    // Never hard-wrap: reflowing a user's prose on save is destructive and
    // produces enormous, meaningless diffs.
    bulletOther: settings.bullet === '-' ? '*' : '-'
  }
}

let cachedParser: Processor<MdastRoot, MdastRoot, MdastRoot, undefined, undefined> | null = null
let cachedParserGfm: boolean | null = null

/** Text -> mdast. */
export function parseMarkdown(text: string, gfm = true): MdastRoot {
  if (!cachedParser || cachedParserGfm !== gfm) {
    const processor = unified().use(remarkParse)
    if (gfm) processor.use(remarkGfm)
    cachedParser = processor as unknown as Processor<
      MdastRoot,
      MdastRoot,
      MdastRoot,
      undefined,
      undefined
    >
    cachedParserGfm = gfm
  }
  return cachedParser.parse(text) as MdastRoot
}

/** mdast -> text, using the canonical style. */
export function serializeMarkdown(tree: MdastRoot, settings: MarkdownSettings): string {
  const processor = unified().use(remarkStringify, stringifyOptions(settings))
  if (settings.gfm) processor.use(remarkGfm)
  return processor.stringify(tree as never)
}

/**
 * Round-trips text through the canonical serialiser.
 *
 * Used to answer one question before the rich editor is allowed to touch a
 * document: "would switching to the rich editor rewrite anything the user did
 * not ask us to rewrite?" If it would, the UI says so first (§5).
 */
export function normalizeMarkdown(text: string, settings: MarkdownSettings): string {
  return serializeMarkdown(parseMarkdown(text, settings.gfm), settings)
}

export function checkNormalization(
  text: string,
  settings: MarkdownSettings
): NormalizationCheck {
  const normalized = normalizeMarkdown(text, settings)
  if (normalized.trimEnd() === text.trimEnd()) {
    return { changed: false, normalized, differences: [] }
  }

  const differences: string[] = []
  const before = text
  const after = normalized

  if (/^[*+]\s/m.test(before) && !/^[*+]\s/m.test(after)) differences.push('list markers')
  if (/^.+\n=+$/m.test(before) || /^.+\n-+$/m.test(before)) differences.push('heading style')
  if (countOf(before, /\*(?!\*)/g) !== countOf(after, /\*(?!\*)/g))
    differences.push('emphasis markers')
  if (countOf(before, /^ {2,}\S/gm) !== countOf(after, /^ {2,}\S/gm))
    differences.push('indentation')
  if (countOf(before, /\n{3,}/g) !== countOf(after, /\n{3,}/g)) differences.push('blank lines')
  if (countOf(before, /^\|/gm) !== countOf(after, /^\|/gm)) differences.push('table alignment')
  if (differences.length === 0) differences.push('whitespace and punctuation')

  return { changed: true, normalized, differences }
}

function countOf(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length
}

/* ────────────────────────────────────────────────────────────────────────────
 * Sanitisation
 *
 * Markdown files are untrusted input, and in Electron an injected script is far
 * worse than a web XSS. Raw HTML is supported (users expect `<kbd>` and
 * `<details>` to work) but it goes through a strict allowlist first, and the
 * highlighter runs *after* sanitising so its class names are the only ones we
 * add ourselves.
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * The elements KaTeX produces.
 *
 * It emits a MathML tree for screen readers and assistive technology, plus an
 * HTML/SVG fallback for visual rendering. Both have to survive sanitisation or
 * the formula is silently replaced by its own source.
 */
const KATEX_TAGS = [
  'math',
  'semantics',
  'annotation',
  'mrow',
  'mi',
  'mn',
  'mo',
  'ms',
  'mtext',
  'msup',
  'msub',
  'msubsup',
  'mfrac',
  'msqrt',
  'mroot',
  'mover',
  'munder',
  'munderover',
  'mtable',
  'mtr',
  'mtd',
  'mspace',
  'mpadded',
  'mstyle',
  'menclose',
  'svg',
  'path',
  'line',
  'g',
  'defs'
] as const

const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className',
      'id',
      'align',
      // KaTeX positions glyphs with inline styles and marks up MathML with
      // its own attributes; dropping them leaves an unreadable formula.
      'style',
      'aria-hidden',
      'mathvariant',
      'encoding',
      'display',
      'xmlns',
      'width',
      'height',
      'viewBox',
      'preserveAspectRatio',
      'd',
      'fill'
    ],
    code: [...(defaultSchema.attributes?.code ?? []), 'className'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className'],
    input: ['type', 'checked', 'disabled'],
    img: [...(defaultSchema.attributes?.img ?? []), 'width', 'height', 'loading', 'title'],
    a: [...(defaultSchema.attributes?.a ?? []), 'title', 'target', 'rel'],
    th: [...(defaultSchema.attributes?.th ?? []), 'align'],
    td: [...(defaultSchema.attributes?.td ?? []), 'align']
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    // KaTeX renders to MathML with an HTML fallback. Without these the
    // sanitiser strips the formula and leaves the raw TeX behind.
    ...KATEX_TAGS,
    'details',
    'summary',
    'kbd',
    'mark',
    'abbr',
    'figure',
    'figcaption',
    'input',
    // Inline formatting Markdown has no syntax for. Without these the
    // sanitiser silently deletes a user's underline before the rich-editor
    // bridge ever sees it.
    'u',
    'ins',
    'sub',
    'sup',
    'small'
  ],
  // Anything not on this list is dropped, including every `javascript:` form.
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto', 'tel', '#'],
    src: ['http', 'https', 'data', 'mcfile']
  }
}

/** Text -> sanitised hast, ready for either React rendering or HTML export. */
export function markdownToHast(text: string, gfm: boolean): HastRoot {
  const processor = unified().use(remarkParse)
  if (gfm) processor.use(remarkGfm)

  // Math is parsed before the tree is converted, and rendered after — the two
  // plugins are two halves of one step and must stay on either side of
  // remark-rehype.
  processor.use(remarkMath)

  processor
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex, { throwOnError: false, errorColor: 'var(--mc-danger)' })
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitizeSchema)

  /*
   * Every plugin is registered before this line: `parse` freezes the processor,
   * and a `use` after it throws.
   *
   * `[[note]]` becomes an ordinary link between parsing and conversion, so
   * everything downstream — resolution, click handling, export — treats it as
   * the link it now is.
   */
  const mdast = withWikiLinks(processor.parse(text) as unknown as MdastRoot)
  const tree = processor.runSync(mdast as never)

  return tree as unknown as HastRoot
}

export { sanitizeSchema }
