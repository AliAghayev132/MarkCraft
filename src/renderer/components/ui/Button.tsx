// ── @lib ───────────────────────────────────────────────────────────────────
import { forwardRef } from '@lib/react'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Spinner } from '@ui/Spinner'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { ButtonProps, ButtonSize, ButtonVariant } from '@ui/types'

const BASE =
  'relative inline-flex flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent font-medium transition-colors ' +
  'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:shadow-focus'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-xs hover:bg-accent-hover active:bg-accent-active',
  secondary:
    'bg-surface text-ink border-line shadow-xs hover:bg-hover hover:border-line-strong active:bg-active',
  ghost: 'bg-transparent text-ink-secondary hover:bg-hover hover:text-ink active:bg-active',
  subtle: 'bg-accent-subtle text-accent hover:brightness-97',
  danger: 'bg-danger text-white shadow-xs hover:bg-danger-hover',
  dangerGhost: 'bg-transparent text-danger hover:bg-danger-bg'
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-2 text-xs rounded-sm gap-1',
  md: 'h-control px-3 text-sm',
  lg: 'h-control-lg px-4 text-base'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    iconAfter,
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
    >
      {/*
       * The label keeps its box while loading, so the button does not resize.
       *
       * Icons belong in `icon`/`iconAfter`, not among the children: `truncate`
       * carries `overflow: hidden`, and an `<svg>` — which the reset renders as
       * a block — then lands on its own line above the text and spills out of
       * the button. Three call sites had done exactly that.
       */}
      <span className={cx('inline-flex min-w-0 items-center gap-1.5', loading && 'invisible')}>
        {icon}
        {children ? <span className="truncate">{children}</span> : null}
        {iconAfter}
      </span>

      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size={size === 'lg' ? 16 : 14} />
        </span>
      ) : null}
    </button>
  )
})
