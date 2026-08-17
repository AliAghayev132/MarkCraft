// ── @lib ───────────────────────────────────────────────────────────────────
import { AlertTriangle, Book, FileText } from '@icons'
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { readingOrder } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Divider, EmptyState, Modal, ModalActions, Spinner } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { chapterPath, loadBook, openBookAsDocument, SUMMARY_NAME, type Book as BookModel } from './book-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { BookDialogProps } from './types'

/**
 * The open folder, read as a book.
 *
 * Read on open rather than watched: a summary is edited rarely and by hand, and
 * a watcher would be machinery kept alive for a file that changes twice a week.
 */
export function BookDialog({ open, onClose, onOpenDocument }: BookDialogProps): ReactElement {
  const t = useT()
  const [book, setBook] = useState<BookModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return

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
  }, [open])

  const chapters = book?.chapters ?? []
  const files = readingOrder(chapters)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('book.title')}
      description={book ? t('book.summary', { count: files.length }) : undefined}
      icon={<Book size={17} />}
      size="md"
      footer={
        <ModalActions>
          <Button onClick={onClose}>{t('common.close')}</Button>
          <Button
            variant="primary"
            disabled={!book || files.length === 0 || busy}
            onClick={() => {
              if (!book) return
              setBusy(true)
              void openBookAsDocument(book)
                .then((done) => done && onClose())
                .finally(() => setBusy(false))
            }}
          >
            {t('book.openAsOne')}
          </Button>
        </ModalActions>
      }
    >
      {loading ? (
        <div className="flex h-[160px] items-center justify-center">
          <Spinner label={t('book.reading')} />
        </div>
      ) : !book ? (
        <EmptyState
          icon={<Book size={22} />}
          title={t('book.none')}
          description={t('book.noneHint', { name: SUMMARY_NAME })}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <ul className="m-0 flex max-h-[320px] list-none flex-col gap-0.5 overflow-y-auto p-0">
            {chapters.map((chapter) => {
              const absolute = chapterPath(book, chapter)
              const gone = chapter.path !== null && book.missing.includes(chapter.path)

              return (
                <li key={`${chapter.line}:${chapter.title}`} style={{ paddingLeft: chapter.depth * 16 }}>
                  {absolute === null ? (
                    // A part divider is a label, not somewhere to go.
                    <p className="m-0 px-1.5 py-1 text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
                      {chapter.title}
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={gone}
                      onClick={() => {
                        onOpenDocument(absolute)
                        onClose()
                      }}
                      className={cx(
                        'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm',
                        gone ? 'cursor-not-allowed text-ink-tertiary' : 'text-ink-secondary'
                      )}
                    >
                      {gone ? (
                        <AlertTriangle size={13} className="flex-none text-warning" />
                      ) : (
                        <FileText size={13} className="flex-none text-ink-tertiary" />
                      )}
                      {chapter.title}
                      {gone ? <span className="text-2xs">{t('book.missing')}</span> : null}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          {book.missing.length > 0 ? (
            <>
              <Divider />
              <p className="m-0 flex items-start gap-1.5 text-xs text-ink-secondary">
                <AlertTriangle size={12} className="mt-0.5 flex-none text-warning" />
                {t('book.missingCount', { count: book.missing.length })}
              </p>
            </>
          ) : null}
        </div>
      )}
    </Modal>
  )
}
