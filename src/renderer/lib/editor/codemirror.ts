/**
 * CodeMirror 6.
 *
 * The engine is spread across a dozen `@codemirror/*` packages; collecting the
 * pieces the application actually uses here means a component or command sees
 * one import path, and an upgrade touches one file.
 */

// ── State ──────────────────────────────────────────────────────────────────
export { Compartment, EditorSelection, EditorState, Prec } from '@codemirror/state'
export type { ChangeSpec, Extension, StateEffect, Transaction } from '@codemirror/state'

// ── Search ─────────────────────────────────────────────────────────────────
export {
  EditorView,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection
} from '@codemirror/view'
export type { ViewUpdate } from '@codemirror/view'

// ── Search ─────────────────────────────────────────────────────────────────
export {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  redo,
  standardKeymap,
  undo
} from '@codemirror/commands'

// ── Search ─────────────────────────────────────────────────────────────────
export {
  HighlightStyle,
  LanguageDescription,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting
} from '@codemirror/language'
export { markdown, markdownKeymap } from '@codemirror/lang-markdown'

// ── Autocomplete (bracket closing only; no suggestion popup) ───────────────
export { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'

// ── Search ─────────────────────────────────────────────────────────────────
export {
  SearchQuery,
  findNext,
  findPrevious,
  highlightSelectionMatches,
  replaceAll,
  replaceNext,
  search,
  setSearchQuery
} from '@codemirror/search'

// ── Highlight tags used by the theme ───────────────────────────────────────
export { tags } from '@lezer/highlight'
