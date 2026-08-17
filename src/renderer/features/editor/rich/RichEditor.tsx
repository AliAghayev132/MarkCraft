// ── @lib ───────────────────────────────────────────────────────────────────
import {
  CodeBlockLowlight,
  EditorContent,
  Image,
  Placeholder,
  StarterKit,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TaskItem,
  TaskList,
  useEditor
} from '@lib/editor/tiptap'
import { AlertTriangle } from '@icons'
import { lowlight } from '@lib/markdown/highlight'
import { useEffect, useMemo, useRef, useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { RICH_EDITOR_WARN_BYTES } from '@shared'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useDebouncedCallback } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'
import {
  findLossyConstructs,
  markdownToRichHtml,
  richHtmlToMarkdown
} from './bridge'

// ── types ──────────────────────────────────────────────────────────────────
import type { RichEditorProps } from './types'

/** How long the user must pause before edits are serialised back to Markdown. */
const SERIALIZE_DEBOUNCE_MS = 260

/**
 * The WYSIWYG surface.
 *
 * Follows the driver/follower rule from ARCHITECTURE.md: while the user is
 * typing here, this editor is the driver and the Markdown string follows on a
 * debounce. Incoming `value` changes are applied only when they did not
 * originate from this editor, which is what stops the two from echoing each
 * other into an edit loop.
 */
export function RichEditor({
  documentId,
  value,
  settings,
  editable = true,
  onChange,
  onSave
}: RichEditorProps): React.ReactElement {
  const lastEmitted = useRef<string>(value)
  const applyingExternal = useRef(false)
  const [confirmedLarge, setConfirmedLarge] = useState(false)

  const isLarge = value.length > RICH_EDITOR_WARN_BYTES
  const lossy = useMemo(() => findLossyConstructs(value), [value])

  const pushMarkdown = useDebouncedCallback((html: string) => {
    const markdown = richHtmlToMarkdown(html, settings.markdown)
    lastEmitted.current = markdown
    onChange(markdown)
  }, SERIALIZE_DEBOUNCE_MS)

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // Replaced by the lowlight-backed version so fences highlight here the
        // same way they do in the preview.
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: settings.markdown.linkifyBareUrls,
          HTMLAttributes: { rel: 'noopener noreferrer' }
        }
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
      Image.configure({ inline: false, allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Start writing…' })
    ],
    [settings.markdown.linkifyBareUrls]
  )

  const editor = useEditor(
    {
      extensions,
      editable,
      content: markdownToRichHtml(value, settings.markdown),
      editorProps: {
        attributes: {
          class: 'mc-document',
          spellcheck: String(settings.editor.spellCheck)
        },
        handleKeyDown: (_view, event) => {
          if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
            event.preventDefault()
            onSave?.()
            return true
          }
          return false
        }
      },
      onUpdate: ({ editor: instance }) => {
        if (applyingExternal.current) return
        pushMarkdown(instance.getHTML())
      },
      onFocus: () => editorRegistry.setSurface('rich')
    },
    // Rebuilding on document switch is correct here: ProseMirror history is
    // per-document, and carrying it across documents would let undo reach into
    // a file the user is no longer editing.
    [documentId]
  )

  /* Tiptap reads `editable` once when it is created, so a document locked
     while it is open has to be told. */
  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    editorRegistry.setRichEditor(editor ?? null)
    return () => editorRegistry.setRichEditor(null)
  }, [editor])

  /* External content changes (revert, reload, an edit made in source view). */
  useEffect(() => {
    if (!editor) return
    if (value === lastEmitted.current) return

    applyingExternal.current = true
    editor.commands.setContent(markdownToRichHtml(value, settings.markdown), {
      emitUpdate: false
    })
    lastEmitted.current = value
    // Released after the transaction has been applied.
    requestAnimationFrame(() => {
      applyingExternal.current = false
    })
  }, [value, editor, settings.markdown])

  /* Flush any pending serialisation before unmounting or switching away. */
  useEffect(
    () => () => {
      pushMarkdown.cancel()
    },
    [pushMarkdown]
  )

  if (isLarge && !confirmedLarge) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center bg-surface p-6">
        <div className="flex max-w-[460px] flex-col items-start gap-3 rounded-xl border border-line bg-raised p-6 shadow-sm">
          <div className="grid size-[38px] place-items-center rounded-lg bg-warning-bg text-warning">
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-md font-semibold">This is a large document</h2>
          <p className="text-base leading-relaxed text-ink-secondary">
            The rich editor renders the entire document at once, so it may feel sluggish at{' '}
            {Math.round(value.length / 1024)} KB. The Markdown source view renders only what is on
            screen and stays fast at any size.
          </p>
          <div className="mt-1 flex gap-2">
            <Button variant="primary" onClick={() => setConfirmedLarge(true)}>
              Open in rich editor anyway
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
      {lossy.length > 0 ? (
        <div className="flex flex-none items-center gap-2 border-b border-line-subtle bg-warning-bg px-4 py-1.5 text-xs leading-normal text-warning" role="status">
          <AlertTriangle size={13} />
          <span>
            This document contains {lossy.join(', ')}. The rich editor preserves{' '}
            {lossy.length === 1 ? 'it' : 'them'} as inline HTML — edit in{' '}
            <strong>Markdown source</strong> for full control.
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  )
}
