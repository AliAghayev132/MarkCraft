// ── @lib ───────────────────────────────────────────────────────────────────
import { forwardRef, type ReactElement, type ReactNode } from '@lib/react'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { CardProps, PanelProps, SectionHeadingProps, ToolbarProps } from '@ui/types'

export function Panel({
  title,
  actions,
  children,
  flush = false,
  className,
  bodyClassName
}: PanelProps): ReactElement {
  return (
    <section className={cx('flex min-h-0 min-w-0 flex-col', className)}>
      {title || actions ? (
        <header className="flex h-8 flex-none items-center gap-2 pr-1.5 pl-3">
          {typeof title === 'string' ? (
            <h2 className="min-w-0 flex-1 truncate text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
              {title}
            </h2>
          ) : (
            title
          )}
          {actions ? <div className="flex flex-none items-center gap-px">{actions}</div> : null}
        </header>
      ) : null}

      <div
        className={cx(
          'min-h-0 flex-1 overflow-x-hidden overflow-y-auto',
          flush ? 'p-0' : 'px-1.5 pb-2',
          bodyClassName
        )}
      >
        {children}
      </div>
    </section>
  )
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, interactive, selected, className, onClick, onContextMenu, ariaLabel },
  ref
) {
  return (
    <div
      ref={ref}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      aria-current={selected || undefined}
      className={cx(
        'flex min-w-0 flex-col gap-1 rounded-lg border border-line-subtle bg-surface px-3 py-2',
        interactive &&
          'transition-all duration-100 ease-out hover:border-line-strong hover:shadow-sm active:translate-y-px focus-visible:border-accent focus-visible:shadow-focus focus-visible:outline-none',
        selected && 'border-accent-line bg-selected-muted',
        className
      )}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (!interactive) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
    >
      {children}
    </div>
  )
})

export function Toolbar({ children, ariaLabel, className }: ToolbarProps): ReactElement {
  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      className={cx('flex min-w-0 items-center gap-1 overflow-hidden', className)}
    >
      {children}
    </div>
  )
}

export function ToolbarGroup({
  children,
  className
}: {
  children: ReactNode
  className?: string
}): ReactElement {
  return <div className={cx('flex flex-none items-center gap-px', className)}>{children}</div>
}

/* ── Divider ─────────────────────────────────────────────────────────────── */

export function Divider({
  orientation = 'horizontal',
  className
}: {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}): ReactElement {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cx(
        'flex-none bg-line-subtle',
        orientation === 'vertical' ? 'my-1.5 w-px self-stretch' : 'h-px w-full',
        className
      )}
    />
  )
}

export function Spacer(): ReactElement {
  return <div className="min-w-0 flex-1" />
}

export function SectionHeading({
  children,
  actions,
  className
}: SectionHeadingProps): ReactElement {
  return (
    <div className={cx('flex items-center gap-2 px-1 pt-3 pb-1.5', className)}>
      <span className="min-w-0 flex-1 text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
        {children}
      </span>
      {actions ? <div className="flex flex-none items-center gap-px">{actions}</div> : null}
    </div>
  )
}
