// ── @lib ───────────────────────────────────────────────────────────────────
import { Sparkles } from '@icons'
import { useEffect, useRef, useSyncExternalStore } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { clipboardService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Modal, ModalActions, Spinner, Textarea } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import {
  activeProfileName,
  aiRun,
  applyAi,
  cancelAi,
  closeAi,
  retryAi,
  send,
  setInstruction
} from './ai-actions'

/**
 * Everything the assistant says, and every decision about it, in one place.
 *
 * The dialog is deliberately the only surface: a model's output is a *proposal*
 * until the user accepts it, and giving it its own reviewable space is what
 * separates this from an editor that silently rewrites your prose.
 */
export function AiDialog(): React.ReactElement | null {
  const t = useT()
  const run = useSyncExternalStore(
    (listener) => aiRun.subscribe(listener),
    () => aiRun.get()
  )
  const confirmBeforeRun = useAppSelector((state) => state.settings.values.ai.confirmBeforeRun)
  const outputRef = useRef<HTMLPreElement>(null)

  // Follow the answer as it arrives, the way a terminal does.
  useEffect(() => {
    const node = outputRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [run.output])

  if (run.phase === 'idle') return null

  const scope = run.target?.scope === 'selection' ? t('ai.scopeSelection') : t('ai.scopeDocument')
  const streaming = run.phase === 'streaming'
  const done = run.phase === 'done'

  return (
    <Modal
      open
      onClose={closeAi}
      icon={<Sparkles size={18} />}
      title={t(`ai.action.${run.action}`)}
      description={t('ai.subtitle', { scope, model: activeProfileName() })}
      size="lg"
      closeOnBackdrop={!streaming}
      footer={
        <ModalActions>
          {streaming ? (
            <Button variant="ghost" onClick={cancelAi}>
              {t('common.cancel')}
            </Button>
          ) : (
            <Button variant="ghost" onClick={closeAi}>
              {t('common.close')}
            </Button>
          )}

          {run.phase === 'confirm' ? (
            <Button
              variant="primary"
              disabled={run.action === 'custom' && run.instruction.trim() === ''}
              onClick={() => void send()}
            >
              {t('ai.send')}
            </Button>
          ) : null}

          {run.phase === 'error' ? (
            <Button variant="secondary" onClick={retryAi}>
              {t('ai.retry')}
            </Button>
          ) : null}

          {done ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  void clipboardService.writeText(run.output.trim())
                  toast.success(t('ai.copied'))
                }}
              >
                {t('common.copy')}
              </Button>
              {/* A review is findings, not a document. Offering "replace"
                  would put the critique where the writing was. */}
              {run.action === 'review' ? (
                <Button variant="primary" onClick={closeAi}>
                  {t('common.done')}
                </Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => applyAi('insert') && closeAi()}>
                    {t('ai.insertBelow')}
                  </Button>
                  <Button variant="primary" onClick={() => applyAi('replace') && closeAi()}>
                    {t('ai.replace')}
                  </Button>
                </>
              )}
            </>
          ) : null}
        </ModalActions>
      }
    >
      {run.phase === 'confirm' ? (
        <div className="flex flex-col gap-3">
          {run.action === 'custom' ? (
            <Textarea
              autoFocus
              rows={3}
              value={run.instruction}
              placeholder={t('ai.instructionPlaceholder')}
              onChange={(event) => setInstruction(event.target.value)}
            />
          ) : null}

          <p className="text-xs text-ink-secondary">
            {confirmBeforeRun ? t('ai.confirmNotice') : t('ai.customNotice')}
          </p>

          <pre className="max-h-64 overflow-auto rounded-md border border-line-subtle bg-surface-sunken p-3 text-xs whitespace-pre-wrap text-ink-secondary">
            {run.target?.text ?? ''}
          </pre>
        </div>
      ) : null}

      {run.phase === 'error' ? (
        <p className="text-sm text-danger">{run.error}</p>
      ) : null}

      {streaming || done ? (
        <div className="flex flex-col gap-2">
          {streaming ? (
            <div className="flex items-center gap-2 text-xs text-ink-secondary">
              <Spinner size={14} />
              {t('ai.working')}
            </div>
          ) : null}

          <pre
            ref={outputRef}
            className="max-h-[22rem] min-h-[8rem] overflow-auto rounded-md border border-line-subtle bg-surface-sunken p-3 text-sm whitespace-pre-wrap text-ink"
          >
            {run.output}
          </pre>
        </div>
      ) : null}
    </Modal>
  )
}
