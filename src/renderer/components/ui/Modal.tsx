// ── @lib ───────────────────────────────────────────────────────────────────
import { X } from '@icons'
import { createPortal, useId, useRef, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useEscapeKey, useFocusTrap, useScrollLock } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton } from '@ui/IconButton'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { ModalActionsProps, ModalIconTone, ModalProps, ModalSectionProps, ModalSize } from '@ui/types'

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[520px]',
  lg: 'max-w-[720px]',
  xl: 'max-w-[960px]',
  '2xl': 'max-w-[1100px]'
}

const ICON_TONES: Record<ModalIconTone, string> = {
  accent: 'bg-accent-subtle text-accent',
  danger: 'bg-danger-bg text-danger',
  warning: 'bg-warning-bg text-warning',
  info: 'bg-info-bg text-info'
}

/**
 * The application's only dialog surface.
 *
 * Native `alert`/`confirm`/`prompt` are never used — every one of those flows is
 * a `Modal` with real focus management, an escape key, a backdrop and
 * design-system styling.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  iconTone = 'accent',
  size = 'md',
  footer,
  children,
  closeOnBackdrop = true,
  showCloseButton = true,
  className,
  bodyClassName
}: ModalProps): ReactElement | null {
  const t = useT()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEscapeKey(open, onClose)
  useFocusTrap(panelRef, open)
  useScrollLock(open)

  const overlayRoot = document.getElementById('overlay-root')
  if (!open || !overlayRoot) return null

  return createPortal(
    <div
      className="fixed inset-0 z-modal-backdrop flex animate-fade-in items-center justify-center bg-overlay px-4 py-8 backdrop-blur-[2px]"
      /*
       * A portal draws somewhere else but still reports its events to the React
       * tree that rendered it. For a dialog opened from inside an interactive
       * surface — the canvas, say — that means the surface sees a press meant
       * for the dialog, and a surface that captures the pointer on press takes
       * the release with it: the button lights up and then nothing happens.
       *
       * A dialog is its own surface, so nothing behind it hears anything that
       * happens inside it.
       */
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onMouseDown={(event) => {
        event.stopPropagation()

        // Only a press that both starts and ends on the backdrop dismisses, so
        // dragging a selection out of the dialog does not close it.
        if (event.target !== event.currentTarget) return
        if (closeOnBackdrop) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cx(
          'relative z-modal flex max-h-full w-full animate-scale-in flex-col overflow-hidden',
          'rounded-xl border border-line bg-raised shadow-lg',
          SIZES[size],
          className
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {title || showCloseButton ? (
          <header className="flex flex-none items-start gap-3 px-5 pt-5 pb-3">
            {icon ? (
              <div
                className={cx(
                  'grid size-8 flex-none place-items-center rounded-lg',
                  ICON_TONES[iconTone]
                )}
              >
                {icon}
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-px">
              {title ? (
                <h2 id={titleId} className="text-md font-semibold leading-tight text-ink">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descriptionId} className="text-sm leading-normal text-ink-secondary">
                  {description}
                </p>
              ) : null}
            </div>

            {showCloseButton ? (
              <IconButton
                icon={<X size={15} />}
                label={t('common.close')}
                size="sm"
                onClick={onClose}
                tooltip={false}
                className="-mt-0.5 -mr-1 flex-none"
              />
            ) : null}
          </header>
        ) : null}

        {children ? (
          <div className={cx('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4', bodyClassName)}>
            {children}
          </div>
        ) : null}

        {footer ? (
          <footer className="flex-none border-t border-line-subtle bg-sunken px-5 py-3">{footer}</footer>
        ) : null}
      </div>
    </div>,
    overlayRoot
  )
}

export function ModalActions({ children, aside }: ModalActionsProps): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4">
      {aside ? <div className="min-w-0 flex-1 text-xs text-ink-tertiary">{aside}</div> : null}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  )
}

export function ModalSection({ title, children, className }: ModalSectionProps): ReactElement {
  return (
    <section className={cx('flex flex-col gap-2', className)}>
      {title ? (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-tertiary">{title}</h3>
      ) : null}
      {children}
    </section>
  )
}
