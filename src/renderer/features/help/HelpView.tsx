// ── @lib ───────────────────────────────────────────────────────────────────
import { LifeBuoy, X } from '@icons'
import { useEffect, useMemo, useRef, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT, useTranslation } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, SearchInput } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { renderMarkdown } from '@features/editor/markdown'
import { guideFor } from './guides'

// ── types ──────────────────────────────────────────────────────────────────
import type { HelpViewProps } from './types'

/**
 * The guide.
 *
 * Written as Markdown and rendered through the application's own pipeline, so
 * the help page is drawn by the very renderer it documents — a callout or a
 * table that comes out wrong here is a bug the reader can see for themselves.
 *
 * Full-screen rather than a panel: this is read, not consulted while typing,
 * and a narrow column would make its tables unreadable.
 */
export function HelpView({ open, onClose }: HelpViewProps): ReactElement | null {
  const t = useT()
  const { language } = useTranslation()
  const settings = useAppSelector((state) => state.settings.values.markdown)

  const [active, setActive] = useState('start')
  const [query, setQuery] = useState('')
  const surface = useRef<HTMLDivElement>(null)
  const article = useRef<HTMLDivElement>(null)

  const guide = useMemo(() => guideFor(language), [language])

  /*
   * Searched over the text, not only the titles: someone looking for "WebP" or
   * "SUMMARY.md" is looking for a sentence, and a title-only search would tell
   * them the guide does not mention it.
   */
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle === '') return guide

    return guide.filter(
      (section) =>
        section.title.toLowerCase().includes(needle) ||
        section.markdown.toLowerCase().includes(needle)
    )
  }, [guide, query])

  const current = matches.find((section) => section.id === active) ?? matches[0] ?? null

  const rendered = useMemo(
    () =>
      current
        ? renderMarkdown(current.markdown, {
            baseDir: null,
            gfm: settings.gfm,
            highlight: settings.codeHighlighting
          })
        : null,
    [current, settings.gfm, settings.codeHighlighting]
  )

  // A new section starts at its own beginning, not where the last one was read to.
  useEffect(() => {
    article.current?.scrollTo({ top: 0 })
  }, [current?.id])

  useEffect(() => {
    if (!open) return

    const previous = document.activeElement
    surface.current?.focus()

    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={surface}
      role="dialog"
      aria-modal="true"
      aria-label={t('help.title')}
      tabIndex={-1}
      className="fixed inset-0 z-palette flex flex-col bg-app outline-none"
    >
      <div className="mc-no-drag flex flex-none items-center justify-between gap-3 border-b border-line px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <LifeBuoy size={15} className="text-ink-tertiary" />
          {t('help.title')}
        </span>

        <IconButton icon={<X size={15} />} label={t('common.close')} onClick={onClose} />
      </div>

      <div className="flex min-h-0 flex-1">
        <nav
          className="flex w-[220px] flex-none flex-col gap-2 border-r border-line bg-sunken p-3"
          aria-label={t('help.contents')}
        >
          <SearchInput
            value={query}
            placeholder={t('help.search')}
            aria-label={t('help.search')}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />

          <ul className="m-0 flex list-none flex-col gap-0.5 overflow-y-auto p-0">
            {matches.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  aria-current={section.id === current?.id}
                  onClick={() => setActive(section.id)}
                  className={cx(
                    'w-full rounded-md px-2 py-1.5 text-left text-sm',
                    section.id === current?.id
                      ? 'bg-active font-medium text-ink'
                      : 'text-ink-secondary'
                  )}
                >
                  {section.title}
                </button>
              </li>
            ))}

            {matches.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-ink-tertiary">{t('help.noMatch')}</li>
            ) : null}
          </ul>
        </nav>

        <div ref={article} className="min-w-0 flex-1 overflow-auto px-8 py-6">
          <article className="mc-document mx-auto max-w-3xl">{rendered}</article>
        </div>
      </div>
    </div>
  )
}
