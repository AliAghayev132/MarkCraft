// ── @lib ───────────────────────────────────────────────────────────────────
import { createPortal, useEffect, useRef, type ReactElement } from '@lib/react'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useAnchoredPosition, useClickOutside, useEscapeKey, useFocusTrap } from '@hooks'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { PopoverProps } from '@ui/types'

/**
 * The single floating-surface primitive.
 *
 * Dropdowns, menus, selects and the context menu are all built on it, so
 * positioning, dismissal and focus behaviour are identical everywhere by
 * construction.
 */
export function Popover({
  open,
  anchor,
  onClose,
  placement = 'bottom-start',
  offset = 4,
  ignoreRefs = [],
  trapFocus = true,
  role = 'dialog',
  ariaLabel,
  className,
  children,
  matchAnchorWidth = false
}: PopoverProps): ReactElement | null {
  const floatingRef = useRef<HTMLDivElement | null>(null)
  const position = useAnchoredPosition(open ? anchor : null, floatingRef, placement, offset)

  useEscapeKey(open, onClose)
  useClickOutside([floatingRef, ...ignoreRefs], open, onClose)
  useFocusTrap(floatingRef, open && trapFocus)

  /* A popover anchored inside a scrolling panel must not linger once the
     window itself loses focus. */
  useEffect(() => {
    if (!open) return
    const onBlurWindow = (): void => onClose()
    window.addEventListener('blur', onBlurWindow)
    return () => window.removeEventListener('blur', onBlurWindow)
  }, [open, onClose])

  const overlayRoot = document.getElementById('overlay-root')
  if (!open || !overlayRoot) return null

  return createPortal(
    <div
      ref={floatingRef}
      role={role}
      aria-label={ariaLabel}
      className={cx(
        'fixed z-dropdown max-h-[min(560px,calc(100vh-24px))] min-w-[168px] max-w-[min(460px,calc(100vw-24px))]',
        'origin-top-left overflow-y-auto rounded-lg border border-line bg-raised p-1 opacity-0 shadow-lg',
        'data-[placement^=top]:origin-bottom-left',
        position && 'animate-scale-in opacity-100',
        className
      )}
      style={{
        top: position?.top ?? -9999,
        left: position?.left ?? -9999,
        ...(matchAnchorWidth && anchor ? { minWidth: anchor.width } : {})
      }}
      data-placement={position?.placement}
    >
      {children}
    </div>,
    overlayRoot
  )
}
