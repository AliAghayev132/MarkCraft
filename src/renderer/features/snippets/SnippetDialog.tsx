// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  SNIPPET_PLACEHOLDERS,
  normaliseTrigger,
  validateSnippet,
  type Snippet
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Field, Input, Modal, ModalActions, Textarea } from '@ui'

// ── ./snippets ─────────────────────────────────────────────────────────────
import { saveSnippet, userSnippets } from './snippet-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { SnippetDialogProps } from './types'

/**
 * Writing one snippet.
 *
 * The placeholders are listed under the body rather than hidden in a help
 * page: they are the only part of a snippet that is not just Markdown, and a
 * feature whose syntax has to be looked up elsewhere is one people use once.
 *
 * Clicking a placeholder inserts it, because typing `{{datetime}}` correctly
 * from memory is exactly the kind of small failure that makes somebody decide
 * the feature is broken.
 */
export function SnippetDialog({ snippet, onClose }: SnippetDialogProps): ReactElement {
  const t = useT()

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('')
  const [body, setBody] = useState('')
  const [others, setOthers] = useState<Snippet[]>([])

  useEffect(() => {
    if (!snippet) return
    setName(snippet.name)
    setTrigger(snippet.trigger)
    setBody(snippet.body)
  }, [snippet])

  // Read when the dialog opens: the list cannot change underneath it, and a
  // trigger clash has to be judged against the snippets that already exist.
  useEffect(() => {
    if (snippet) setOthers(userSnippets())
  }, [snippet])

  if (!snippet) return <Modal open={false} onClose={onClose} />

  const draft = { id: snippet.id, name, trigger, body }
  const problem = validateSnippet(draft, others)

  const commit = async (): Promise<void> => {
    if (problem) return
    await saveSnippet({ ...snippet, name, trigger, body })
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t('snippets.editTitle')}
      description={t('snippets.editDescription')}
      footer={
        <ModalActions
          aside={
            problem ? (
              <span className="text-xs text-danger">{t(`snippets.problem.${problem}`)}</span>
            ) : null
          }
        >
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" disabled={problem !== null} onClick={() => void commit()}>
            {t('common.save')}
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('snippets.name')}>
            <Input
              autoFocus
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              placeholder={t('snippets.namePlaceholder')}
            />
          </Field>

          <Field label={t('snippets.trigger')} hint={t('snippets.triggerHint', { trigger: normaliseTrigger(trigger) || '…' })}>
            <Input
              value={trigger}
              monospace
              onChange={(event) => setTrigger(event.currentTarget.value)}
              placeholder="callout"
            />
          </Field>
        </div>

        <Field label={t('snippets.body')}>
          <Textarea
            value={body}
            monospace
            rows={10}
            onChange={(event) => setBody(event.currentTarget.value)}
            placeholder={t('snippets.bodyPlaceholder')}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-tertiary">{t('snippets.placeholders')}</span>
          {SNIPPET_PLACEHOLDERS.map((placeholder) => (
            <button
              key={placeholder}
              type="button"
              onClick={() => setBody((current) => `${current}{{${placeholder}}}`)}
              title={t(`snippets.placeholder.${placeholder}`)}
              className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-secondary transition-colors hover:border-accent hover:text-accent"
            >
              {`{{${placeholder}}}`}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
