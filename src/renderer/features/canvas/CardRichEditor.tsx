// ── @lib ───────────────────────────────────────────────────────────────────
import {
  CodeBlockLowlight,
  EditorContent,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  useEditor
} from '@lib/editor/tiptap'
import { lowlight } from '@lib/markdown/highlight'
import { useEffect, useMemo, useRef, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { markdownToRichHtml, richHtmlToMarkdown } from '@features/editor/rich'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { cardEditor } from './card-editor-store'

// ── types ──────────────────────────────────────────────────────────────────
import type { CardRichEditorProps } from './types'

/**
 * Writing in a card, the way the document editor writes.
 *
 * A card holds Markdown, and until now writing in one meant typing the markers
 * by hand — `##` for a heading, asterisks for bold — while the rest of the
 * application has had a surface where a heading simply looks like a heading.
 * There is no reason a card should be the one place you have to spell it out.
 *
 * The conversion is the same conversion: `markdownToRichHtml` and
 * `richHtmlToMarkdown` are the document editor's own, so what survives a
 * round-trip in a card is exactly what survives one in a document. Only the
 * shell is different, and deliberately so — a card needs no autosave, no
 * document registry and no lossy-construct banner, and dragging those in would
 * make a note on a canvas answerable to machinery meant for a file.
 *
 * The extension set is trimmed to what fits: no tables and no images, because
 * a card two hundred pixels wide cannot show either, and offering them would be
 * offering something that does not work.
 */
export function CardRichEditor({
  value,
  onChange,
  onDone,
  onCancel
}: CardRichEditorProps): ReactElement {
  const t = useT()
  const settings = useAppSelector((state) => state.settings.values.markdown)

  /*
   * What was last handed upwards. The card's text prop follows this editor, and
   * without a record of what we sent, an echo of our own Markdown would come
   * back and reset the caret mid-sentence.
   */
  const lastEmitted = useRef(value)

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: settings.linkifyBareUrls,
          HTMLAttributes: { rel: 'noopener noreferrer' }
        }
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: t('canvas.writeHere') })
    ],
    [settings.linkifyBareUrls, t]
  )

  const editor = useEditor({
    extensions,
    content: markdownToRichHtml(value, settings),
    editorProps: {
      attributes: {
        class: 'mc-document mc-canvas-card mc-card-editor',
        spellcheck: 'false'
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
          return true
        }

        // Ctrl+Enter finishes, the way it does in every field that takes more
        // than one line — Enter itself belongs to the paragraph being written.
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          onDone()
          return true
        }

        return false
      }
    },
    onUpdate: ({ editor: instance }) => {
      const markdown = richHtmlToMarkdown(instance.getHTML(), settings)
      lastEmitted.current = markdown
      onChange(markdown)
    },
    // The docked bar shows which marks are on; without this it would show the
    // state from whenever the editor was created.
    onSelectionUpdate: () => cardEditor.touch(),
    onTransaction: () => cardEditor.touch()
  })

  useEffect(() => {
    cardEditor.set(editor ?? null)
    return () => cardEditor.set(null)
  }, [editor])

  // Straight into writing, and at the end of what is already there.
  useEffect(() => {
    if (!editor) return
    editor.commands.focus('end')
  }, [editor])

  /*
   * The surface below listens for presses and treats them as the canvas. While
   * a card is being written in, a press belongs to the writing — including a
   * drag to select words, which would otherwise move the card out from under
   * the pointer.
   */
  return (
    <div
      className="mc-no-drag h-full w-full overflow-auto"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      aria-label={t('canvas.editCard')}
    >
      <EditorContent editor={editor} className="h-full" />
    </div>
  )
}
