// ── @lib ───────────────────────────────────────────────────────────────────
import { cloneElement, createPortal, useCallback, useEffect, useRef, useState, type FocusEvent, type MouseEvent, type ReactElement, type Ref } from '@lib/react'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { computePosition, rectOf } from '@hooks'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { TooltipProps } from '@ui/types'
import type { AnchorRect } from '@hooks/types'

/**
 * The application's tooltip.
 *
 * The `title` attribute is deliberately never used anywhere: it is slow,
 * unstyleable and inconsistent across platforms. Shows on hover after a delay
 * and immediately on keyboard focus, so keyboard users are not made to wait for
 * information mouse users get for free.
 */
export function Tooltip({
  content,
  shortcut,
  placement = 'bottom-start',
  delay = 420,
  disabled = false,
  children
}: TooltipProps): ReactElement {
  const triggerRef = useRef<HTMLElement | null>(null)
  const floatingRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)

  const [anchor, setAnchor] = useState<AnchorRect | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const hide = useCallback(() => {
    clear()
    setAnchor(null)
    setPosition(null)
  }, [clear])

  const show = useCallback(
    (immediate: boolean) => {
      if (disabled) return
      clear()
      const open = (): void => setAnchor(rectOf(triggerRef.current))
      if (immediate) open()
      else timerRef.current = window.setTimeout(open, delay)
    },
    [clear, delay, disabled]
  )

  useEffect(() => clear, [clear])

  useEffect(() => {
    if (!anchor) return
    const element = floatingRef.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    setPosition(computePosition(anchor, { width: rect.width, height: rect.height }, placement, 6))
  }, [anchor, placement])

  /* A tooltip must never outlive its trigger's interaction. */
  useEffect(() => {
    if (!anchor) return
    const dismiss = (): void => hide()

    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('wheel', dismiss, { passive: true })
    document.addEventListener('keydown', dismiss)

    return () => {
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('wheel', dismiss)
      document.removeEventListener('keydown', dismiss)
    }
  }, [anchor, hide])

  const overlayRoot = document.getElementById('overlay-root')

  const trigger = cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node
      const forwarded = (children as { ref?: Ref<HTMLElement> }).ref
      if (typeof forwarded === 'function') forwarded(node)
      else if (forwarded && typeof forwarded === 'object') {
        ;(forwarded as { current: HTMLElement | null }).current = node
      }
    },
    onMouseEnter: (event: MouseEvent) => {
      children.props.onMouseEnter?.(event)
      show(false)
    },
    onMouseLeave: (event: MouseEvent) => {
      children.props.onMouseLeave?.(event)
      hide()
    },
    onFocus: (event: FocusEvent) => {
      children.props.onFocus?.(event)
      show(true)
    },
    onBlur: (event: FocusEvent) => {
      children.props.onBlur?.(event)
      hide()
    }
  })

  return (
    <>
      {trigger}
      {anchor && overlayRoot
        ? createPortal(
            <div
              ref={floatingRef}
              role="tooltip"
              className={cx(
                'pointer-events-none fixed z-tooltip flex max-w-[280px] items-center gap-2 rounded-sm',
                'border border-line bg-raised px-2 py-0.5 text-xs leading-snug text-ink shadow-md',
                'opacity-0 transition-opacity duration-100 ease-out',
                position && 'opacity-100'
              )}
              style={{ top: position?.top ?? -9999, left: position?.left ?? -9999 }}
            >
              <span>{content}</span>
              {shortcut ? (
                <span className="whitespace-nowrap text-2xs text-ink-tertiary">{shortcut}</span>
              ) : null}
            </div>,
            overlayRoot
          )
        : null}
    </>
  )
}
