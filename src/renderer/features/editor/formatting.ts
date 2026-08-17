// ── @services ──────────────────────────────────────────────────────────────
import { getSettings } from '@services'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from './editor-registry'
import {
  activeMarksAt,
  clearHeading,
  insertBlock,
  insertCodeBlock,
  insertHorizontalRule,
  insertInline,
  redoSource,
  selectionOf,
  toggleBulletList,
  toggleHeading,
  toggleOrderedList,
  toggleQuote,
  toggleTaskList,
  toggleWrap,
  undoSource
} from './source'

// ── types ──────────────────────────────────────────────────────────────────
import type { FormatAction, ImagePayload, LinkPayload, TablePayload } from './types'

/**
 * One formatting API for both editing surfaces.
 *
 * The toolbar, the command palette and the keyboard shortcuts all call these —
 * they never know or care whether the user is in the rich editor or the
 * Markdown source, which is what keeps the two modes behaving identically (§12).
 */
export function applyFormat(action: FormatAction): boolean {
  const surface = editorRegistry.getSurface()

  if (surface === 'rich') return applyRich(action)
  return applySource(action)
}

function applySource(action: FormatAction): boolean {
  const view = editorRegistry.getSourceView()
  if (!view) return false

  const markdown = getSettings().markdown

  switch (action) {
    case 'bold':
      return toggleWrap(view, markdown.strong.repeat(2))
    case 'italic':
      return toggleWrap(view, markdown.emphasis)
    case 'underline':
      // Markdown has no underline; inline HTML is the only faithful form.
      return toggleWrap(view, '<u>', '</u>')
    case 'strikethrough':
      return toggleWrap(view, '~~')
    case 'code':
      return toggleWrap(view, '`')
    case 'codeBlock':
      return insertCodeBlock(view)
    case 'quote':
      return toggleQuote(view)
    case 'bulletList':
      return toggleBulletList(view, markdown.bullet)
    case 'orderedList':
      return toggleOrderedList(view)
    case 'taskList':
      return toggleTaskList(view)
    case 'horizontalRule':
      return insertHorizontalRule(view)
    case 'undo':
      return undoSource(view)
    case 'redo':
      return redoSource(view)
    case 'paragraph':
      return clearHeading(view)
    default: {
      const level = Number(action.replace('heading', ''))
      if (Number.isFinite(level) && level >= 1 && level <= 6) return toggleHeading(view, level)
      return false
    }
  }
}

function applyRich(action: FormatAction): boolean {
  const editor = editorRegistry.getRichEditor()
  if (!editor) return false

  const chain = editor.chain().focus()

  switch (action) {
    case 'bold':
      return chain.toggleBold().run()
    case 'italic':
      return chain.toggleItalic().run()
    case 'underline':
      return chain.toggleUnderline().run()
    case 'strikethrough':
      return chain.toggleStrike().run()
    case 'code':
      return chain.toggleCode().run()
    case 'codeBlock':
      return chain.toggleCodeBlock().run()
    case 'quote':
      return chain.toggleBlockquote().run()
    case 'bulletList':
      return chain.toggleBulletList().run()
    case 'orderedList':
      return chain.toggleOrderedList().run()
    case 'taskList':
      return chain.toggleTaskList().run()
    case 'horizontalRule':
      return chain.setHorizontalRule().run()
    case 'undo':
      return chain.undo().run()
    case 'redo':
      return chain.redo().run()
    case 'paragraph':
      return chain.setParagraph().run()
    default: {
      const level = Number(action.replace('heading', ''))
      if (Number.isFinite(level) && level >= 1 && level <= 6) {
        return chain.toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
      }
      return false
    }
  }
}

/** Which formatting marks are active, for toolbar button state. */
export function activeFormats(): Set<string> {
  const surface = editorRegistry.getSurface()

  if (surface === 'rich') {
    const editor = editorRegistry.getRichEditor()
    if (!editor) return new Set()

    const marks = new Set<string>()
    if (editor.isActive('bold')) marks.add('bold')
    if (editor.isActive('italic')) marks.add('italic')
    if (editor.isActive('underline')) marks.add('underline')
    if (editor.isActive('strike')) marks.add('strike')
    if (editor.isActive('code')) marks.add('code')
    if (editor.isActive('codeBlock')) marks.add('codeBlock')
    if (editor.isActive('blockquote')) marks.add('quote')
    if (editor.isActive('bulletList')) marks.add('bullet')
    if (editor.isActive('orderedList')) marks.add('ordered')
    if (editor.isActive('taskList')) marks.add('task')
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level })) marks.add(`heading-${level}`)
    }
    return marks
  }

  const view = editorRegistry.getSourceView()
  return view ? activeMarksAt(view) : new Set()
}

export function insertLink(payload: LinkPayload): boolean {
  const editor = editorRegistry.getRichEditor()

  if (editorRegistry.getSurface() === 'rich' && editor) {
    const chain = editor.chain().focus()
    if (editor.state.selection.empty) {
      return chain
        .insertContent({
          type: 'text',
          text: payload.text || payload.url,
          marks: [{ type: 'link', attrs: { href: payload.url, title: payload.title ?? null } }]
        })
        .run()
    }
    return chain.setLink({ href: payload.url, title: payload.title ?? null }).run()
  }

  const view = editorRegistry.getSourceView()
  if (!view) return false

  const selection = selectionOf(view)
  const label = payload.text || selection.text || payload.url
  const title = payload.title ? ` "${payload.title}"` : ''
  return insertInline(view, `[${label}](${payload.url}${title})`)
}

export function insertImage(payload: ImagePayload): boolean {
  if (editorRegistry.getSurface() === 'rich') {
    const editor = editorRegistry.getRichEditor()
    if (!editor) return false
    return editor
      .chain()
      .focus()
      .setImage({ src: payload.src, alt: payload.alt, title: payload.title ?? undefined })
      .run()
  }

  const view = editorRegistry.getSourceView()
  if (!view) return false

  const title = payload.title ? ` "${payload.title}"` : ''
  return insertInline(view, `![${payload.alt}](${payload.src}${title})`)
}

export function insertTable(payload: TablePayload): boolean {
  if (editorRegistry.getSurface() === 'rich') {
    const editor = editorRegistry.getRichEditor()
    if (!editor) return false
    return editor
      .chain()
      .focus()
      .insertTable({
        rows: payload.rows + (payload.headerRow ? 1 : 0),
        cols: payload.columns,
        withHeaderRow: payload.headerRow
      })
      .run()
  }

  const view = editorRegistry.getSourceView()
  if (!view) return false

  return insertBlock(view, buildMarkdownTable(payload))
}

/** Builds a GFM table whose columns are padded so the source stays readable. */
export function buildMarkdownTable(payload: TablePayload): string {
  const { columns, rows, headerRow, alignments } = payload
  const width = 8

  const header = Array.from({ length: columns }, (_, index) =>
    headerRow ? `Column ${index + 1}`.padEnd(width) : ' '.repeat(width)
  )

  const divider = Array.from({ length: columns }, (_, index) => {
    const alignment = alignments[index] ?? 'left'
    if (alignment === 'center') return `:${'-'.repeat(width - 2)}:`
    if (alignment === 'right') return `${'-'.repeat(width - 1)}:`
    return '-'.repeat(width)
  })

  const body = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => ' '.repeat(width))
  )

  const line = (cells: string[]): string => `| ${cells.join(' | ')} |`

  return [line(header), line(divider), ...body.map(line)].join('\n') + '\n'
}
