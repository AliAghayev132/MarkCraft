// ── @lib ───────────────────────────────────────────────────────────────────
import { Bold, Code, Italic, Link2, List, ListOrdered, Quote, Strikethrough } from '@icons'
import { useSyncExternalStore, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { cardEditor } from './card-editor-store'

const LEVELS = [1, 2, 3] as const

/**
 * Formatting, while a card is being written in.
 *
 * The buttons drive the editor rather than rewriting Markdown behind it. The
 * card is a live surface now, and text operations on a string it no longer
 * holds would put the caret somewhere the person was not.
 *
 * Docked to the canvas rather than floating over the card. Above a card near
 * the top of the window a floating bar sat under the header, where a click
 * reached the header, took focus, and closed the editor before the button it
 * was on could run.
 */
export function CardFormatBar(): ReactElement | null {
  const t = useT()

  // The revision, not the instance: the instance is mutable and keeps its
  // identity, so it would never tell React the selection had moved.
  useSyncExternalStore(
    (listener) => cardEditor.subscribe(listener),
    () => cardEditor.version()
  )

  const editor = cardEditor.get()
  if (!editor) return null

  const level = LEVELS.find((heading) => editor.isActive('heading', { level: heading })) ?? 0

  return (
    <div
      /*
       * Focus moves on `mousedown`, and preventing the default there is the one
       * way to keep it in the editor — a bar that takes focus from what it
       * formats loses the selection it was about to act on. Propagation is
       * stopped separately, because the canvas below reads a press as a click
       * on empty space and would clear the selection.
       */
      onMouseDown={(event) => event.preventDefault()}
      onPointerDown={(event) => event.stopPropagation()}
      className="mc-no-drag pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line bg-app px-1 py-1 shadow-lg"
    >
      {LEVELS.map((heading) => (
        <button
          key={heading}
          type="button"
          aria-pressed={level === heading}
          aria-label={t(`toolbar.heading${heading}`)}
          title={t(`toolbar.heading${heading}`)}
          onClick={() => editor.chain().focus().toggleHeading({ level: heading }).run()}
          className={cx(
            'rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums',
            'focus-visible:shadow-focus focus-visible:outline-none',
            level === heading ? 'bg-active text-ink' : 'text-ink-secondary hover:bg-hover'
          )}
        >
          H{heading}
        </button>
      ))}

      <button
        type="button"
        aria-pressed={level === 0}
        aria-label={t('canvas.paragraph')}
        title={t('canvas.paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={cx(
          'rounded px-1.5 py-0.5 text-xs',
          'focus-visible:shadow-focus focus-visible:outline-none',
          level === 0 ? 'bg-active text-ink' : 'text-ink-secondary hover:bg-hover'
        )}
      >
        {t('canvas.paragraphShort')}
      </button>

      <span className="mx-0.5 h-4 w-px bg-line-subtle" role="presentation" />

      <IconButton
        icon={<Bold size={14} />}
        label={t('toolbar.bold')}
        size="sm"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <IconButton
        icon={<Italic size={14} />}
        label={t('toolbar.italic')}
        size="sm"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <IconButton
        icon={<Strikethrough size={14} />}
        label={t('toolbar.strikethrough')}
        size="sm"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <IconButton
        icon={<Code size={14} />}
        label={t('toolbar.inlineCode')}
        size="sm"
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <IconButton
        icon={<Link2 size={14} />}
        label={t('toolbar.insertLink')}
        size="sm"
        active={editor.isActive('link')}
        onClick={() => {
          // Off again if it is already a link; otherwise the address is typed
          // into the card, where the link is, rather than into a dialog that
          // covers the thing it is being added to.
          if (editor.isActive('link')) editor.chain().focus().unsetLink().run()
          else editor.chain().focus().setLink({ href: '' }).run()
        }}
      />

      <span className="mx-0.5 h-4 w-px bg-line-subtle" role="presentation" />

      <IconButton
        icon={<List size={14} />}
        label={t('toolbar.bulletList')}
        size="sm"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <IconButton
        icon={<ListOrdered size={14} />}
        label={t('toolbar.numberedList')}
        size="sm"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <IconButton
        icon={<Quote size={14} />}
        label={t('toolbar.blockquote')}
        size="sm"
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
    </div>
  )
}
