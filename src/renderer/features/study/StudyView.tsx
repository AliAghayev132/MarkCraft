// ── @lib ───────────────────────────────────────────────────────────────────
import { Beaker, RotateCcw, X } from '@icons'
import { useEffect, useMemo, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  dueAt,
  dueNow,
  NEW_CARD,
  parseCards,
  schedule,
  type Card,
  type Grade,
  type StudyRecord
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { studyService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, EmptyState, IconButton } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { renderMarkdown } from '@features/editor/markdown'
import { keyOf } from './card-key'

// ── types ──────────────────────────────────────────────────────────────────
import type { StudyViewProps } from './types'

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy']

/**
 * A review session over the cards in the open document.
 *
 * Full-screen and one card at a time, because studying is the opposite of
 * editing: the value is in not seeing the answer, and a panel beside the
 * document would show it before the question was asked.
 */
export function StudyView({ open, onClose }: StudyViewProps): ReactElement | null {
  const t = useT()
  const document_ = useAppSelector(selectActiveDocument)
  const settings = useAppSelector((state) => state.settings.values.markdown)

  const [records, setRecords] = useState<Record<string, StudyRecord>>({})
  const [queue, setQueue] = useState<Card[]>([])
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [loading, setLoading] = useState(false)

  const cards = useMemo(() => parseCards(document_?.content ?? ''), [document_?.content])

  /*
   * The queue is built once when the session opens. Rebuilding it as cards are
   * graded would reshuffle the deck under the reviewer, and a card graded
   * "again" would jump back in front of them immediately rather than after the
   * others — which is the one thing the schedule is meant to prevent.
   */
  useEffect(() => {
    if (!open || !document_?.path) return

    let cancelled = false
    setLoading(true)

    void studyService
      .load(document_.path)
      .then((loaded) => {
        if (cancelled) return

        const now = Date.now()
        const withDue = cards.map((card) => ({
          card,
          due: loaded[keyOf(card)]?.due ?? 0
        }))

        setRecords(loaded)
        setQueue(dueNow(withDue, now).map((entry) => entry.card))
        setRevealed(false)
        setReviewed(0)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, document_?.path, cards])

  const current = queue[0]

  const grade = (given: Grade): void => {
    if (!current || !document_?.path) return

    const key = keyOf(current)
    const next = schedule(records[key] ?? NEW_CARD, given)
    const due = dueAt(next, Date.now())

    void studyService.save(document_.path, key, next, due)
    setRecords((at) => ({ ...at, [key]: { ...next, due } }))
    setReviewed((n) => n + 1)
    setRevealed(false)

    // "Again" means the card comes back at the end of this session, not never
    // and not immediately.
    setQueue((at) => (given === 'again' ? [...at.slice(1), current] : at.slice(1)))
  }

  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (!revealed) {
        // Space reveals; only then do the grades mean anything.
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          setRevealed(true)
        }
        return
      }

      const index = Number(event.key)
      if (index >= 1 && index <= 4) {
        event.preventDefault()
        grade(GRADES[index - 1])
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!open) return null

  const render = (markdown: string): ReactElement =>
    renderMarkdown(markdown, {
      baseDir: null,
      gfm: settings.gfm,
      highlight: settings.codeHighlighting
    }) as ReactElement

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('study.title')}
      className="fixed inset-0 z-palette flex flex-col bg-app"
    >
      <div className="mc-no-drag flex flex-none items-center justify-between border-b border-line px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Beaker size={15} className="text-ink-tertiary" />
          {t('study.title')}
        </span>

        <span className="text-xs tabular-nums text-ink-tertiary">
          {t('study.progress', { done: reviewed, left: queue.length })}
        </span>

        <span className="flex items-center gap-1">
          <IconButton
            icon={<RotateCcw size={15} />}
            label={t('study.reset')}
            onClick={() => {
              if (!document_?.path) return
              void studyService.reset(document_.path).then(() => {
                setRecords({})
                setQueue(cards)
                setRevealed(false)
                setReviewed(0)
              })
            }}
          />
          <IconButton icon={<X size={15} />} label={t('common.close')} onClick={onClose} />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
        {loading ? null : !document_?.path ? (
          <EmptyState icon={<Beaker size={22} />} title={t('study.needsSaving')} />
        ) : cards.length === 0 ? (
          <EmptyState
            icon={<Beaker size={22} />}
            title={t('study.noCards')}
            description={t('study.noCardsHint')}
          />
        ) : !current ? (
          <EmptyState
            icon={<Beaker size={22} />}
            title={t('study.done')}
            description={t('study.doneHint', { count: reviewed })}
          />
        ) : (
          <div className="flex w-full max-w-2xl flex-col items-center gap-6">
            <article className="mc-document w-full text-center">{render(current.front)}</article>

            {revealed ? (
              <>
                <hr className="w-16 border-line" />
                <article className="mc-document w-full text-center">{render(current.back)}</article>
              </>
            ) : null}
          </div>
        )}
      </div>

      {current && !loading ? (
        <div className="flex flex-none items-center justify-center gap-2 border-t border-line px-4 py-3">
          {revealed ? (
            GRADES.map((option, index) => (
              <Button
                key={option}
                variant={option === 'again' ? 'danger' : option === 'easy' ? 'primary' : 'secondary'}
                onClick={() => grade(option)}
              >
                {t(`study.grade.${option}`)}
                <span className="pl-1.5 text-2xs opacity-60">{index + 1}</span>
              </Button>
            ))
          ) : (
            <Button variant="primary" onClick={() => setRevealed(true)}>
              {t('study.reveal')}
              <span className="pl-1.5 text-2xs opacity-60">Space</span>
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
