// ── @lib ───────────────────────────────────────────────────────────────────
import { Check, Copy, Play } from '@icons'
import { createElement, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { clipboardService, runService } from '@services'

// ── types ──────────────────────────────────────────────────────────────────
import { runnerFor, type RunResult } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { CodeBlockProps } from './types'

/**
 * A fenced code block, with the one affordance every reader wants.
 *
 * The copy button lives in the preview rather than the editor because that is
 * where code is *read*. In the source view the text is already selectable and
 * the caret is already there.
 *
 * The language is shown as a label rather than a picker: this is rendered
 * output, and changing the language belongs in the document, not in a control
 * that would silently disagree with the fence it came from.
 */
export function CodeBlock({ language, text, children }: CodeBlockProps): ReactElement {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [output, setOutput] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)

  /*
   * Offered only for languages something on this machine can actually run, and
   * only ever on a press. Nothing here runs when a document is opened, saved or
   * previewed — the press is the user's decision to trust this block, and it is
   * made one block at a time.
   */
  const runner = runnerFor(language ?? '')

  const run = async (): Promise<void> => {
    setRunning(true)
    try {
      setOutput(await runService.code(language ?? '', text))
    } catch (error) {
      setOutput({
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        durationMs: 0,
        timedOut: false,
        truncated: false
      })
    } finally {
      setRunning(false)
    }
  }

  const copy = (): void => {
    void clipboardService.writeText(text)
    setCopied(true)
    // Long enough to be read, short enough that the button is ready again
    // before anyone tries a second block.
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="mc-code-block group relative">
      <div className="pointer-events-none absolute top-1.5 right-1.5 flex items-center gap-1.5">
        {language ? (
          <span className="rounded bg-inset px-1.5 py-0.5 font-mono text-2xs text-ink-tertiary uppercase">
            {language}
          </span>
        ) : null}

        {runner ? (
          <button
            type="button"
            disabled={running}
            aria-label={t('preview.runCode')}
            onClick={() => void run()}
            className="pointer-events-auto rounded border border-line-subtle bg-surface p-1 text-ink-secondary opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink"
          >
            <Play size={13} />
          </button>
        ) : null}

        <button
          type="button"
          aria-label={copied ? t('preview.copied') : t('preview.copyCode')}
          onClick={copy}
          className="pointer-events-auto rounded border border-line-subtle bg-surface p-1 text-ink-secondary opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink"
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
        </button>
      </div>

      {createElement('pre', null, children)}

      {output ? (
        <div className="mc-run-output" data-failed={output.exitCode !== 0 ? 'true' : undefined}>
          <span className="mc-run-meta">
            {output.timedOut
              ? t('preview.runTimedOut')
              : t('preview.runFinished', { code: output.exitCode ?? -1, ms: output.durationMs })}
          </span>
          {output.stdout ? <pre>{output.stdout}</pre> : null}
          {output.stderr ? <pre className="mc-run-error">{output.stderr}</pre> : null}
        </div>
      ) : null}
    </div>
  )
}
