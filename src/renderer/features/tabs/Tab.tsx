// ── @lib ───────────────────────────────────────────────────────────────────
import { Circle, X } from '@icons'
import { memo, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { isDirty } from '@store'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { TabProps } from './types'

/**
 * One tab.
 *
 * Memoised because the tab strip re-renders on every keystroke in the active
 * document — without this, typing would re-render every open tab.
 */
export const Tab = memo(function Tab({
  document,
  active,
  isDropTarget,
  onActivate,
  onClose,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}: TabProps): ReactElement {
  const t = useT()
  const dirty = isDirty(document)

  return (
    <div
      data-tab-id={document.id}
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      draggable
      className={cx(
        'group relative flex min-w-[92px] max-w-[200px] shrink basis-auto items-center gap-1.5',
        'border-r border-line-subtle pr-1 pl-3 text-sm transition-colors duration-75',
        'focus-visible:shadow-[inset_0_0_0_2px_var(--mc-accent)] focus-visible:outline-none',
        active
          ? // The accent rail is drawn inside the tab so it never shifts layout.
            'bg-surface text-ink before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-accent before:content-[""]'
          : 'bg-transparent text-ink-tertiary hover:bg-hover hover:text-ink-secondary',
        isDropTarget &&
          'after:absolute after:inset-y-0 after:-left-px after:w-0.5 after:bg-accent after:content-[""]'
      )}
      onClick={onActivate}
      onAuxClick={(event) => {
        // Middle-click closes, matching every other tabbed editor.
        if (event.button === 1) {
          event.preventDefault()
          onClose()
        }
      }}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate()
        }
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <span className="min-w-0 flex-1 truncate">{document.title}</span>

      {document.external !== 'none' ? (
        <span
          className="size-[5px] flex-none rounded-full bg-dot-conflict"
          aria-label={t(
            document.external === 'removed' ? 'tabs.deletedOnDisk' : 'tabs.changedOnDisk'
          )}
        />
      ) : null}

      <button
        type="button"
        aria-label={t(dirty ? 'tabs.closeUnsaved' : 'tabs.close', { name: document.title })}
        className={cx(
          'grid size-[18px] flex-none place-items-center rounded-xs text-ink-tertiary transition-colors',
          'hover:bg-active hover:text-ink',
          // A dirty tab shows a dot that becomes a close cross on hover — the
          // standard affordance, so the target never moves or disappears.
          dirty && '[&>*]:[grid-area:1/1]'
        )}
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
      >
        {dirty ? (
          <>
            <Circle
              size={8}
              fill="currentColor"
              className="text-dot-dirty group-hover:opacity-0 [button:focus-visible_&]:opacity-0"
            />
            <X
              size={12}
              className="opacity-0 group-hover:opacity-100 [button:focus-visible_&]:opacity-100"
            />
          </>
        ) : (
          <X size={12} />
        )}
      </button>
    </div>
  )
})
