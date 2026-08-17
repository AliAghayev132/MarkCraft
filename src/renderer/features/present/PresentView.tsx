// ── @lib ───────────────────────────────────────────────────────────────────
import { ChevronLeft, ChevronRight, X } from '@icons'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { splitSlides } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { renderMarkdown } from '@features/editor/markdown'

// ── types ──────────────────────────────────────────────────────────────────
import type { PresentViewProps } from './types'

/**
 * The document as a deck.
 *
 * Rendered through the same pipeline as the preview, so a slide looks like the
 * document does — a presentation mode with its own renderer would drift, and
 * the first time a table or a diagram came out differently the user would stop
 * trusting either one.
 */
export function PresentView({ open, onClose }: PresentViewProps): ReactElement | null {
  const t = useT()
  const document_ = useAppSelector(selectActiveDocument)
  const settings = useAppSelector((state) => state.settings.values.markdown)
  const [index, setIndex] = useState(0)
  const surface = useRef<HTMLDivElement>(null)

  const slides = useMemo(
    () => splitSlides(document_?.content ?? ''),
    [document_?.content]
  )

  // A slide can disappear while presenting if the document is edited behind the
  // overlay; landing past the end would show nothing at all.
  const current = Math.min(index, Math.max(0, slides.length - 1))

  const go = useCallback(
    (delta: number) => {
      setIndex((at) => Math.max(0, Math.min(slides.length - 1, at + delta)))
    },
    [slides.length]
  )

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent): void => {
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          event.preventDefault()
          go(1)
          break
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault()
          go(-1)
          break
        case 'Home':
          event.preventDefault()
          setIndex(0)
          break
        case 'End':
          event.preventDefault()
          setIndex(slides.length - 1)
          break
        case 'Escape':
          event.preventDefault()
          onClose()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, go, onClose, slides.length])

  // Starting where you left off after closing and reopening is surprising; a
  // deck is presented from the top.
  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  /*
   * F5 is pressed from inside the editor, and without this the caret stays
   * there behind the overlay: every key typed while presenting would be edited
   * into the document, and Escape would be swallowed by the editor rather than
   * leaving the deck. Focus has to come with the overlay.
   */
  useEffect(() => {
    if (!open) return

    const previous = document.activeElement
    surface.current?.focus()

    return () => {
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])

  if (!open) return null

  const slide = slides[current]

  return (
    <div
      ref={surface}
      role="dialog"
      aria-modal="true"
      aria-label={t('present.title')}
      tabIndex={-1}
      className="fixed inset-0 z-palette flex flex-col bg-app outline-none"
    >
      <div className="mc-no-drag flex flex-none items-center justify-between px-4 py-2">
        <span className="text-xs tabular-nums text-ink-tertiary">
          {slides.length === 0 ? '' : `${current + 1} / ${slides.length}`}
        </span>

        <span className="flex items-center gap-1">
          <IconButton
            icon={<ChevronLeft size={16} />}
            label={t('present.previous')}
            disabled={current === 0}
            onClick={() => go(-1)}
          />
          <IconButton
            icon={<ChevronRight size={16} />}
            label={t('present.next')}
            disabled={current >= slides.length - 1}
            onClick={() => go(1)}
          />
          <IconButton icon={<X size={16} />} label={t('common.close')} onClick={onClose} />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-12 pb-12">
        {slide ? (
          <article className="mc-document mc-slide w-full max-w-4xl">
            {renderMarkdown(slide.markdown, {
              baseDir: null,
              gfm: settings.gfm,
              highlight: settings.codeHighlighting
            })}
          </article>
        ) : (
          <p className="text-sm text-ink-tertiary">{t('present.empty')}</p>
        )}
      </div>
    </div>
  )
}
