// ── @lib ───────────────────────────────────────────────────────────────────
import { memo, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { dirname, formatBytes, formatRelativeTime } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Spinner } from '@ui'

// ── @components ────────────────────────────────────────────────────────────
import { FileIcon, TreeTwisty } from '@components'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { TreeRowProps } from './types'

export const ROW_HEIGHT = 24

/**
 * One row of the file tree.
 *
 * Memoised because the virtual list re-renders on every scroll frame and on
 * every workspace action; without this a large expanded tree would rebuild
 * dozens of rows per frame.
 */
export const TreeRow = memo(function TreeRow({
  node,
  index,
  selected,
  active,
  expanded,
  loading,
  cut,
  isDropTarget,
  onClick,
  onContextMenu,
  onDragStart,
  onDropTargetChange,
  onMove
}: TreeRowProps): ReactElement {
  const t = useT()
  const dropDirectory = node.kind === 'directory' ? node.path : dirname(node.path)

  return (
    <div
      data-tree-row
      role="treeitem"
      aria-level={node.depth + 1}
      aria-selected={selected}
      aria-expanded={node.kind === 'directory' ? expanded : undefined}
      tabIndex={-1}
      className={cx(
        'group relative flex cursor-default items-center gap-1.5 rounded-xs pr-2 text-sm whitespace-nowrap',
        selected ? 'bg-selected text-ink' : 'text-ink-secondary hover:bg-hover hover:text-ink',
        active &&
          'before:absolute before:inset-y-[3px] before:left-0 before:w-0.5 before:rounded-full before:bg-accent before:content-[""]',
        cut && 'opacity-50',
        isDropTarget && 'bg-accent-subtle shadow-[inset_0_0_0_1px_var(--mc-accent-border)]'
      )}
      style={{ paddingLeft: 6 + node.depth * 12, height: ROW_HEIGHT }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('application/x-markcraft-paths')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        onDropTargetChange(dropDirectory)
      }}
      onDragLeave={() => onDropTargetChange(null)}
      onDrop={(event) => {
        const raw = event.dataTransfer.getData('application/x-markcraft-paths')
        onDropTargetChange(null)
        if (!raw) return

        event.preventDefault()
        event.stopPropagation()
        try {
          onMove(JSON.parse(raw) as string[], dropDirectory)
        } catch {
          // Malformed payload: ignore rather than corrupting the tree.
        }
      }}
    >
      <TreeTwisty expanded={expanded} visible={node.kind === 'directory' && node.hasChildren} />

      {loading ? (
        <Spinner size={12} className="flex-none" />
      ) : (
        <FileIcon
          kind={node.kind}
          ext={node.ext}
          name={node.name}
          path={node.path}
          expanded={expanded}
        />
      )}

      <span
        className={cx('min-w-0 flex-1 truncate', active && 'font-medium text-accent')}
      >
        {node.name}
      </span>

      {node.kind === 'file' ? (
        <span
          className="flex-none text-2xs tabular-nums text-ink-tertiary opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        >
          {formatBytes(node.size)}
        </span>
      ) : null}

      {/* Metadata is the first thing to go when the sidebar is narrow. */}
      <span
        className="hidden flex-none text-2xs tabular-nums text-ink-tertiary opacity-0 transition-opacity group-hover:opacity-100 @[300px]:inline"
        aria-hidden="true"
      >
        {formatRelativeTime(node.modifiedAt)}
      </span>

      <span className="mc-visually-hidden">
        {t(node.kind === 'directory' ? 'explorer.row.folder' : 'explorer.row.file')},{' '}
        {t('explorer.row.position', { index: index + 1 })}
      </span>
    </div>
  )
})
