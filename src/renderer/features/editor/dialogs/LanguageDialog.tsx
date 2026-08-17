// ── @lib ───────────────────────────────────────────────────────────────────
import { SquareCode } from '@icons'
import { useMemo, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { fenceAt, rankSlash } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, EmptyState, Modal, ModalActions, SearchInput } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'
import { languageChoices, setFenceLanguageAtCaret } from './language-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { LanguageDialogProps } from './types'

/**
 * Sets the language of the fenced block the caret is in.
 *
 * In the source editor rather than on the rendered block, because the language
 * *is* the fence's info string — a picker floating over the preview would be a
 * control that can disagree with the text it came from. Here it edits the one
 * place the value actually lives.
 */
export function LanguageDialog({ onClose }: LanguageDialogProps): ReactElement {
  const t = useT()
  const [query, setQuery] = useState('')

  const view = editorRegistry.getSourceView()
  const current = useMemo(() => {
    if (!view) return null
    const state = view.state
    return fenceAt(state.doc.toString(), state.doc.lineAt(state.selection.main.head).number - 1)
  }, [view])

  // Ranked rather than filtered, and by the same helper the `/` menu uses, so
  // typing `ts` puts TypeScript first rather than somewhere down the list.
  const matches = useMemo(() => rankSlash(languageChoices(), query), [query])

  const choose = (id: string): void => {
    setFenceLanguageAtCaret(id)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('language.title')}
      description={current?.language ? t('language.current', { name: current.language }) : undefined}
      icon={<SquareCode size={17} />}
      size="sm"
      footer={
        <ModalActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          {/* Clearing is a real choice: a fence with no language is plain text
              and highlights nothing, which is sometimes what is wanted. */}
          <Button variant="secondary" disabled={!current?.language} onClick={() => choose('')}>
            {t('language.clear')}
          </Button>
        </ModalActions>
      }
    >
      {!current ? (
        <EmptyState icon={<SquareCode size={22} />} title={t('language.noFence')} />
      ) : (
        <div className="flex flex-col gap-2">
          <SearchInput
            data-autofocus
            value={query}
            placeholder={t('language.search')}
            aria-label={t('language.search')}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />

          <ul className="m-0 flex max-h-[280px] list-none flex-col gap-0.5 overflow-y-auto p-0">
            {matches.map((choice) => (
              <li key={choice.id}>
                <button
                  type="button"
                  onClick={() => choose(choice.id)}
                  className={cx(
                    'flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                    choice.id === current.language ? 'bg-active text-ink' : 'text-ink-secondary'
                  )}
                >
                  {choice.label}
                  {choice.keywords && choice.keywords.length > 0 ? (
                    <span className="font-mono text-2xs text-ink-tertiary">
                      {choice.keywords.join(' · ')}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}

            {matches.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-ink-tertiary">{t('language.noMatch')}</li>
            ) : null}
          </ul>
        </div>
      )}
    </Modal>
  )
}
