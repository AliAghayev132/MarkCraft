// ── @lib ───────────────────────────────────────────────────────────────────
import { cloneElement, useCallback, useRef, useState, type MouseEvent, type ReactElement } from '@lib/react'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { rectOf } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { MenuList } from '@ui/Menu'
import { Popover } from '@ui/Popover'

// ── types ──────────────────────────────────────────────────────────────────
import type { DropdownProps, MenuItemDescriptor } from '@ui/types'
import type { AnchorRect } from '@hooks/types'

/** A button that opens a `MenuList`. Used by toolbars and panel headers. */
export function Dropdown({
  items,
  placement = 'bottom-start',
  ariaLabel = 'Menu',
  children,
  onOpenChange
}: DropdownProps): ReactElement {
  const triggerRef = useRef<HTMLElement | null>(null)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)

  const close = useCallback(() => {
    setAnchor(null)
    onOpenChange?.(false)
  }, [onOpenChange])

  const onSelect = useCallback((item: MenuItemDescriptor) => item.onSelect?.(), [])

  const trigger = cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node
    },
    'aria-haspopup': true,
    'aria-expanded': anchor !== null,
    onClick: (event: MouseEvent) => {
      children.props.onClick?.(event)
      if (event.defaultPrevented) return

      if (anchor) {
        close()
      } else {
        setAnchor(rectOf(triggerRef.current))
        onOpenChange?.(true)
      }
    }
  })

  return (
    <>
      {trigger}
      <Popover
        open={anchor !== null}
        anchor={anchor}
        onClose={close}
        placement={placement}
        role="menu"
        ariaLabel={ariaLabel}
        ignoreRefs={[triggerRef]}
      >
        <MenuList items={items} onSelect={onSelect} onClose={close} ariaLabel={ariaLabel} />
      </Popover>
    </>
  )
}
