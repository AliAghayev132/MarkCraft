// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { BadgeProps, BadgeTone, EmptyStateProps, KbdProps } from '@ui/types'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps): ReactElement {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-2 px-5 py-8 text-center text-ink-tertiary',
        className
      )}
    >
      {icon ? (
        <div className="mb-px grid size-10 place-items-center rounded-lg bg-hover text-ink-tertiary">
          {icon}
        </div>
      ) : null}

      <div className="text-sm font-medium text-ink-secondary">{title}</div>
      {description ? (
        <div className="max-w-[30ch] text-xs leading-normal">{description}</div>
      ) : null}
      {action ? <div className="mt-1.5">{action}</div> : null}
    </div>
  )
}

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-active text-ink-secondary',
  accent: 'bg-accent-subtle text-accent',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger'
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps): ReactElement {
  return (
    <span
      className={cx(
        'inline-flex h-[18px] flex-none items-center gap-1 rounded-full px-1.5 text-2xs font-medium',
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/* ── Keycap ──────────────────────────────────────────────────────────────── */

const IS_MAC = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')

const KEY_SYMBOLS: Record<string, string> = {
  mod: IS_MAC ? '⌘' : 'Ctrl',
  cmd: '⌘',
  ctrl: 'Ctrl',
  alt: IS_MAC ? '⌥' : 'Alt',
  shift: IS_MAC ? '⇧' : 'Shift',
  enter: '↵',
  escape: 'Esc',
  esc: 'Esc',
  backspace: '⌫',
  delete: 'Del',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  tab: '⇥',
  space: 'Space'
}

export function Kbd({ keys, className }: KbdProps): ReactElement {
  const parts = keys.split('+').map((part) => {
    const key = part.trim().toLowerCase()
    return KEY_SYMBOLS[key] ?? part.trim().toUpperCase()
  })

  return (
    <span
      className={cx('inline-flex gap-px whitespace-nowrap font-ui text-2xs text-ink-tertiary', className)}
      aria-label={keys}
    >
      {parts.map((part, index) => (
        <kbd
          key={`${part}-${index}`}
          className="inline-grid h-[17px] min-w-[17px] place-items-center rounded-xs border border-b-2 border-line-subtle bg-active px-1 text-[10px] font-medium text-ink-secondary"
        >
          {part}
        </kbd>
      ))}
    </span>
  )
}
