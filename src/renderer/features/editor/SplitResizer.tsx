// ── @lib ───────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, type PointerEvent, type ReactElement } from '@lib/react'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { SplitResizerProps } from './types'

/**
 * Draggable divider between two panes.
 *
 * Pointer capture means the drag survives the cursor leaving the 5px handle,
 * and arrow-key support means the split is adjustable without a mouse.
 */
export function SplitResizer({
  ratio,
  onChange,
  ariaLabel,
  min = 0.2,
  max = 0.8,
  orientation = 'vertical'
}: SplitResizerProps): ReactElement {
  const handleRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const vertical = orientation === 'vertical'

  const clamp = useCallback((value: number) => Math.min(max, Math.max(min, value)), [min, max])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    draggingRef.current = true
    handleRef.current?.setPointerCapture(event.pointerId)
    document.body.style.cursor = vertical ? 'col-resize' : 'row-resize'
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return
    const parent = handleRef.current?.parentElement
    if (!parent) return

    const rect = parent.getBoundingClientRect()
    onChange(
      clamp(
        vertical
          ? (event.clientX - rect.left) / rect.width
          : (event.clientY - rect.top) / rect.height
      )
    )
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return
    draggingRef.current = false
    handleRef.current?.releasePointerCapture(event.pointerId)
    document.body.style.cursor = ''
  }

  useEffect(
    () => () => {
      document.body.style.cursor = ''
    },
    []
  )

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={Math.round(min * 100)}
      aria-valuemax={Math.round(max * 100)}
      tabIndex={0}
      className={cx(
        'group relative flex-none touch-none bg-line-subtle transition-colors',
        'hover:bg-accent-line focus-visible:bg-accent-line focus-visible:outline-none',
        vertical ? 'w-[5px] cursor-col-resize' : 'h-[5px] cursor-row-resize'
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onChange(0.5)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.02
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          onChange(clamp(ratio - step))
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          onChange(clamp(ratio + step))
        } else if (event.key === 'Home') {
          event.preventDefault()
          onChange(0.5)
        }
      }}
    >
      <span
        className={cx(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong opacity-0 transition-opacity group-hover:opacity-100',
          vertical ? 'h-[26px] w-0.5' : 'h-0.5 w-[26px]'
        )}
      />
    </div>
  )
}
