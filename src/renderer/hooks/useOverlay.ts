// ── @lib ───────────────────────────────────────────────────────────────────
import { type RefObject, useEffect, useLayoutEffect, useState } from '@lib/react'

// ── types ──────────────────────────────────────────────────────────────────
import type { AnchorRect, Placement, Position } from '@hooks/types'

/**
 * Escape handling for layered overlays.
 *
 * A stack keeps Escape scoped to the *topmost* overlay: pressing it inside a
 * dropdown that sits above a modal closes only the dropdown. Without this the
 * modal would close too, which reads as a bug.
 */
const escapeStack: (() => void)[] = []

export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return

    escapeStack.push(onEscape)

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      const top = escapeStack[escapeStack.length - 1]
      if (top !== onEscape) return
      event.preventDefault()
      event.stopPropagation()
      onEscape()
    }

    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      const index = escapeStack.lastIndexOf(onEscape)
      if (index >= 0) escapeStack.splice(index, 1)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [active, onEscape])
}

export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  active: boolean,
  onOutside: (event: MouseEvent) => void
): void {
  useEffect(() => {
    if (!active) return
    const list = Array.isArray(refs) ? refs : [refs]

    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target as Node | null
      if (!target) return
      if (list.some((ref) => ref.current?.contains(target))) return
      onOutside(event)
    }

    // `mousedown` rather than `click` so the overlay closes before a click
    // lands on whatever is underneath it.
    document.addEventListener('mousedown', onPointerDown, true)
    return () => document.removeEventListener('mousedown', onPointerDown, true)
  }, [refs, active, onOutside])
}

const VIEWPORT_MARGIN = 8

/**
 * Positions a floating element against an anchor, flipping and clamping so it
 * never leaves the window. Deliberately small: MarkCraft's overlays are simple
 * enough that a positioning library would be dead weight.
 */
export function computePosition(
  anchor: AnchorRect,
  floating: { width: number; height: number },
  placement: Placement,
  offset = 4
): Position {
  const viewport = { width: window.innerWidth, height: window.innerHeight }
  let resolved = placement

  const spaceBelow = viewport.height - (anchor.top + anchor.height)
  const spaceAbove = anchor.top

  if (placement.startsWith('bottom') && floating.height + offset > spaceBelow) {
    if (spaceAbove > spaceBelow) resolved = placement.replace('bottom', 'top') as Placement
  } else if (placement.startsWith('top') && floating.height + offset > spaceAbove) {
    if (spaceBelow > spaceAbove) resolved = placement.replace('top', 'bottom') as Placement
  }

  let top: number
  let left: number

  switch (resolved) {
    case 'bottom-start':
      top = anchor.top + anchor.height + offset
      left = anchor.left
      break
    case 'bottom-end':
      top = anchor.top + anchor.height + offset
      left = anchor.left + anchor.width - floating.width
      break
    case 'top-start':
      top = anchor.top - floating.height - offset
      left = anchor.left
      break
    case 'top-end':
      top = anchor.top - floating.height - offset
      left = anchor.left + anchor.width - floating.width
      break
    case 'right':
      top = anchor.top
      left = anchor.left + anchor.width + offset
      break
    case 'left':
      top = anchor.top
      left = anchor.left - floating.width - offset
      break
  }

  left = Math.min(Math.max(VIEWPORT_MARGIN, left), viewport.width - floating.width - VIEWPORT_MARGIN)
  top = Math.min(Math.max(VIEWPORT_MARGIN, top), viewport.height - floating.height - VIEWPORT_MARGIN)

  return { top, left, placement: resolved }
}

/**
 * Measures the floating element and keeps it anchored across scroll/resize.
 * Returns `null` until the first measurement so nothing flashes at 0,0.
 */
export function useAnchoredPosition(
  anchorRect: AnchorRect | null,
  floatingRef: RefObject<HTMLElement | null>,
  placement: Placement,
  offset = 4
): Position | null {
  const [position, setPosition] = useState<Position | null>(null)

  useLayoutEffect(() => {
    if (!anchorRect) {
      setPosition(null)
      return
    }

    const measure = (): void => {
      const element = floatingRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      setPosition(
        computePosition(anchorRect, { width: rect.width, height: rect.height }, placement, offset)
      )
    }

    measure()

    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [anchorRect, floatingRef, placement, offset])

  return position
}

export function rectOf(element: HTMLElement | null): AnchorRect | null {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
}

/** Locks background scrolling while a modal is open. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [active])
}
