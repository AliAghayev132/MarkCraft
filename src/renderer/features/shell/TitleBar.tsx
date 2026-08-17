// ── @lib ───────────────────────────────────────────────────────────────────
import { Copy, Minus, Square, X } from '@icons'
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { WindowState } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { onMainEvent, windowService } from '@services'

// ── @components ────────────────────────────────────────────────────────────
import { Wordmark } from '@components'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { TitleBarProps } from './types'

const WINDOW_BUTTON =
  'grid h-full w-11 place-items-center text-ink-secondary transition-colors duration-75 ' +
  'hover:bg-hover hover:text-ink active:bg-active focus-visible:shadow-[inset_0_0_0_2px_var(--mc-accent)] focus-visible:outline-none'

/**
 * The application draws its own title bar.
 *
 * The window is created with `frame: false`, so minimise / maximise / close are
 * ours to implement — and the whole bar is a drag region except the interactive
 * controls, which opt out via `.mc-no-drag`.
 */
export function TitleBar({ children, actions }: TitleBarProps): ReactElement {
  const t = useT()
  const [state, setState] = useState<WindowState>({
    maximized: false,
    fullScreen: false,
    focused: true
  })

  useEffect(() => {
    void windowService.getState().then(setState)
    return onMainEvent('event:windowState', setState)
  }, [])

  const isMac = navigator.platform.toLowerCase().includes('mac')

  return (
    <header
      className={cx(
        'mc-drag-region relative z-titlebar flex h-titlebar flex-none items-center gap-3 border-b border-line-subtle bg-app',
        // macOS keeps its own traffic lights; leave room for them.
        isMac ? 'pl-[78px]' : 'pl-3',
        !state.focused && 'text-ink-tertiary'
      )}
    >
      <Wordmark size="xs" className={cx('flex-none', !state.focused && 'opacity-70')} />

      <div className="flex min-w-0 flex-1 items-center justify-center px-3">{children}</div>

      <div className="mc-no-drag flex h-full flex-none items-center gap-1 pl-1.5">
        {actions}

        {!isMac ? (
          <div className="ml-1.5 flex h-full items-stretch">
            <button
              type="button"
              className={WINDOW_BUTTON}
              aria-label={t('titleBar.minimize')}
              onClick={() => void windowService.minimize()}
            >
              <Minus size={14} strokeWidth={1.8} />
            </button>

            <button
              type="button"
              className={WINDOW_BUTTON}
              aria-label={state.maximized ? t('titleBar.restore') : t('titleBar.maximize')}
              onClick={() => void windowService.toggleMaximize()}
            >
              {state.maximized ? (
                /* The restore glyph is a mirrored "copy" icon so both squares
                   read the right way round. */
                <Copy size={11.5} strokeWidth={1.8} className="-scale-x-100" />
              ) : (
                <Square size={11.5} strokeWidth={1.8} />
              )}
            </button>

            <button
              type="button"
              className={cx(
                WINDOW_BUTTON,
                'hover:bg-[#d13a30] hover:text-white active:bg-[#b83229] active:text-white'
              )}
              aria-label={t('titleBar.close')}
              onClick={() => void windowService.close()}
            >
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

export function TitleBarDocumentLabel({
  title,
  subtitle,
  dirty
}: {
  title: string
  subtitle?: string
  dirty?: boolean
}): ReactElement {
  const t = useT()

  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="inline-flex items-center gap-1.5 truncate text-sm font-medium text-ink">
        {title}
        {dirty ? (
          <span
            className="size-1.5 flex-none rounded-full bg-dot-dirty"
            aria-label={t('titleBar.unsavedChanges')}
          />
        ) : null}
      </span>

      {subtitle ? (
        <span className="max-w-[40ch] truncate text-xs text-ink-tertiary">{subtitle}</span>
      ) : null}
    </div>
  )
}
