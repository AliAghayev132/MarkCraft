// ── @lib ───────────────────────────────────────────────────────────────────
import { CornerDownLeft, FileText } from '@icons'
import { useEffect, useMemo, useRef, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename, dirname, joinPath, rankFuzzy } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { flattenTree, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Modal, SearchInput } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @components ────────────────────────────────────────────────────────────
import { FileIcon } from '@components'

// ── @features ──────────────────────────────────────────────────────────────
import { openPath } from '@features/documents'

// ── types ──────────────────────────────────────────────────────────────────
import type { QuickOpenProps } from './types'

/** More than a screenful is a list nobody reads to the end of. */
const SHOWN = 40

/**
 * Opening a file by typing a few letters of its name.
 *
 * The command palette is next door and matches by substring, which is right for
 * a command — a command's name is short and typed in full. A file is not:
 * people type `usrv` for `user-service.ts`, and a substring search finds
 * nothing at all.
 *
 * What is offered is what the tree has already read. That is deliberate: a
 * quick-open that walked the disk would be slower than the tree it duplicates,
 * and the folders somebody has opened are the ones they are working in.
 */
export function QuickOpen({ open, onClose }: QuickOpenProps): ReactElement | null {
  const t = useT()

  const workspace = useAppSelector((state) => state.workspace)
  const root = workspace.root

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
  }, [open])

  /*
   * Every file the tree knows about, by its path from the workspace root — the
   * folder is part of what people type, and `canvas/view` should find a file
   * two folders down.
   */
  const files = useMemo(() => {
    if (!root) return []
    return flattenTree(workspace)
      .filter((node) => node.kind === 'file')
      .map((node) => node.path.slice(root.length + 1).split('\\').join('/'))
  }, [workspace, root])

  const matches = useMemo(
    () => rankFuzzy(query, files, (file) => file, SHOWN),
    [query, files]
  )

  useEffect(() => setActive(0), [query])

  // Keeps the highlighted row on screen while arrowing through a long list.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open || !root) return null

  const choose = (relative: string): void => {
    onClose()
    void openPath(joinPath(root, relative))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('quickOpen.title')}
      description={t('quickOpen.body')}
      icon={<FileText size={16} />}
      size="md"
    >
      <div className="flex flex-col gap-2">
        <SearchInput
          // The dialog exists to be typed into; anything else to focus first
          // would be a step between the person and the only field on screen.
          autoFocus
          value={query}
          placeholder={t('quickOpen.placeholder')}
          aria-label={t('quickOpen.placeholder')}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onClear={() => setQuery('')}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((at) => Math.min(matches.length - 1, at + 1))
              return
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((at) => Math.max(0, at - 1))
              return
            }
            if (event.key === 'Enter' && matches[active]) {
              event.preventDefault()
              choose(matches[active].item)
            }
          }}
        />

        {matches.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-ink-tertiary">
            {files.length === 0 ? t('quickOpen.nothingOpen') : t('quickOpen.noMatch')}
          </p>
        ) : (
          <ul
            ref={listRef}
            className="m-0 flex max-h-[50vh] list-none flex-col gap-0.5 overflow-y-auto p-0"
          >
            {matches.map((match, index) => {
              const name = basename(match.item)
              const folder = dirname(match.item)

              return (
                <li key={match.item}>
                  <button
                    type="button"
                    title={match.item}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(match.item)}
                    className={cx(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left',
                      'focus-visible:shadow-focus focus-visible:outline-none',
                      index === active ? 'bg-active' : 'hover:bg-hover'
                    )}
                  >
                    <FileIcon
                      kind="file"
                      ext={name.includes('.') ? name.split('.').pop() : ''}
                      name={name}
                      path={joinPath(root, match.item)}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm text-ink">{name}</span>
                      {folder && folder !== '.' ? (
                        <span className="truncate text-2xs text-ink-tertiary">{folder}</span>
                      ) : null}
                    </span>
                    {index === active ? (
                      <CornerDownLeft size={13} className="flex-none text-ink-tertiary" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
