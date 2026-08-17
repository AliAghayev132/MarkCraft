// ── @lib ───────────────────────────────────────────────────────────────────
import { loadMermaid } from '@lib/markdown/mermaid'
import { useEffect, useId, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { resolveTheme, useAppSelector } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { parseSvg, renderSvg } from '@features/icons'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { MermaidDiagramProps } from './types'

/**
 * A ```mermaid fence, rendered as a diagram.
 *
 * Mermaid returns an SVG *string*, and this application has no `innerHTML`
 * sink — so the markup is parsed and rebuilt as React elements against the
 * diagram allowlist, the same mechanism imported icons go through. Mermaid is
 * configured with `htmlLabels: false` precisely so its output stays inside that
 * allowlist.
 *
 * Rendering is asynchronous because the engine is loaded on demand; the fence's
 * source is shown until it arrives, which is also what a reader sees if the
 * diagram does not parse.
 */
export function MermaidDiagram({ code }: MermaidDiagramProps): ReactElement {
  const t = useT()
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')

  const dark = useAppSelector(
    (state) => resolveTheme(state.settings.values, state.settings.systemPrefersDark) === 'dark'
  )

  const [svg, setSvg] = useState<ReturnType<typeof parseSvg>>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const draw = async (): Promise<void> => {
      try {
        const mermaid = await loadMermaid({
          dark,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif'
        })

        // Mermaid validates before rendering, which is how a half-typed
        // diagram stays a code block instead of throwing on every keystroke.
        await mermaid.parse(code)
        const { svg: markup } = await mermaid.render(`mc-mermaid-${id}`, code)

        if (cancelled) return
        setSvg(parseSvg(markup, 'diagram'))
        setError(null)
      } catch (cause) {
        if (cancelled) return
        setSvg(null)
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    }

    void draw()
    return () => {
      cancelled = true
    }
  }, [code, dark, id])

  if (svg) {
    return (
      <figure className="mc-mermaid my-4 flex justify-center overflow-x-auto">
        {renderSvg(svg, { className: 'max-w-full' })}
      </figure>
    )
  }

  return (
    <figure className="my-4">
      <pre
        className={cx(
          'overflow-x-auto rounded-lg border p-3 text-xs',
          error ? 'border-danger-border bg-danger-bg' : 'border-line-subtle bg-sunken'
        )}
      >
        <code>{code}</code>
      </pre>
      <figcaption className="mt-1 text-2xs text-ink-tertiary">
        {error ? t('preview.diagramFailed') : t('preview.diagramLoading')}
      </figcaption>
    </figure>
  )
}
