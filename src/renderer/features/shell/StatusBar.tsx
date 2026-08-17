// ── @lib ───────────────────────────────────────────────────────────────────
import { Columns2, Eye, FileText, Lock, PenLine } from '@icons'
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { formatNumber, formatReadingTime } from '@shared'
import type { ViewMode } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Segmented, Tooltip } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { EMPTY_STATS, createStatsScheduler } from '@features/editor/markdown'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentStats } from '@features/editor/markdown'
import type { StatusBarProps } from './types'

const ITEM =
  'h-[18px] rounded-xs px-1.5 text-2xs tabular-nums whitespace-nowrap text-ink-tertiary transition-colors'

/**
 * Shows only what a writer acts on: where the caret is, how much they have
 * written, and how the file will be saved. Everything here is a live
 * measurement or a control — nothing is decoration.
 */
export function StatusBar({
  document,
  selectionLength,
  onViewModeChange,
  onStatsClick,
  extra
}: StatusBarProps): ReactElement {
  const t = useT()
  const [stats, setStats] = useState<DocumentStats>(EMPTY_STATS)

  const viewModes: { value: ViewMode; icon: ReactElement; ariaLabel: string }[] = [
    { value: 'rich', icon: <PenLine size={13} />, ariaLabel: t('status.modes.rich') },
    { value: 'source', icon: <FileText size={13} />, ariaLabel: t('status.modes.source') },
    { value: 'split', icon: <Columns2 size={13} />, ariaLabel: t('status.modes.split') },
    { value: 'preview', icon: <Eye size={13} />, ariaLabel: t('status.modes.preview') }
  ]

  // Counting words is the most expensive thing this bar does, so it runs on an
  // idle callback behind a debounce rather than on every keystroke.
  useEffect(() => {
    const scheduler = createStatsScheduler(setStats)
    if (document) scheduler.schedule(document.content)
    else setStats(EMPTY_STATS)
    return scheduler.dispose
  }, [document?.content, document])

  const shell =
    'flex h-statusbar flex-none items-center justify-between gap-4 overflow-hidden border-t border-line-subtle bg-app pr-2 pl-3 text-2xs text-ink-tertiary'

  if (!document) {
    return (
      <footer className={shell}>
        <div className="flex min-w-0 items-center gap-1">
          <span className="px-1.5 italic">{t('status.noDocument')}</span>
        </div>
        <div className="flex flex-none items-center gap-1">{extra}</div>
      </footer>
    )
  }

  return (
    <footer className={shell}>
      <div className="flex min-w-0 items-center gap-1">
        <Tooltip content={t('status.cursorPosition')} placement="top-start">
          <button type="button" className={cx(ITEM, 'hover:bg-hover hover:text-ink-secondary')}>
            {t('status.lineColumn', {
              line: document.cursor.line,
              column: document.cursor.column
            })}
          </button>
        </Tooltip>

        {/* A locked document says so where the user already looks for the
            document's state, rather than only failing when they try to type. */}
        {document.locked ? (
          <span className={cx(ITEM, 'flex items-center gap-1 text-warning')} title={t('lock.locked')}>
            <Lock size={12} />
            {t('lock.lockedShort')}
          </span>
        ) : null}

        {selectionLength > 0 ? (
          <span className={cx(ITEM, 'text-accent')}>
            {t('status.selected', { count: selectionLength })}
          </span>
        ) : null}

        <Tooltip
          content={t('status.statsTooltip', {
            characters: formatNumber(stats.characters),
            withoutSpaces: formatNumber(stats.charactersNoSpaces),
            paragraphs: formatNumber(stats.paragraphs)
          })}
          placement="top-start"
        >
          <button
            type="button"
            className={cx(ITEM, 'hover:bg-hover hover:text-ink-secondary')}
            onClick={onStatsClick}
          >
            {document.wordGoal ? (
              <span className="flex items-center gap-1.5">
                <span className="tabular-nums">
                  {t('status.goal', {
                    words: stats.words,
                    goal: document.wordGoal
                  })}
                </span>
                {/* A bar rather than a percentage: the question is 'am I nearly
                    there', which a shape answers faster than a number. */}
                <span className="h-1 w-8 overflow-hidden rounded-full bg-active">
                  <span
                    className={cx(
                      'block h-full rounded-full transition-[width] duration-300',
                      stats.words >= document.wordGoal ? 'bg-success' : 'bg-accent'
                    )}
                    style={{
                      width: `${Math.min(100, (stats.words / document.wordGoal) * 100)}%`
                    }}
                  />
                </span>
              </span>
            ) : (
              t('common.words', { count: stats.words })
            )}
          </button>
        </Tooltip>

        <span className={ITEM}>
          {t('status.readingTime', { time: formatReadingTime(stats.words) })}
        </span>
      </div>

      <div className="flex flex-none items-center gap-1">
        {extra}

        <span className="px-1.5 whitespace-nowrap">{document.eol === 'crlf' ? 'CRLF' : 'LF'}</span>
        <span className="px-1.5 whitespace-nowrap">UTF-8{document.bom ? ' BOM' : ''}</span>
        <span className="px-1.5 whitespace-nowrap">Markdown</span>

        <Segmented
          value={document.viewMode}
          options={viewModes}
          onChange={onViewModeChange}
          size="sm"
          ariaLabel={t('status.viewMode')}
          className="ml-1.5"
        />
      </div>
    </footer>
  )
}
