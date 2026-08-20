// ── @lib ───────────────────────────────────────────────────────────────────
import { AlertTriangle, Flame, Sparkles, Target } from '@icons'
import { useEffect, useMemo, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, useAppDispatch, useAppSelector, wordGoalSet } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import {
  auditDocument,
  dayOf,
  fixMarkdown,
  goalProgress,
  lintMarkdown,
  recentDays,
  summarise,
  type DayRecord
} from '@shared'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Divider, Input, Modal, ModalActions } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { computeStats } from '@features/editor/markdown'
import { parseOutline } from '@features/outline'
import { cleanDocument } from './clean-document'
import { streakService } from '@services'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { StatsDialogProps } from './types'

/** Goals a writer actually sets, so the common case is one click. */
const PRESETS = [250, 500, 1000, 2000]

/**
 * What the status bar's word count is a summary of.
 *
 * Counted the same way — prose only, with fenced code, link targets and table
 * markup excluded — so the two can never disagree. Everything here is derived
 * on open rather than kept in the store: the dialog is not on screen while the
 * user types, so there is nothing to keep in step.
 */
export function StatsDialog({ open, onClose }: StatsDialogProps): ReactElement | null {
  const t = useT()
  const dispatch = useAppDispatch()
  const document_ = useAppSelector(selectActiveDocument)
  const dailyGoal = useAppSelector((state) => state.settings.values.writing.dailyGoal)

  const [draft, setDraft] = useState('')
  const [history, setHistory] = useState<DayRecord[]>([])
  const [today, setToday] = useState('')

  /* Read when the panel opens; the streak changes on save, not on keystroke. */
  useEffect(() => {
    if (!open) return
    let cancelled = false

    // The day is read here rather than during render: which day it is cannot
    // depend on when React happens to re-render the panel.
    setToday(dayOf(Date.now()))

    void streakService.load().then((days) => {
      if (!cancelled) setHistory(days)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const stats = useMemo(() => computeStats(document_?.content ?? ''), [document_?.content])
  const audit = useMemo(() => auditDocument(document_?.content ?? ''), [document_?.content])
  const lint = useMemo(() => lintMarkdown(document_?.content ?? ''), [document_?.content])
  const repairable = useMemo(() => fixMarkdown(document_?.content ?? ''), [document_?.content])
  const headings = useMemo(() => parseOutline(document_?.content ?? '').length, [document_?.content])

  if (!document_) return null

  const goal = document_.wordGoal
  const progress = goal && goal > 0 ? Math.min(1, stats.words / goal) : null
  const remaining = goal ? Math.max(0, goal - stats.words) : 0

  const setGoal = (value: number | null): void => {
    dispatch(wordGoalSet({ id: document_.id, goal: value }))
    setDraft('')
  }

  const rows: [string, string][] = [
    [t('stats.words'), format(stats.words)],
    [t('stats.characters'), format(stats.characters)],
    [t('stats.charactersNoSpaces'), format(stats.charactersNoSpaces)],
    [t('stats.sentences'), format(stats.sentences)],
    [t('stats.paragraphs'), format(stats.paragraphs)],
    [t('stats.headings'), format(headings)],
    [t('stats.lines'), format(stats.lines)],
    [t('stats.readingTime'), t('stats.minutes', { count: Math.max(1, Math.round(stats.readingTimeMinutes)) })],
    [t('stats.links'), format(audit.links.filter((link) => !link.image).length)],
    [t('stats.images'), format(audit.images)],
    [t('stats.codeBlocks'), format(audit.codeBlocks)],
    [
      t('stats.tasks'),
      audit.tasks.total === 0
        ? format(0)
        : t('stats.tasksDone', { done: audit.tasks.done, total: audit.tasks.total })
    ]
  ]

  /*
   * Only what is actually actionable. A list that also reported every external
   * link as "unverified" would bury the two anchors that really are broken.
   */
  const problems: string[] = [
    ...audit.danglingAnchors.map((link) =>
      t('stats.danglingAnchor', { target: link.target, line: link.line })
    ),
    ...audit.duplicateHeadings.map((slug) => t('stats.duplicateHeading', { slug })),
    ...lint.map((problem) =>
      t('lint.line', {
        line: problem.line,
        rule: problem.rule,
        message: t(`lint.rules.${problem.rule}`, problem.values)
      })
    )
  ]

  const streak = summarise(history, today)
  const dayGoal = goalProgress(history, today, dailyGoal)
  const written = new Map(history.map((day) => [day.day, day.words]))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('stats.title')}
      description={document_.title}
      icon={<Target size={17} />}
      size="md"
      footer={
        <ModalActions>
          <Button variant="primary" data-autofocus onClick={onClose}>
            {t('common.done')}
          </Button>
        </ModalActions>
      }
    >
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-tertiary">{label}</dt>
            <dd className="m-0 font-medium tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <Divider />

      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-2xs font-semibold tracking-wider text-ink-tertiary uppercase">
            {t('stats.problems')}
          </h3>

          {/* Offered only when there is something it can actually repair —
              a button that reports "nothing to do" was never worth pressing. */}
          {repairable.clean ? null : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                cleanDocument()
                onClose()
              }}
            >
              <Sparkles size={13} />
              {t('clean.action')}
            </Button>
          )}
        </div>

        {problems.length === 0 ? (
          <p className="text-xs text-success">{t('stats.noProblems')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {problems.map((problem) => (
              <li key={problem} className="flex items-start gap-1.5 text-xs text-ink-secondary">
                <AlertTriangle size={12} className="mt-0.5 flex-none text-warning" />
                {problem}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Divider />

      {/* ── Writing streak ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {t('streak.title')}
        </h3>

        {/*
          * Today against the goal, if there is one. Beside the streak rather
          * than in the status bar, which already carries a goal for the open
          * document — two bars in one corner meaning different things is worse
          * than one bar somewhere sensible.
          */}
        {dayGoal.goal > 0 ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-1.5 text-ink">
                <Target
                  size={14}
                  className={dayGoal.met ? 'text-success' : 'text-ink-tertiary'}
                />
                {t('streak.goalToday', { words: dayGoal.written, goal: dayGoal.goal })}
              </span>
              {dayGoal.met ? (
                <span className="text-xs text-success">{t('streak.goalMet')}</span>
              ) : null}
            </div>

            <span className="h-1.5 w-full overflow-hidden rounded-full bg-active">
              <span
                style={{ width: `${dayGoal.fraction * 100}%` }}
                className={cx(
                  'block h-full rounded-full transition-[width] duration-300',
                  dayGoal.met ? 'bg-success' : 'bg-accent'
                )}
              />
            </span>
          </div>
        ) : null}

        <div className="flex items-baseline justify-between text-sm">
          <span className="flex items-center gap-1.5 text-ink">
            <Flame size={14} className={streak.current > 0 ? 'text-warning' : 'text-ink-tertiary'} />
            {t('streak.current', { count: streak.current })}
          </span>
          <span className="text-xs tabular-nums text-ink-tertiary">
            {t('streak.longest', { count: streak.longest })} · {t('streak.days', { count: streak.total })}
          </span>
        </div>

        {/* Four weeks, one square a day — enough to see a habit, short enough
            to stay a detail rather than a dashboard. */}
        <div className="flex flex-wrap gap-[3px]">
          {recentDays(today, 28).map((day) => {
            const words = written.get(day) ?? 0
            return (
              <span
                key={day}
                title={t('streak.dayTooltip', { day, count: words })}
                className={cx(
                  'size-3 rounded-[2px]',
                  words === 0
                    ? 'bg-active'
                    : words < 100
                      ? 'bg-accent/30'
                      : words < 500
                        ? 'bg-accent/60'
                        : 'bg-accent'
                )}
              />
            )
          })}
        </div>
      </section>

      <Divider />

      <section className="flex flex-col gap-2">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {t('stats.goalTitle')}
        </h3>

        {goal ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink">
                {t('stats.goalProgress', { words: format(stats.words), goal: format(goal) })}
              </span>
              <span
                className={cx(
                  'text-xs font-medium tabular-nums',
                  remaining === 0 ? 'text-success' : 'text-ink-tertiary'
                )}
              >
                {remaining === 0
                  ? t('stats.goalReached')
                  : t('stats.goalRemaining', { count: remaining })}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-active">
              <div
                className={cx(
                  'h-full rounded-full transition-[width] duration-300',
                  remaining === 0 ? 'bg-success' : 'bg-accent'
                )}
                style={{ width: `${(progress ?? 0) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-ink-tertiary">{t('stats.goalHint')}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={goal === preset ? 'subtle' : 'secondary'}
              onClick={() => setGoal(preset)}
            >
              {format(preset)}
            </Button>
          ))}

          <Input
            size="sm"
            type="number"
            min={1}
            value={draft}
            placeholder={t('stats.goalCustom')}
            className="w-[110px]"
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              const parsed = Number(draft)
              if (Number.isFinite(parsed) && parsed > 0) setGoal(Math.round(parsed))
            }}
            aria-label={t('stats.goalCustom')}
          />

          {goal ? (
            <Button size="sm" variant="ghost" onClick={() => setGoal(null)}>
              {t('stats.goalClear')}
            </Button>
          ) : null}
        </div>
      </section>
    </Modal>
  )
}

function format(value: number): string {
  return new Intl.NumberFormat().format(value)
}
