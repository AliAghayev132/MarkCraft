// ── @lib ───────────────────────────────────────────────────────────────────
import { CornerDownLeft, Search, X } from '@icons'
import { type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, Input } from '@ui'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasFindProps } from './types'

/**
 * Looking for a card.
 *
 * The matches are marked where they are rather than listed here. A card's
 * answer to "where is it" is *where it is*, and a list beside the canvas would
 * make somebody read the same names twice and then hunt for them anyway.
 *
 * Enter selects every match and brings them into view, which is the useful
 * thing to do with "the four cards that mention the budget" — stepping through
 * them one at a time is a document's idea of finding, not a canvas's.
 */
export function CanvasFind({
  query,
  count,
  onQuery,
  onClose,
  onGo
}: CanvasFindProps): ReactElement {
  const t = useT()

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
      <div
        onPointerDown={(event) => event.stopPropagation()}
        className="mc-no-drag pointer-events-auto flex items-center gap-1.5 rounded-lg border border-line bg-app px-2 py-1.5 shadow-lg"
      >
        <Search size={14} className="flex-none text-ink-tertiary" />

        <Input
          // The bar exists to be typed into.
          autoFocus
          value={query}
          size="sm"
          className="w-56"
          placeholder={t('canvas.findPlaceholder')}
          aria-label={t('canvas.findPlaceholder')}
          onChange={(event) => onQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            // The canvas below reads Delete and Escape as commands on cards;
            // while this is open they belong to the search.
            event.stopPropagation()

            if (event.key === 'Escape') {
              event.preventDefault()
              onClose()
              return
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              onGo()
            }
          }}
        />

        <span className="min-w-[3.5rem] px-1 text-xs tabular-nums text-ink-tertiary">
          {query.trim() === '' ? '' : t('canvas.findCount', { count })}
        </span>

        <IconButton
          icon={<CornerDownLeft size={14} />}
          label={t('canvas.findGo')}
          size="sm"
          disabled={count === 0}
          onClick={onGo}
        />
        <IconButton icon={<X size={14} />} label={t('common.close')} size="sm" onClick={onClose} />
      </div>
    </div>
  )
}
