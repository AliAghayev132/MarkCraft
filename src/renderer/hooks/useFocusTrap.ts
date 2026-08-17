// ── @lib ───────────────────────────────────────────────────────────────────
import { type RefObject, useEffect } from '@lib/react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(',')

export function focusableWithin(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement
  )
}

/**
 * Traps Tab focus inside `ref` while `active`, and restores focus to whatever
 * was focused before on unmount. Required for every modal and the command
 * palette — without it, Tab walks into the editor behind the overlay.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  options: { autoFocus?: boolean; restoreFocus?: boolean } = {}
): void {
  const { autoFocus = true, restoreFocus = true } = options

  useEffect(() => {
    if (!active) return
    const container = ref.current
    if (!container) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    if (autoFocus) {
      // Prefer an explicitly marked element, then the first focusable one, and
      // fall back to the container so screen readers announce the dialog.
      const preferred = container.querySelector<HTMLElement>('[data-autofocus]')
      const target = preferred ?? focusableWithin(container)[0] ?? container
      // Wait a frame so the element exists after the entry animation starts.
      requestAnimationFrame(() => target.focus({ preventScroll: true }))
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return

      const focusable = focusableWithin(container)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0] as HTMLElement
      const last = focusable[focusable.length - 1] as HTMLElement
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', onKeyDown)

    return () => {
      container.removeEventListener('keydown', onKeyDown)
      if (restoreFocus && previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [ref, active, autoFocus, restoreFocus])
}
