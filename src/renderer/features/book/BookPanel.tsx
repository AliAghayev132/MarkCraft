// ── @lib ───────────────────────────────────────────────────────────────────
import { AlertTriangle, Book, ChevronLeft, ChevronRight, FileText, Layers } from '@icons'
import { useCallback, useEffect, useMemo, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { chapterPosition, summaryBase, type Chapter } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { EmptyState, IconButton, Spinner } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── ./book ─────────────────────────────────────────────────────────────────
import {
  chapterPath,
  loadBook,
  openBookAsDocument,
  SUMMARY_NAME,
  type Book as BookModel
} from './book-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { BookPanelProps } from './types'

/** Indent per level, capped so a deeply nested book stays readable. */
const INDENT = ['pl-2', 'pl-5', 'pl-8', 'pl-11', 'pl-14'] as const

/**
 * The book's table of contents, in the sidebar.
 *
 * The dialog answers "what is in this book"; this answers "where am I in it",
 * which is the question you have while reading rather than before you start.
 * Without it, moving from one chapter to the next meant finding the next file
 * in the explorer — where the order is alphabetical and the book's order is
 * whatever the summary says.
 */
export function BookPanel({ onOpenDocument }: BookPanelProps): ReactElement {
  const t = useT()

  const root = useAppSelector((state) => state.workspace.root)
  const activePath = useAppSelector((state) => selectActiveDocument(state)?.path ?? null)

  const [book, setBook] = useState<BookModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  /*
   * Re-read when the folder changes, and when the open document does. The
   * second is what keeps the list honest while a book is being written: saving
   * a new chapter into `SUMMARY.md` shows it here without a reload, and the
   * read is one small file.
   */
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    void loadBook()
      .then((result) => {
        if (!cancelled) setBook(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [root, activePath])

  const relative = useMemo(() => {
    if (!book || activePath === null) return null

    const base = summaryBase(book.path)
    const lower = activePath.toLowerCase()
    return lower.startsWith(base.toLowerCase()) ? activePath.slice(base.length + 1) : null
  }, [book, activePath])

  const position = useMemo(
    () => chapterPosition(book?.chapters ?? [], relative, book?.missing ?? []),
    [book, relative]
  )

  const open = useCallback(
    (chapter: Chapter | null): void => {
      if (!book || !chapter) return
      const path = chapterPath(book, chapter)
      if (path) onOpenDocument(path)
    },
    [book, onOpenDocument]
  )

  if (loading && !book) {
    return (
      <div className="flex h-[120px] items-center justify-center">
        <Spinner label={t('book.reading')} />
      </div>
    )
  }

  if (!book) {
    return (
      <EmptyState
        icon={<Book size={22} />}
        title={t('book.none')}
        description={t('book.noneHint', { name: SUMMARY_NAME })}
      />
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-[30px] flex-none items-center gap-1 pl-3 pr-1.5">
        <span className="min-w-0 flex-1 truncate text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {t('book.title')}
        </span>
        {position.index > 0 ? (
          <span className="flex-none text-2xs tabular-nums text-ink-tertiary">
            {position.index}/{position.total}
          </span>
        ) : null}
        <IconButton
          icon={<Layers size={13} />}
          label={t('book.openAsOne')}
          size="sm"
          disabled={busy || position.total === 0}
          onClick={() => {
            setBusy(true)
            void openBookAsDocument(book).finally(() => setBusy(false))
          }}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <ul className="flex flex-col gap-px px-1" role="tree" aria-label={t('book.title')}>
          {book.chapters.map((chapter) => {
            const path = chapterPath(book, chapter)
            const gone = chapter.path !== null && book.missing.includes(chapter.path)
            const current =
              relative !== null &&
              chapter.path !== null &&
              chapter.path.replace(/\\/g, '/').toLowerCase() ===
                relative.replace(/\\/g, '/').toLowerCase()

            if (path === null) {
              // A part divider is a label, not somewhere to go.
              return (
                <li
                  key={`${chapter.line}:${chapter.title}`}
                  role="none"
                  className={cx(
                    'px-2 pb-0.5 pt-2 text-2xs font-semibold uppercase tracking-wider text-ink-tertiary',
                    INDENT[chapter.depth] ?? 'pl-14'
                  )}
                >
                  {chapter.title}
                </li>
              )
            }

            return (
              <li key={`${chapter.line}:${chapter.title}`} role="treeitem" aria-level={chapter.depth + 1}>
                <button
                  type="button"
                  disabled={gone}
                  title={chapter.path ?? chapter.title}
                  aria-current={current ? 'true' : undefined}
                  className={cx(
                    'flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-sm transition-colors',
                    'focus-visible:shadow-focus focus-visible:outline-none',
                    INDENT[chapter.depth] ?? 'pl-14',
                    gone
                      ? 'cursor-not-allowed text-ink-tertiary'
                      : current
                        ? 'bg-selected font-medium text-accent'
                        : 'text-ink-secondary hover:bg-hover hover:text-ink'
                  )}
                  onClick={() => open(chapter)}
                >
                  {gone ? (
                    <AlertTriangle size={13} className="flex-none text-warning" />
                  ) : (
                    <FileText size={13} className="flex-none text-ink-tertiary" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{chapter.title}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Where the reading actually happens: the next chapter is one click, not
          a hunt through a file tree sorted a different way. */}
      <footer className="flex flex-none items-center gap-1 border-t border-line-subtle px-2 py-1.5">
        <IconButton
          icon={<ChevronLeft size={15} />}
          label={t('book.previous')}
          size="sm"
          disabled={!position.previous}
          onClick={() => open(position.previous)}
        />
        <span className="min-w-0 flex-1 truncate text-center text-2xs text-ink-tertiary">
          {position.index > 0 ? (position.next?.title ?? t('book.last')) : t('book.notInBook')}
        </span>
        <IconButton
          icon={<ChevronRight size={15} />}
          label={t('book.next')}
          size="sm"
          disabled={!position.next}
          onClick={() => open(position.next)}
        />
      </footer>
    </div>
  )
}
