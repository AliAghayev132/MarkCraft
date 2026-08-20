// ── @lib ───────────────────────────────────────────────────────────────────
import { History, Trash2 } from '@icons'
import { useCallback, useEffect, useMemo, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { formatBytes, formatRelativeTime } from '@shared'
import type { HistoryEntry } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { historyService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { contentChanged, dispatch, selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Badge, Button, EmptyState, IconButton, Modal, ModalActions, Select, dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { collapseUnchanged, diffLines, summariseDiff } from './diff'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { DiffKind, HistoryDialogProps } from './types'

const LINE_TONE: Record<DiffKind, string> = {
  same: 'text-ink-secondary',
  added: 'bg-success-bg text-ink',
  removed: 'bg-danger-bg text-ink-secondary line-through',
  gap: 'text-ink-tertiary'
}

const LINE_MARK: Record<DiffKind, string> = {
  same: ' ',
  added: '+',
  removed: '-',
  gap: ' '
}

/**
 * Every saved version of this document, and what changed in each.
 *
 * The diff is against the text *in the editor right now*, not against the
 * neighbouring version, because the only question anyone opens this to answer
 * is "what would I get back if I restored this one".
 */
export function HistoryDialog({ open, onClose }: HistoryDialogProps): ReactElement | null {
  const t = useT()
  const document = useAppSelector(selectActiveDocument)
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedContent, setSelectedContent] = useState<string | null>(null)

  /*
   * What the chosen version is being held up against. Null means the document
   * as it is now, which is the question people ask most — but "what changed
   * between Tuesday and Thursday" is a real question too, and answering it by
   * restoring Tuesday and looking is a terrible way to find out.
   */
  const [againstId, setAgainstId] = useState<string | null>(null)
  const [againstContent, setAgainstContent] = useState<string | null>(null)

  const path = document?.path ?? null

  const refresh = useCallback(async () => {
    if (!path) return
    const list = await historyService.list(path)
    setEntries(list)
    setSelectedId((current) => current ?? list[0]?.id ?? null)
  }, [path])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (!open || !path || !selectedId) {
      setSelectedContent(null)
      return
    }
    void historyService.read(path, selectedId).then((version) => {
      setSelectedContent(version?.content ?? null)
    })
  }, [open, path, selectedId])

  useEffect(() => {
    if (!open || !path || !againstId) {
      setAgainstContent(null)
      return
    }
    void historyService.read(path, againstId).then((version) => {
      setAgainstContent(version?.content ?? null)
    })
  }, [open, path, againstId])

  // A version cannot be compared with itself, and a version that has been
  // forgotten is no longer something to compare with.
  useEffect(() => {
    if (againstId === null) return
    if (againstId === selectedId || !entries.some((entry) => entry.id === againstId)) {
      setAgainstId(null)
    }
  }, [againstId, selectedId, entries])

  /* Older on the left, newer on the right, whichever way round they were
     picked — a diff that reads backwards is a diff nobody trusts. */
  const lines = useMemo(() => {
    if (selectedContent === null || !document) return []

    if (againstId === null) return collapseUnchanged(diffLines(selectedContent, document.content))
    if (againstContent === null) return []

    const selectedAt = entries.find((entry) => entry.id === selectedId)?.savedAt ?? 0
    const againstAt = entries.find((entry) => entry.id === againstId)?.savedAt ?? 0
    const [before, after] =
      selectedAt <= againstAt
        ? [selectedContent, againstContent]
        : [againstContent, selectedContent]

    return collapseUnchanged(diffLines(before, after))
  }, [selectedContent, againstContent, againstId, selectedId, entries, document])

  const summary = useMemo(() => summariseDiff(lines), [lines])

  if (!open) return null

  const restore = async (): Promise<void> => {
    if (!document || selectedContent === null) return

    const confirmed = await dialogs.confirm({
      title: t('history.restoreTitle'),
      message: t('history.restoreBody'),
      confirmLabel: t('history.restore')
    })
    if (!confirmed) return

    // Into the buffer, not onto the disk: restoring becomes an ordinary edit
    // the user can undo, review, or abandon by closing without saving.
    dispatch(contentChanged({ id: document.id, content: selectedContent }))
    toast.success(t('history.restored'), t('history.restoredDetail'))
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={<History size={18} />}
      title={t('history.title')}
      description={document?.title ?? ''}
      size="lg"
      footer={
        <ModalActions>
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button variant="primary" disabled={selectedContent === null} onClick={() => void restore()}>
            {t('history.restore')}
          </Button>
        </ModalActions>
      }
    >
      {!path ? (
        <EmptyState
          icon={<History size={22} />}
          title={t('history.unsavedTitle')}
          description={t('history.unsavedBody')}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<History size={22} />}
          title={t('history.emptyTitle')}
          description={t('history.emptyBody')}
        />
      ) : (
        <div className="flex max-h-[26rem] min-h-[18rem] gap-3">
          <ul className="w-56 flex-none overflow-y-auto rounded-md border border-line-subtle">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={cx(
                    'group flex w-full flex-col items-start gap-0.5 px-2.5 py-2 text-left',
                    entry.id === selectedId ? 'bg-selected' : 'hover:bg-hover'
                  )}
                >
                  <span className="flex w-full items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs text-ink">
                      {formatRelativeTime(entry.savedAt)}
                    </span>
                    <IconButton
                      icon={<Trash2 size={11} />}
                      label={t('history.forget')}
                      size="sm"
                      variant="danger"
                      className="opacity-0 group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation()
                        void historyService.purge(path, entry.id).then(() => {
                          if (entry.id === selectedId) setSelectedId(null)
                          return refresh()
                        })
                      }}
                    />
                  </span>
                  <span className="w-full truncate text-xs text-ink-tertiary">
                    {entry.summary || formatBytes(entry.bytes)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-secondary">{t('history.comparedWith')}</span>

              <Select
                value={againstId ?? 'now'}
                size="sm"
                ariaLabel={t('history.comparedWith')}
                options={[
                  { value: 'now', label: t('history.now') },
                  ...entries
                    .filter((entry) => entry.id !== selectedId)
                    .map((entry) => ({
                      value: entry.id,
                      label: formatRelativeTime(entry.savedAt)
                    }))
                ]}
                onChange={(value) => setAgainstId(value === 'now' ? null : value)}
              />

              <Badge tone="success">+{summary.added}</Badge>
              <Badge tone="danger">−{summary.removed}</Badge>
              {summary.added === 0 && summary.removed === 0 ? (
                <span className="text-ink-tertiary">{t('history.identical')}</span>
              ) : null}
            </div>

            <pre className="m-0 min-h-0 flex-1 overflow-auto rounded-md border border-line-subtle bg-surface-sunken p-2 text-xs leading-relaxed">
              {lines.map((line, index) => (
                <div key={index} className={cx('px-1 whitespace-pre-wrap', LINE_TONE[line.kind])}>
                  {line.kind === 'gap'
                    ? `⋯ ${t('history.hiddenLines', { count: Number(line.text) })}`
                    : `${LINE_MARK[line.kind]} ${line.text}`}
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  )
}

