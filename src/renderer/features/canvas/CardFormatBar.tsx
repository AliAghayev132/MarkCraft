// ── @lib ───────────────────────────────────────────────────────────────────
import { Bold, Code, Italic, Link2, List, ListOrdered, Quote } from '@icons'
import { type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  headingLevelAt,
  insertLink,
  setHeading,
  toggleLinePrefix,
  toggleWrap,
  type TextDocument
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { CardFormatBarProps } from './types'

const LEVELS = [1, 2, 3] as const

/**
 * Markdown, while a card is being written in.
 *
 * A card holds the same Markdown a document does — it is rendered by the same
 * pipeline — and until now the only way to get a heading into one was to know
 * that `#` makes headings. The buttons do not add anything the text could not
 * already say; they say what it can.
 *
 * Docked to the surface rather than floating over the card. Above a card near
 * the top of the canvas a floating bar sat under the window's own header, where
 * a click reached the header instead — which took focus, committed the edit and
 * closed the editor before the button could run.
 */
export function CardFormatBar({ draft, onApply }: CardFormatBarProps): ReactElement {
  const t = useT()

  const document: TextDocument = { text: draft.text, from: draft.from, to: draft.to }
  const level = headingLevelAt(document)

  return (
    <div
      /*
       * Two different problems, and they need two different events.
       *
       * Focus moves on `mousedown`, and that is the only place preventing the
       * default keeps it where it is — a bar that steals focus from the field
       * it formats blurs it, which commits the edit and closes the editor
       * before the button has run.
       *
       * Propagation is stopped separately, because the canvas surface below
       * reads a press as a click on empty space and would clear the selection.
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
          onClick={() => onApply(setHeading(document, heading))}
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
        onClick={() => onApply(setHeading(document, 0))}
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
        onClick={() => onApply(toggleWrap(document, '**'))}
      />
      <IconButton
        icon={<Italic size={14} />}
        label={t('toolbar.italic')}
        size="sm"
        onClick={() => onApply(toggleWrap(document, '*'))}
      />
      <IconButton
        icon={<Code size={14} />}
        label={t('toolbar.inlineCode')}
        size="sm"
        onClick={() => onApply(toggleWrap(document, '`'))}
      />
      <IconButton
        icon={<Link2 size={14} />}
        label={t('toolbar.insertLink')}
        size="sm"
        onClick={() => onApply(insertLink(document))}
      />

      <span className="mx-0.5 h-4 w-px bg-line-subtle" role="presentation" />

      <IconButton
        icon={<List size={14} />}
        label={t('toolbar.bulletList')}
        size="sm"
        onClick={() => onApply(toggleLinePrefix(document, '- ', /^[-*+][ \t]+/))}
      />
      <IconButton
        icon={<ListOrdered size={14} />}
        label={t('toolbar.numberedList')}
        size="sm"
        onClick={() => onApply(toggleLinePrefix(document, '1. ', /^\d+[.)][ \t]+/))}
      />
      <IconButton
        icon={<Quote size={14} />}
        label={t('toolbar.blockquote')}
        size="sm"
        onClick={() => onApply(toggleLinePrefix(document, '> ', /^>[ \t]?/))}
      />
    </div>
  )
}
