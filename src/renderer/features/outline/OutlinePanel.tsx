// ── @lib ───────────────────────────────────────────────────────────────────
import { useMemo, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { EmptyState, SearchInput } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { activeHeading, filterOutline, parseOutline } from './outline'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { OutlinePanelProps } from './types'

/** Indent per heading level, capped so a deep document stays readable. */
const INDENT = ['pl-2', 'pl-2', 'pl-5', 'pl-8', 'pl-11', 'pl-14', 'pl-14'] as const

/**
 * The document's table of contents.
 *
 * Derived from the Markdown text, so it is the same list in every view mode and
 * costs nothing to keep in step — there is no second structure to invalidate.
 * On a long document this is the fastest way to move, which is precisely when a
 * file tree and a search box are not enough.
 */
export function OutlinePanel({ onRevealLine }: OutlinePanelProps): ReactElement {
  const t = useT()

  const content = useAppSelector((state) => selectActiveDocument(state)?.content ?? null)
  const cursorLine = useAppSelector((state) => selectActiveDocument(state)?.cursor?.line ?? 1)

  const [query, setQuery] = useState('')

  const headings = useMemo(() => parseOutline(content ?? ''), [content])
  const visible = useMemo(() => filterOutline(headings, query), [headings, query])
  const current = useMemo(() => activeHeading(headings, cursorLine), [headings, cursorLine])

  if (content === null) {
    return <EmptyState title={t('outline.noDocument')} description={t('outline.noDocumentHint')} />
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-[30px] flex-none items-center px-3">
        <span className="min-w-0 flex-1 truncate text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {t('outline.title')}
        </span>
        {headings.length > 0 ? (
          <span className="flex-none text-2xs text-ink-tertiary">{headings.length}</span>
        ) : null}
      </header>

      {headings.length > 3 ? (
        <div className="flex-none px-2 pb-1.5">
          <SearchInput
            size="sm"
            placeholder={t('outline.filter')}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onClear={() => setQuery('')}
            aria-label={t('outline.filter')}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {headings.length === 0 ? (
          <EmptyState title={t('outline.empty')} description={t('outline.emptyHint')} />
        ) : visible.length === 0 ? (
          <EmptyState title={t('outline.noMatches', { query: query.trim() })} />
        ) : (
          <ul className="flex flex-col gap-px px-1" role="tree" aria-label={t('outline.title')}>
            {visible.map((heading) => {
              const isCurrent = current?.line === heading.line

              return (
                <li key={`${heading.line}:${heading.text}`} role="treeitem" aria-level={heading.level}>
                  <button
                    type="button"
                    aria-current={isCurrent ? 'true' : undefined}
                    title={heading.text}
                    className={cx(
                      'flex w-full items-baseline gap-2 rounded-md py-1 pr-2 text-left transition-colors',
                      'focus-visible:shadow-focus focus-visible:outline-none',
                      INDENT[heading.level] ?? 'pl-14',
                      isCurrent
                        ? 'bg-selected font-medium text-accent'
                        : 'text-ink-secondary hover:bg-hover hover:text-ink',
                      // Depth is carried by weight as well as indent, so the
                      // shape of the document reads at a glance.
                      heading.level === 1 && 'font-semibold',
                      heading.level >= 4 && 'text-xs'
                    )}
                    onClick={() => onRevealLine(heading.line)}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{heading.text}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
