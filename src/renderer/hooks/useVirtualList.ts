// ── @lib ───────────────────────────────────────────────────────────────────
import { type RefObject, useCallback, useEffect, useState } from '@lib/react'

// ── types ──────────────────────────────────────────────────────────────────
import type { VirtualWindow } from '@hooks/types'

/**
 * Fixed-row virtualisation.
 *
 * The file explorer must stay smooth with tens of thousands of rows, and every
 * row here is the same height, so a windowing calculation is all that is
 * needed — a virtualisation dependency would be pure weight (§48).
 */
export function useVirtualList(
  scrollRef: RefObject<HTMLElement | null>,
  itemCount: number,
  rowHeight: number,
  overscan = 8
): VirtualWindow {
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  const measure = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    setScrollTop(element.scrollTop)
    setViewportHeight(element.clientHeight)
  }, [scrollRef])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    measure()

    const onScroll = (): void => setScrollTop(element.scrollTop)
    element.addEventListener('scroll', onScroll, { passive: true })

    // The sidebar is resizable, so the viewport height is not static.
    const observer = new ResizeObserver(measure)
    observer.observe(element)

    return () => {
      element.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [scrollRef, measure])

  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endIndex = Math.min(itemCount, startIndex + visibleCount)

  return {
    startIndex,
    endIndex,
    offsetTop: startIndex * rowHeight,
    totalHeight: itemCount * rowHeight
  }
}
