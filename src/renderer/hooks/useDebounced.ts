// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from '@lib/react'

/**
 * Trailing-debounced mirror of a value.
 *
 * The preview is the main consumer: re-rendering a whole document on every
 * keystroke is the single easiest way to make a Markdown editor feel slow, and
 * nobody reads a preview that updates 60 times a second.
 */
export function useDebouncedValue<T>(value: T, delayMs: number, maxWaitMs = 0): T {
  const [debounced, setDebounced] = useState(value)
  const lastEmit = useRef(0)

  useEffect(() => {
    if (value === debounced) return

    /*
     * A plain debounce never fires while the user keeps typing, because every
     * keystroke restarts the timer — so the preview sat still through a whole
     * sentence and only caught up in the pause afterwards. `maxWaitMs` puts a
     * ceiling on that: however fast someone types, the mirror is never staler
     * than this. The short delay still absorbs the per-keystroke burst.
     */
    const now = performance.now()
    if (lastEmit.current === 0) lastEmit.current = now

    const wait =
      maxWaitMs > 0 ? Math.min(delayMs, Math.max(0, lastEmit.current + maxWaitMs - now)) : delayMs

    const timer = window.setTimeout(() => {
      lastEmit.current = performance.now()
      setDebounced(value)
    }, wait)

    return () => window.clearTimeout(timer)
    // `debounced` is deliberately excluded: including it would restart the
    // timer every time the debounced value lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs, maxWaitMs])

  return debounced
}

/** Stable debounced callback. The latest arguments win. */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delayMs: number
): ((...args: A) => void) & { cancel: () => void; flush: (...args: A) => void } {
  const callbackRef = useRef(callback)

  /*
   * Published from an effect rather than assigned while rendering. A render
   * that React discards would otherwise have already overwritten the ref, and
   * the timer below — which fires long after commit — would call a function
   * from a render that never happened.
   */
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  const timerRef = useRef<number | null>(null)

  const api = useMemo(() => {
    const cancel = (): void => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const debounced = (...args: A): void => {
      cancel()
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        callbackRef.current(...args)
      }, delayMs)
    }

    return Object.assign(debounced, {
      cancel,
      flush: (...args: A) => {
        cancel()
        callbackRef.current(...args)
      }
    })
  }, [delayMs])

  useEffect(() => api.cancel, [api])

  return api
}
