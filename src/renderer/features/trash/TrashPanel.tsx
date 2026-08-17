// ── @lib ───────────────────────────────────────────────────────────────────
import { Folder, FileText, RotateCcw, Trash2 } from '@icons'
import { useCallback, useEffect, useState, useSyncExternalStore, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { formatBytes, formatRelativeTime } from '@shared'
import type { TrashEntry } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { toast, trashService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, EmptyState, IconButton, Tooltip, dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { refreshWorkspace } from '@features/explorer'
import { trashSignal } from './trash-signal'

/**
 * What has been deleted, and the two things anyone wants to do about it.
 *
 * Restore is one click because undoing a mistake should be; permanent deletion
 * asks first, because it is the one action in the application with nothing
 * behind it.
 */
export function TrashPanel(): ReactElement {
  const t = useT()
  const limit = useAppSelector((state) => state.settings.values.files.trashLimit)
  const [entries, setEntries] = useState<TrashEntry[]>([])
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setEntries(await trashService.list())
  }, [])

  const revision = useSyncExternalStore(
    (listener) => trashSignal.subscribe(listener),
    () => trashSignal.get()
  )

  useEffect(() => {
    void refresh()
  }, [refresh, revision])

  const restore = async (entry: TrashEntry): Promise<void> => {
    setBusy(true)
    try {
      const path = await trashService.restore(entry.id)
      await refresh()
      // The tree has no idea a file reappeared underneath it.
      await refreshWorkspace()
      toast.success(t('trash.restored'), path)
    } catch (error) {
      toast.error(t('trash.restoreFailed'), error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  const purge = async (entry: TrashEntry): Promise<void> => {
    const confirmed = await dialogs.confirm({
      tone: 'danger',
      title: t('trash.purgeTitle'),
      message: t('trash.purgeBody', { name: entry.name }),
      confirmLabel: t('trash.purgeConfirm')
    })
    if (!confirmed) return

    await trashService.purge(entry.id)
    trashSignal.bump()
  }

  const clear = async (): Promise<void> => {
    const confirmed = await dialogs.confirm({
      tone: 'danger',
      title: t('trash.clearTitle'),
      message: t('trash.clearBody', { count: entries.length }),
      confirmLabel: t('trash.clearConfirm')
    })
    if (!confirmed) return

    await trashService.clear()
    trashSignal.bump()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium tracking-wide text-ink-tertiary uppercase">
          {t('trash.title')}
        </span>
        <Button variant="ghost" size="sm" disabled={entries.length === 0} onClick={() => void clear()}>
          {t('trash.clear')}
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<Trash2 size={22} />}
          title={t('trash.emptyTitle')}
          description={t('trash.emptyBody')}
        />
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-hover"
            >
              <span className="flex-none text-ink-tertiary">
                {entry.kind === 'directory' ? <Folder size={15} /> : <FileText size={15} />}
              </span>

              <Tooltip content={entry.originalPath}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{entry.name}</span>
                  <span className="block truncate text-xs text-ink-tertiary">
                    {formatRelativeTime(entry.deletedAt)}
                    {entry.kind === 'file' ? ` · ${formatBytes(entry.size)}` : ''}
                  </span>
                </span>
              </Tooltip>

              <span className="flex flex-none items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <IconButton
                  icon={<RotateCcw size={13} />}
                  label={t('trash.restore')}
                  size="sm"
                  disabled={busy}
                  onClick={() => void restore(entry)}
                />
                <IconButton
                  icon={<Trash2 size={13} />}
                  label={t('trash.purge')}
                  size="sm"
                  variant="danger"
                  onClick={() => void purge(entry)}
                />
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-line-subtle px-3 py-2 text-xs text-ink-tertiary">
        {limit > 0 ? t('trash.limit', { count: limit }) : t('trash.noLimit')}
      </p>
    </div>
  )
}
