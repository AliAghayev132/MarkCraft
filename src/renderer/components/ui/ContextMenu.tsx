// ── @lib ───────────────────────────────────────────────────────────────────
import { useCallback, type MouseEvent, type ReactElement } from '@lib/react'

// ── @ui ────────────────────────────────────────────────────────────────────
import { MenuList } from '@ui/Menu'
import { Popover } from '@ui/Popover'

// ── @utils ─────────────────────────────────────────────────────────────────
import { createExternalStore, useExternalStore } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { MenuEntry, MenuItemDescriptor } from '@ui/types'

interface ContextMenuState {
  open: boolean
  x: number
  y: number
  items: MenuEntry[]
  ariaLabel: string
}

const CLOSED: ContextMenuState = { open: false, x: 0, y: 0, items: [], ariaLabel: '' }

const contextMenuStore = createExternalStore<ContextMenuState>(CLOSED)

/**
 * Opens the application's custom context menu at the pointer.
 *
 * The native menu is suppressed globally (see `main.tsx`), so every right-click
 * in MarkCraft is handled here — there is no path by which Chromium's own menu
 * can appear.
 */
export function useContextMenu(): (
  event: MouseEvent,
  items: MenuEntry[],
  ariaLabel?: string
) => void {
  return useCallback((event, items, ariaLabel = 'Context menu') => {
    if (items.length === 0) return
    event.preventDefault()
    event.stopPropagation()
    contextMenuStore.set({ open: true, x: event.clientX, y: event.clientY, items, ariaLabel })
  }, [])
}

/** Mounted once, near the root. */
export function ContextMenuLayer(): ReactElement {
  const state = useExternalStore(contextMenuStore)
  const close = useCallback(() => contextMenuStore.set(CLOSED), [])
  const onSelect = useCallback((item: MenuItemDescriptor) => item.onSelect?.(), [])

  return (
    <Popover
      open={state.open}
      /* A zero-size rect at the cursor: the popover's flip/clamp logic then
         keeps the menu on screen near the click, like a native menu does. */
      anchor={{ top: state.y, left: state.x, width: 0, height: 0 }}
      onClose={close}
      placement="bottom-start"
      offset={2}
      role="menu"
      ariaLabel={state.ariaLabel}
    >
      <MenuList
        items={state.items}
        onSelect={onSelect}
        onClose={close}
        ariaLabel={state.ariaLabel}
      />
    </Popover>
  )
}
