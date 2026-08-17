// ── @lib ───────────────────────────────────────────────────────────────────
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from '@icons'
import { createPortal, useEffect, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { toastDismissed, useAppDispatch, useAppSelector } from '@store'
import { releaseCallback, runCallback } from '@store/callbacks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton } from '@ui/IconButton'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { Toast, ToastTone } from '@store/slices/types'

const TONE_ICON: Record<ToastTone, ReactElement> = {
  success: <CheckCircle2 size={15} />,
  info: <Info size={15} />,
  warning: <AlertTriangle size={15} />,
  danger: <XCircle size={15} />
}

const TONE_STYLES: Record<ToastTone, { rail: string; icon: string }> = {
  success: { rail: 'border-l-success', icon: 'text-success' },
  info: { rail: 'border-l-info', icon: 'text-info' },
  warning: { rail: 'border-l-warning', icon: 'text-warning' },
  danger: { rail: 'border-l-danger', icon: 'text-danger' }
}

/**
 * In-app notification surface.
 *
 * OS notifications are deliberately not used for routine feedback: they are
 * disruptive, unstyleable, and disappear into a system tray the user is not
 * looking at while writing.
 */
export function ToastViewport(): ReactElement | null {
  const toasts = useAppSelector((state) => state.toasts.items)
  const overlayRoot = document.getElementById('overlay-root')
  if (!overlayRoot) return null

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 bottom-[calc(var(--mc-statusbar-height)+16px)] z-toast flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>,
    overlayRoot
  )
}

function ToastCard({ toast }: { toast: Toast }): ReactElement {
  const dispatch = useAppDispatch()
  const t = useT()
  const tone = TONE_STYLES[toast.tone]

  const dismiss = (): void => {
    releaseCallback(toast.action?.callbackId)
    dispatch(toastDismissed(toast.id))
  }

  useEffect(() => {
    if (toast.duration <= 0) return
    const timer = window.setTimeout(() => {
      releaseCallback(toast.action?.callbackId)
      dispatch(toastDismissed(toast.id))
    }, toast.duration)

    return () => window.clearTimeout(timer)
  }, [toast.id, toast.duration, toast.action?.callbackId, dispatch])

  return (
    <div
      className={cx(
        'pointer-events-auto flex animate-slide-up items-start gap-2 rounded-lg border border-line border-l-[3px] bg-raised p-3 shadow-lg',
        tone.rail
      )}
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      aria-live={toast.tone === 'danger' ? 'assertive' : 'polite'}
    >
      <span className={cx('mt-px grid flex-none place-items-center', tone.icon)}>
        {TONE_ICON[toast.tone]}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-sm font-medium leading-normal text-ink">{toast.title}</div>

        {toast.description ? (
          <div className="mc-selectable text-xs leading-normal break-words text-ink-secondary">
            {toast.description}
          </div>
        ) : null}

        {toast.action ? (
          <button
            type="button"
            className="mt-1 self-start rounded-xs text-xs font-medium text-accent hover:underline"
            onClick={() => {
              runCallback(toast.action?.callbackId)
              dismiss()
            }}
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>

      <IconButton
        icon={<X size={13} />}
        label={t('common.dismiss')}
        size="sm"
        tooltip={false}
        className="-mt-0.5 -mr-0.5 flex-none"
        onClick={dismiss}
      />
    </div>
  )
}
