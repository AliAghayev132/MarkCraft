// ── @lib ───────────────────────────────────────────────────────────────────
import { Home, RefreshCw, TriangleAlert } from '@icons'
import { Component, type ErrorInfo, type ReactNode } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button } from '@ui'

// ── types ──────────────────────────────────────────────────────────────────
import type { ErrorScope } from '@components/types'

interface Props {
  children: ReactNode
  /** Identifies which region failed — a key under `errors.scopes`. */
  scope?: ErrorScope
  /** Rendered instead of the default screen — used for inline panel failures. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  onReset?: () => void
}

interface State {
  error: Error | null
  info: ErrorInfo | null
}

/**
 * A render error in one region must not take the whole application down with
 * it. Boundaries sit around the editor, the sidebar and the root: a crashing
 * preview leaves the file tree and the user's unsaved buffers alive.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, info: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info })
    console.error(`[MarkCraft] error in ${this.props.scope ?? 'application'}`, error, info)
  }

  private reset = (): void => {
    this.setState({ error: null, info: null })
    this.props.onReset?.()
  }

  private reload = (): void => {
    window.location.reload()
  }

  override render(): ReactNode {
    const { error, info } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)

    const { scope } = this.props

    return (
      <div className="grid h-full w-full place-items-center overflow-auto bg-app p-8" role="alert">
        <div className="flex max-w-[520px] flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6 shadow-md">
          <div className="grid size-10 place-items-center rounded-lg bg-danger-bg text-danger">
            <TriangleAlert size={22} />
          </div>

          <h1 className="text-lg font-semibold text-ink">{t('errors.boundaryTitle')}</h1>

          <p className="text-base leading-relaxed text-ink-secondary">
            {scope
              ? t('errors.boundaryScoped', { scope: t(`errors.scopes.${scope}`) })
              : t('errors.boundaryGeneric')}{' '}
            {t('errors.boundaryBody')}
          </p>

          <details className="w-full overflow-hidden rounded-md border border-line-subtle bg-inset">
            <summary className="cursor-default px-3 py-2 text-xs text-ink-secondary hover:bg-hover">
              {t('errors.technicalDetails')}
            </summary>
            <pre className="mc-selectable m-0 max-h-[220px] overflow-auto border-t border-line-subtle p-3 text-2xs leading-relaxed break-words whitespace-pre-wrap text-ink-tertiary">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
              {info?.componentStack ? `\n\nComponent stack:${info.componentStack}` : ''}
            </pre>
          </details>

          <div className="mt-1 flex gap-2">
            <Button icon={<Home size={14} />} onClick={this.reset}>
              {t('common.goBack')}
            </Button>
            <Button variant="primary" icon={<RefreshCw size={14} />} onClick={this.reload}>
              {t('errors.reload')}
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
