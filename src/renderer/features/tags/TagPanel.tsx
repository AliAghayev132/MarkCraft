// ── @lib ───────────────────────────────────────────────────────────────────
import { Hash, RefreshCw } from '@icons'
import { useCallback, useEffect, useMemo, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename, joinPath, type TagSummary } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { linksService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, SearchInput, Spinner } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { openPath } from '@features/documents'

/**
 * Every tag in the workspace, and what carries it.
 *
 * The graph beside it answers "what does this document point at". This answers
 * the question the graph cannot: what runs through documents that never mention
 * each other. Both are needed; neither replaces the other.
 *
 * Scanned on demand rather than kept up to date. A tag panel that re-read the
 * workspace on every keystroke would be a file watcher pretending to be a list,
 * and the answer is stale by seconds at worst — which is what the refresh
 * button is for, and why it says when it last looked.
 */
export function TagPanel(): ReactElement {
  const t = useT()
  const root = useAppSelector((state) => state.workspace.root)

  const [tags, setTags] = useState<TagSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const scan = useCallback(async (): Promise<void> => {
    if (!root) {
      setTags([])
      return
    }

    setLoading(true)
    try {
      const result = await linksService.tags(root)
      setTags(result.tags)
      setTruncated(result.truncated)
    } finally {
      setLoading(false)
    }
  }, [root])

  useEffect(() => {
    void scan()
  }, [scan])

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (needle === '') return tags
    return tags.filter((entry) => entry.tag.toLowerCase().includes(needle))
  }, [tags, filter])

  if (!root) {
    return (
      <p className="p-3 text-xs text-ink-tertiary">{t('tags.needsFolder')}</p>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
      <div className="flex items-center gap-1.5">
        <SearchInput
          value={filter}
          placeholder={t('tags.filter')}
          aria-label={t('tags.filter')}
          onChange={(event) => setFilter(event.currentTarget.value)}
          onClear={() => setFilter('')}
        />
        <IconButton
          icon={<RefreshCw size={14} />}
          label={t('tags.rescan')}
          disabled={loading}
          onClick={() => void scan()}
        />
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label={t('tags.scanning')} />
        </div>
      ) : shown.length === 0 ? (
        <p className="px-1 text-xs text-ink-tertiary">
          {tags.length === 0 ? t('tags.none') : t('tags.noMatch')}
        </p>
      ) : (
        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-0.5 overflow-y-auto p-0">
          {shown.map((entry) => (
            <li key={entry.tag}>
              <button
                type="button"
                aria-expanded={open === entry.tag}
                onClick={() => setOpen((current) => (current === entry.tag ? null : entry.tag))}
                className={cx(
                  'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm',
                  'focus-visible:shadow-focus focus-visible:outline-none',
                  open === entry.tag ? 'bg-active' : 'hover:bg-hover'
                )}
              >
                <Hash size={13} className="flex-none text-ink-tertiary" />
                <span className="min-w-0 flex-1 truncate text-ink">{entry.tag}</span>
                <span className="flex-none text-2xs tabular-nums text-ink-tertiary">
                  {entry.count}
                </span>
              </button>

              {open === entry.tag ? (
                <ul className="m-0 mb-1 ml-4 flex list-none flex-col gap-0.5 border-l border-line-subtle p-0 pl-2">
                  {entry.files.map((file) => (
                    <li key={file}>
                      <button
                        type="button"
                        title={file}
                        onClick={() => void openPath(joinPath(root, file))}
                        className="w-full truncate rounded px-1.5 py-0.5 text-left text-xs text-ink-secondary hover:bg-hover focus-visible:shadow-focus focus-visible:outline-none"
                      >
                        {basename(file)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {truncated ? (
        <p className="px-1 text-2xs text-warning">{t('tags.truncated')}</p>
      ) : null}
    </div>
  )
}
