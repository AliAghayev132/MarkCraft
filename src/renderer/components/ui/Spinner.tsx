// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { LoadingBlockProps, ProgressProps, SkeletonProps, SpinnerProps } from '@ui/types'

export function Spinner({ size = 16, className, label }: SpinnerProps): ReactElement {
  return (
    <span
      className={cx(
        'inline-block flex-none animate-spin rounded-full border-solid border-line-strong border-t-accent',
        className
      )}
      style={{ width: size, height: size, borderWidth: Math.max(1.5, size / 10) }}
      role={label ? 'status' : 'presentation'}
      aria-label={label}
    />
  )
}

export function Skeleton({
  width = '100%',
  height = 14,
  radius = 'var(--mc-radius-sm)',
  className
}: SkeletonProps): ReactElement {
  return (
    <span
      className={cx('block animate-shimmer bg-[length:420px_100%]', className)}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundImage:
          'linear-gradient(90deg, var(--mc-bg-hover) 25%, var(--mc-bg-active) 37%, var(--mc-bg-hover) 63%)'
      }}
      aria-hidden="true"
    />
  )
}

export function Progress({ value, label, className }: ProgressProps): ReactElement {
  const indeterminate = value === undefined

  return (
    <div
      className={cx('h-1 w-full overflow-hidden rounded-full bg-active', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(value * 100)}
    >
      <div
        className={cx(
          'h-full rounded-[inherit] bg-accent transition-[width] duration-200 ease-out',
          indeterminate && 'w-[35%] animate-[mc-indeterminate_1.1s_var(--mc-ease-in-out)_infinite]'
        )}
        style={indeterminate ? undefined : { width: `${Math.min(1, Math.max(0, value)) * 100}%` }}
      />
    </div>
  )
}

/** Centred spinner for panels waiting on a filesystem round-trip. */
export function LoadingBlock({ message, className }: LoadingBlockProps): ReactElement {
  const t = useT()

  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-3 px-4 py-10 text-xs text-ink-tertiary',
        className
      )}
    >
      <Spinner size={20} />
      <span>{message ?? t('common.loading')}</span>
    </div>
  )
}
