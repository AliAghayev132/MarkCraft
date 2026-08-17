// ── @lib ───────────────────────────────────────────────────────────────────
import {
  EditorView,
  type Extension,
  HighlightStyle,
  syntaxHighlighting,
  tags
} from '@lib/editor/codemirror'

/**
 * CodeMirror is themed entirely from the application's design tokens.
 *
 * Nothing here hard-codes a colour: switching theme or accent updates the CSS
 * custom properties on `:root` and the editor follows without being rebuilt,
 * which is why theme changes are instant even with a large document open.
 */
export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: 'var(--mc-editor-font-size)',
    backgroundColor: 'var(--mc-editor-bg)',
    color: 'var(--mc-text-primary)'
  },
  '.cm-scroller': {
    fontFamily: 'var(--mc-editor-font-family)',
    lineHeight: 'var(--mc-editor-line-height)',
    overflow: 'auto'
  },
  '.cm-content': {
    padding: '14px 0 45vh',
    caretColor: 'var(--mc-editor-cursor)'
  },
  '.cm-line': {
    padding: '0 18px 0 8px'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--mc-editor-cursor)',
    borderLeftWidth: '2px'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--mc-editor-selection)'
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--mc-editor-active-line)'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--mc-editor-gutter)',
    color: 'var(--mc-editor-gutter-text)',
    border: 'none',
    borderRight: '1px solid var(--mc-border-subtle)',
    paddingRight: '2px',
    userSelect: 'none'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'var(--mc-text-secondary)'
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 6px 0 12px',
    minWidth: '34px',
    fontVariantNumeric: 'tabular-nums'
  },
  '.cm-foldGutter .cm-gutterElement': {
    padding: '0 2px',
    opacity: 0.55
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--mc-editor-match)'
  },
  '.cm-searchMatch': {
    backgroundColor: 'var(--mc-editor-match)',
    outline: '1px solid transparent'
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--mc-editor-match-active)'
  },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--mc-accent-subtle)',
    outline: '1px solid var(--mc-accent-border)'
  },
  '&.cm-focused .cm-nonmatchingBracket': {
    backgroundColor: 'var(--mc-danger-bg)'
  },
  '.cm-placeholder': {
    color: 'var(--mc-text-tertiary)'
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--mc-bg-raised)',
    border: '1px solid var(--mc-border)',
    borderRadius: 'var(--mc-radius-md)',
    boxShadow: 'var(--mc-shadow-md)',
    color: 'var(--mc-text-primary)'
  },
  '.cm-panels': {
    // The application supplies its own find/replace panel (§26); CodeMirror's
    // built-in one is never mounted.
    display: 'none'
  }
})

/**
 * Markdown-aware syntax colours. Headings, emphasis and links are given real
 * typographic weight — the source view is a writing surface, not a code dump.
 */
export const markdownHighlightStyle = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--mc-syn-heading)', fontWeight: '700', fontSize: '1.42em' },
  { tag: tags.heading2, color: 'var(--mc-syn-heading)', fontWeight: '700', fontSize: '1.26em' },
  { tag: tags.heading3, color: 'var(--mc-syn-heading)', fontWeight: '650', fontSize: '1.13em' },
  { tag: tags.heading4, color: 'var(--mc-syn-heading)', fontWeight: '650' },
  { tag: [tags.heading5, tags.heading6], color: 'var(--mc-syn-heading)', fontWeight: '600' },

  { tag: tags.strong, fontWeight: '700', color: 'var(--mc-text-primary)' },
  { tag: tags.emphasis, fontStyle: 'italic', color: 'var(--mc-syn-emphasis)' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: 'var(--mc-text-tertiary)' },

  { tag: tags.link, color: 'var(--mc-syn-link)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--mc-syn-link)' },
  { tag: tags.quote, color: 'var(--mc-syn-quote)', fontStyle: 'italic' },
  { tag: tags.monospace, color: 'var(--mc-syn-code)' },
  { tag: tags.list, color: 'var(--mc-accent)' },
  { tag: tags.contentSeparator, color: 'var(--mc-text-tertiary)', fontWeight: '600' },

  // Markup delimiters (the `#`, `**`, backticks) stay visible but recede.
  { tag: tags.processingInstruction, color: 'var(--mc-text-tertiary)' },
  { tag: tags.meta, color: 'var(--mc-text-tertiary)' },

  // Embedded code blocks.
  { tag: tags.keyword, color: 'var(--mc-syn-keyword)' },
  { tag: [tags.string, tags.special(tags.string)], color: 'var(--mc-syn-string)' },
  { tag: [tags.number, tags.bool, tags.null], color: 'var(--mc-syn-number)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: 'var(--mc-syn-comment)', fontStyle: 'italic' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: 'var(--mc-syn-function)' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: 'var(--mc-syn-type)' },
  { tag: [tags.variableName, tags.propertyName, tags.attributeName], color: 'var(--mc-syn-variable)' },
  { tag: [tags.operator, tags.punctuation, tags.separator, tags.bracket], color: 'var(--mc-syn-punctuation)' },
  { tag: tags.tagName, color: 'var(--mc-syn-function)' },
  { tag: tags.invalid, color: 'var(--mc-danger)' }
])

export function themeExtensions(): Extension[] {
  return [editorTheme, syntaxHighlighting(markdownHighlightStyle, { fallback: true })]
}
