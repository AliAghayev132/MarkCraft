// ── @lib ───────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useSyncExternalStore } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { CURSOR_INTERVAL, type CanvasData, type SessionState } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { onMainEvent, sessionService, toast } from '@services'

// ── ./session ──────────────────────────────────────────────────────────────
import { getSelfId, sessionState, setSelfId } from './session-store'

interface Session {
  state: SessionState
  /** Called after every local edit; a no-op when nobody is sharing. */
  publish: (canvas: CanvasData) => void
  /** Called as the pointer moves, throttled to what a screen can show. */
  report: (x: number, y: number) => void
  announce: (ids: string[]) => void
}

/**
 * The canvas's end of a shared session.
 *
 * Everything is a no-op while the session is off, so the canvas can call these
 * unconditionally rather than guarding every edit with "am I sharing" — a check
 * that would have to be right in eleven places instead of one.
 */
export function useSession(onRemoteCanvas: (canvas: CanvasData) => void): Session {
  const state = useSyncExternalStore(
    (listener) => sessionState.subscribe(listener),
    () => sessionState.get()
  )

  /*
   * The callback is read from a ref rather than closed over, so the listener
   * below is registered once. Re-registering it on every canvas change would
   * drop messages in the gap between removing the old one and adding the new.
   */
  const applyRef = useRef(onRemoteCanvas)
  applyRef.current = onRemoteCanvas

  useEffect(() => {
    return onMainEvent('event:session', (event) => {
      switch (event.kind) {
        case 'welcome':
          setSelfId(event.you.id)
          applyRef.current(event.canvas)
          break

        case 'refused':
          sessionState.off(t('session.refusedProtocol'))
          toast.error(t('session.joinFailed'), t('session.refusedProtocol'))
          break

        case 'canvas':
          applyRef.current(event.canvas)
          break

        case 'presence':
          sessionState.present(event.participants, getSelfId())
          break

        default:
          break
      }
    })
  }, [])

  const sharing = state.role !== 'off'

  const publish = useCallback(
    (canvas: CanvasData): void => {
      if (!sharing) return
      void sessionService.canvas(canvas).catch(() => undefined)
    },
    [sharing]
  )

  /*
   * A pointer produces far more moves than anyone can see. Throttled to the
   * interval the protocol names, and the *last* position is always sent when
   * the throttle expires — dropping it would leave someone's cursor stopped
   * wherever the last frame happened to land.
   */
  const pendingRef = useRef<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const report = useCallback(
    (x: number, y: number): void => {
      if (!sharing) return
      pendingRef.current = { x, y }
      if (timerRef.current !== null) return

      timerRef.current = setTimeout(() => {
        timerRef.current = null
        const at = pendingRef.current
        pendingRef.current = null
        if (at) void sessionService.cursor(at.x, at.y).catch(() => undefined)
      }, CURSOR_INTERVAL)
    },
    [sharing]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const announce = useCallback(
    (ids: string[]): void => {
      if (!sharing) return
      void sessionService.selection(ids).catch(() => undefined)
    },
    [sharing]
  )

  return { state, publish, report, announce }
}
