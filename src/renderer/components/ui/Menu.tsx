// ── @lib ───────────────────────────────────────────────────────────────────
import { Check, ChevronRight } from '@icons'
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from '@lib/react'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Kbd } from '@ui/Display'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { MenuEntry, MenuItemDescriptor, MenuListProps } from '@ui/types'

export function isSeparator(entry: MenuEntry): entry is { id: string; separator: true } {
  return 'separator' in entry
}

/**
 * Keyboard-navigable menu list with roving focus, type-ahead and submenus.
 *
 * Used by the context menu, dropdowns and the tab/explorer menus — one
 * implementation, so keyboard behaviour cannot diverge between them.
 */
export function MenuList({
  items,
  onSelect,
  onClose,
  ariaLabel,
  className
}: MenuListProps): ReactElement {
  const listRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(() => firstEnabledIndex(items))
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const typeAhead = useRef({ buffer: '', timer: 0 })

  const move = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        const count = items.length
        for (let step = 1; step <= count; step++) {
          const next = (current + delta * step + count * count) % count
          const entry = items[next]
          if (entry && !isSeparator(entry) && !entry.disabled) return next
        }
        return current
      })
    },
    [items]
  )

  const activate = useCallback(
    (entry: MenuEntry | undefined) => {
      if (!entry || isSeparator(entry) || entry.disabled) return
      if (entry.submenu?.length) {
        setOpenSubmenu(entry.id)
        return
      }
      onSelect(entry)
      onClose()
    },
    [onSelect, onClose]
  )

  const onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        move(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        move(-1)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(firstEnabledIndex(items))
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(lastEnabledIndex(items))
        break
      case 'ArrowRight': {
        const entry = items[activeIndex]
        if (entry && !isSeparator(entry) && entry.submenu?.length) {
          event.preventDefault()
          setOpenSubmenu(entry.id)
        }
        break
      }
      case 'ArrowLeft':
        if (openSubmenu) {
          event.preventDefault()
          setOpenSubmenu(null)
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        activate(items[activeIndex])
        break
      default: {
        // Type-ahead: jump to the next item starting with the typed letters.
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return
        window.clearTimeout(typeAhead.current.timer)
        typeAhead.current.buffer += event.key.toLowerCase()
        typeAhead.current.timer = window.setTimeout(() => {
          typeAhead.current.buffer = ''
        }, 600)

        const query = typeAhead.current.buffer
        const index = items.findIndex(
          (entry) => !isSeparator(entry) && entry.label.toLowerCase().startsWith(query)
        )
        if (index >= 0) setActiveIndex(index)
      }
    }
  }

  useEffect(() => {
    listRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div
      ref={listRef}
      role="menu"
      aria-label={ariaLabel}
      tabIndex={-1}
      className={cx('flex min-w-[176px] flex-col outline-none', className)}
      onKeyDown={onKeyDown}
    >
      {items.map((entry, index) =>
        isSeparator(entry) ? (
          <div
            key={entry.id}
            role="separator"
            className="mx-1.5 my-1 flex items-center gap-2 border-t border-line-subtle"
          >
            {entry.label ? (
              <span className="pt-2 pb-px text-2xs font-medium uppercase tracking-wide text-ink-tertiary">
                {entry.label}
              </span>
            ) : null}
          </div>
        ) : (
          <MenuItem
            key={entry.id}
            item={entry}
            active={index === activeIndex}
            submenuOpen={openSubmenu === entry.id}
            onHover={() => setActiveIndex(index)}
            onActivate={() => activate(entry)}
            onSelectDeep={(item) => {
              onSelect(item)
              onClose()
            }}
            onCloseSubmenu={() => setOpenSubmenu(null)}
          />
        )
      )}
    </div>
  )
}

interface MenuItemProps {
  item: MenuItemDescriptor
  active: boolean
  submenuOpen: boolean
  onHover: () => void
  onActivate: () => void
  onSelectDeep: (item: MenuItemDescriptor) => void
  onCloseSubmenu: () => void
}

function MenuItem({
  item,
  active,
  submenuOpen,
  onHover,
  onActivate,
  onSelectDeep,
  onCloseSubmenu
}: MenuItemProps): ReactElement {
  const itemRef = useRef<HTMLButtonElement | null>(null)
  const hasSubmenu = Boolean(item.submenu?.length)

  useEffect(() => {
    if (active) itemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <div className="relative">
      <button
        ref={itemRef}
        type="button"
        role="menuitem"
        aria-haspopup={hasSubmenu || undefined}
        aria-expanded={hasSubmenu ? submenuOpen : undefined}
        aria-disabled={item.disabled || undefined}
        data-active={active || undefined}
        className={cx(
          'flex w-full items-center gap-2 rounded-sm px-2 text-left text-sm text-ink',
          item.hint ? 'py-1' : 'h-control',
          'transition-colors duration-75 ease-out active:bg-active data-active:bg-hover',
          item.danger && 'text-danger data-active:bg-danger-bg',
          item.disabled && 'pointer-events-none text-ink-disabled'
        )}
        onMouseEnter={onHover}
        onClick={(event) => {
          event.stopPropagation()
          onActivate()
        }}
      >
        <span
          className={cx(
            'grid size-[15px] flex-none place-items-center text-ink-tertiary',
            item.danger && 'text-inherit'
          )}
        >
          {item.checked ? <Check size={13} strokeWidth={2.6} /> : item.icon}
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{item.label}</span>
          {item.hint ? (
            <span className="truncate text-2xs text-ink-tertiary">{item.hint}</span>
          ) : null}
        </span>

        {item.shortcut ? <Kbd keys={item.shortcut} className="ml-3 flex-none" /> : null}
        {hasSubmenu ? <ChevronRight size={13} className="flex-none text-ink-tertiary" /> : null}
      </button>

      {hasSubmenu && submenuOpen ? (
        <div className="absolute -top-1 left-full z-1 ml-px animate-scale-in rounded-lg border border-line bg-raised p-1 shadow-lg">
          <MenuList
            items={item.submenu as MenuEntry[]}
            onSelect={onSelectDeep}
            onClose={onCloseSubmenu}
            ariaLabel={item.label}
          />
        </div>
      ) : null}
    </div>
  )
}

function firstEnabledIndex(items: MenuEntry[]): number {
  const index = items.findIndex((entry) => !isSeparator(entry) && !entry.disabled)
  return index < 0 ? 0 : index
}

function lastEnabledIndex(items: MenuEntry[]): number {
  for (let i = items.length - 1; i >= 0; i--) {
    const entry = items[i]
    if (entry && !isSeparator(entry) && !entry.disabled) return i
  }
  return 0
}
