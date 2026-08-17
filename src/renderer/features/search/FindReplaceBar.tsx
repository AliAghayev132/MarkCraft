// ── @lib ───────────────────────────────────────────────────────────────────
import {
  SearchQuery,
  findNext,
  findPrevious,
  replaceAll,
  replaceNext,
  setSearchQuery,
  type EditorView
} from '@lib/editor/codemirror'
import {
  ArrowDown,
  ArrowUp,
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  Regex,
  WholeWord,
  X
} from '@icons'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, Input } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { FindReplaceBarProps } from './types'

const TEXT_BUTTON =
  'h-control-sm rounded-sm border border-line bg-surface px-2 text-xs text-ink-secondary transition-colors ' +
  'hover:not-disabled:bg-hover hover:not-disabled:text-ink disabled:opacity-45'

/**
 * In-document find and replace.
 *
 * CodeMirror's search *state* does the work — match highlighting, the query
 * cursor and correct position mapping through edits — while the panel itself is
 * ours, because the built-in one is foreign UI.
 */
export function FindReplaceBar({
  open,
  showReplace,
  onToggleReplace,
  onClose,
  documentText
}: FindReplaceBarProps): ReactElement | null {
  const t = useT()

  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  /* Push the query into CodeMirror whenever it or its options change. */
  useEffect(() => {
    const view = editorRegistry.getSourceView()
    if (!view || !open) return

    try {
      view.dispatch({
        effects: setSearchQuery.of(
          new SearchQuery({
            search: query,
            caseSensitive,
            regexp: regex,
            wholeWord,
            replace: replacement
          })
        )
      })
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Invalid pattern')
    }
  }, [query, replacement, caseSensitive, wholeWord, regex, open])

  useEffect(() => {
    if (!open) return

    // Seed from the selection, then select it so typing replaces it.
    const view = editorRegistry.getSourceView()
    const selected = view
      ? view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)
      : ''
    if (selected && !selected.includes('\n')) setQuery(selected)

    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [open])

  const matchCount = useMemo(() => {
    if (!query) return 0
    try {
      const source = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const wrapped = wholeWord ? `\\b(?:${source})\\b` : source
      return (documentText.match(new RegExp(wrapped, caseSensitive ? 'g' : 'gi')) ?? []).length
    } catch {
      return 0
    }
  }, [query, regex, wholeWord, caseSensitive, documentText])

  const withView = useCallback((action: (view: EditorView) => void) => {
    const view = editorRegistry.getSourceView()
    if (view) action(view)
  }, [])

  const next = (): void =>
    withView((view) => {
      findNext(view)
      view.focus()
    })

  const previous = (): void =>
    withView((view) => {
      findPrevious(view)
      view.focus()
    })

  if (!open) return null

  return (
    <div
      className="flex flex-none animate-slide-down items-start gap-1 border-b border-line-subtle bg-sunken px-2 py-1.5"
      role="search"
      aria-label={t('find.label')}
    >
      <IconButton
        icon={showReplace ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        label={t(showReplace ? 'find.hideReplace' : 'find.showReplace')}
        size="sm"
        onClick={() => onToggleReplace(!showReplace)}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Input
            ref={inputRef}
            size="sm"
            className="min-w-[120px] max-w-[340px] flex-1"
            placeholder={t('find.find')}
            value={query}
            invalid={Boolean(error)}
            aria-label={t('find.find')}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                if (event.shiftKey) previous()
                else next()
              } else if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
              }
            }}
          />

          <span
            className={cx(
              'min-w-[76px] flex-none truncate text-2xs tabular-nums',
              error ? 'text-danger' : 'text-ink-tertiary'
            )}
          >
            {error ? error : query ? t('common.matches', { count: matchCount }) : ''}
          </span>

          <div className="flex flex-none items-center gap-px">
            <IconButton
              icon={<CaseSensitive size={13} />}
              label={t('find.matchCase')}
              size="sm"
              active={caseSensitive}
              onClick={() => setCaseSensitive((value) => !value)}
            />
            <IconButton
              icon={<WholeWord size={13} />}
              label={t('find.matchWholeWord')}
              size="sm"
              active={wholeWord}
              onClick={() => setWholeWord((value) => !value)}
            />
            <IconButton
              icon={<Regex size={13} />}
              label={t('find.useRegex')}
              size="sm"
              active={regex}
              onClick={() => setRegex((value) => !value)}
            />
          </div>

          <div className="flex flex-none items-center gap-px">
            <IconButton
              icon={<ArrowUp size={13} />}
              label={t('find.previousMatch')}
              shortcut="shift+enter"
              size="sm"
              disabled={matchCount === 0}
              onClick={previous}
            />
            <IconButton
              icon={<ArrowDown size={13} />}
              label={t('find.nextMatch')}
              shortcut="enter"
              size="sm"
              disabled={matchCount === 0}
              onClick={next}
            />
          </div>
        </div>

        {showReplace ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <Input
              size="sm"
              className="min-w-[120px] max-w-[340px] flex-1"
              placeholder={t('find.replace')}
              value={replacement}
              aria-label={t('find.replaceWith')}
              onChange={(event) => setReplacement(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  withView(replaceNext)
                } else if (event.key === 'Escape') {
                  event.preventDefault()
                  onClose()
                }
              }}
            />

            <div className="flex flex-none items-center gap-1">
              <button
                type="button"
                className={TEXT_BUTTON}
                disabled={matchCount === 0}
                onClick={() => withView(replaceNext)}
              >
                {t('find.replace')}
              </button>
              <button
                type="button"
                className={TEXT_BUTTON}
                disabled={matchCount === 0}
                onClick={() => withView(replaceAll)}
              >
                {t('find.replaceAll')}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <IconButton icon={<X size={14} />} label={t('find.closeFind')} size="sm" onClick={onClose} />
    </div>
  )
}
