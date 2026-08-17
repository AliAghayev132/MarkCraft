// ── @lib ───────────────────────────────────────────────────────────────────
import { forwardRef } from '@lib/react'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Tooltip } from '@ui/Tooltip'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { IconButtonProps, IconButtonSize, IconButtonVariant } from '@ui/types'

const BASE =
  'inline-grid flex-none place-items-center rounded-sm border border-transparent text-ink-secondary ' +
  'transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:shadow-focus'

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent hover:bg-hover hover:text-ink active:bg-active',
  subtle: 'bg-hover hover:bg-active hover:text-ink',
  solid: 'bg-accent text-on-accent hover:bg-accent-hover',
  danger: 'bg-transparent hover:bg-danger-bg hover:text-danger'
}

const SIZES: Record<IconButtonSize, string> = {
  sm: 'size-[22px]',
  md: 'size-7',
  lg: 'size-[34px] rounded-md'
}

/** Toggled state, kept distinct from hover so both can be read at a glance. */
const ACTIVE = 'bg-accent-subtle text-accent hover:bg-accent-subtle hover:text-accent'

/**
 * The single icon-button implementation used everywhere.
 *
 * Bundling the tooltip and the accessible name into one component is what stops
 * icon-only controls from silently shipping without either.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    active = false,
    shortcut,
    tooltip = true,
    tooltipPlacement = 'bottom-start',
    className,
    disabled,
    ...rest
  },
  ref
) {
  const button = (
    <button
      {...rest}
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-pressed={rest['aria-pressed'] ?? (active ? true : undefined)}
      className={cx(BASE, VARIANTS[variant], SIZES[size], active && ACTIVE, className)}
    >
      {icon}
    </button>
  )

  if (!tooltip || disabled) return button

  return (
    <Tooltip content={label} shortcut={shortcut} placement={tooltipPlacement}>
      {button}
    </Tooltip>
  )
})
