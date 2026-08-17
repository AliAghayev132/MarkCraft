// ── @lib ───────────────────────────────────────────────────────────────────
import { memo, type ReactElement } from '@lib/react'

// ── @components ────────────────────────────────────────────────────────────
import { Logo } from './Logo'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { LogoSize, WordmarkProps } from './types'

const TEXT_SIZES: Record<LogoSize, string> = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl tracking-[-0.025em] text-ink'
}

/** The mark plus the product name, as used in the title bar and start screen. */
export const Wordmark = memo(function Wordmark({
  size = 'sm',
  markOnly = false,
  className
}: WordmarkProps): ReactElement {
  return (
    <span className={cx('inline-flex min-w-0 items-center gap-1.5', className)}>
      <Logo size={size} labelled={markOnly} />

      {markOnly ? null : (
        <span
          className={cx(
            'font-semibold whitespace-nowrap tracking-[-0.01em] text-ink-secondary',
            TEXT_SIZES[size]
          )}
        >
          Mark
          <span className={cx('font-medium', size === 'xl' ? 'text-ink-secondary' : 'text-ink-tertiary')}>
            Craft
          </span>
        </span>
      )}
    </span>
  )
})
