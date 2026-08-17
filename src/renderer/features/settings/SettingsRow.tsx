// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement, ReactNode } from '@lib/react'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Field } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { SettingsRowProps } from './types'

/**
 * One setting.
 *
 * Wrapping every control gives search something concrete to point at: a hit is
 * drawn with an accent ring and a tinted ground, so after searching the user
 * can see *which* control matched rather than being dropped on a page and left
 * to hunt for it.
 */
export function SettingsRow({
  id,
  label,
  hint,
  layout = 'inline',
  highlighted = false,
  children
}: SettingsRowProps): ReactElement {
  return (
    <div
      data-setting={id}
      className={cx(
        'rounded-lg border transition-colors',
        highlighted
          ? 'border-accent bg-accent-subtle px-3 py-2 shadow-[0_0_0_1px_var(--mc-accent-border)]'
          : 'border-transparent'
      )}
    >
      <Field label={label} hint={hint} layout={layout}>
        {children}
      </Field>
    </div>
  )
}

/**
 * A group of rows under a heading, used when search results span sections.
 */
export function SettingsGroup({
  title,
  children
}: {
  title?: string
  children: ReactNode
}): ReactElement {
  return (
    <section className="flex flex-col gap-3">
      {title ? (
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  )
}
