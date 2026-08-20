// ── @lib ───────────────────────────────────────────────────────────────────
import {
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  Regex,
  Replace,
  Search,
  WholeWord,
  X
} from '@icons'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { replacementFor } from '@shared'
import type { WorkspaceSearchResponse } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { isServiceError, searchService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectWorkspaceRoot, useAppSelector } from '@store'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useDebouncedValue } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, EmptyState, IconButton, Input, SearchInput, Spinner, dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { openPath } from '@features/documents'
import { FileResult } from './SearchResults'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { SearchPanelProps } from './types'

const MAX_FILE_MATCHES = 60
const MAX_TOTAL_MATCHES = 3000

/**
 * Workspace-wide search and replace.
 *
 * The scan runs in the main process and streams back a bounded result set — the
 * renderer never walks the filesystem, and the caps are surfaced rather than
 * silently truncating.
 */
export function SearchPanel({ homePath, onRevealMatch }: SearchPanelProps): ReactElement {
  const t = useT()
  const root = useAppSelector(selectWorkspaceRoot)

  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)
  const [include, setInclude] = useState('')
  const [exclude, setExclude] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [response, setResponse] = useState<WorkspaceSearchResponse | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const debouncedQuery = useDebouncedValue(query, 280)
  const requestId = useRef(0)

  const run = useCallback(
    async (searchQuery: string) => {
      if (!root || searchQuery.trim().length === 0) {
        setResponse(null)
        setError(null)
        return
      }

      const id = ++requestId.current
      setRunning(true)
      setError(null)

      try {
        const result = await searchService.workspace({
          root,
          query: searchQuery,
          caseSensitive,
          wholeWord,
          regex,
          include,
          exclude,
          maxFileMatches: MAX_FILE_MATCHES,
          maxTotalMatches: MAX_TOTAL_MATCHES
        })
        // A slower earlier request must never overwrite a newer result.
        if (id !== requestId.current) return
        setResponse(result)
      } catch (caught) {
        if (id !== requestId.current) return
        setError(isServiceError(caught) ? caught.message : String(caught))
        setResponse(null)
      } finally {
        if (id === requestId.current) setRunning(false)
      }
    },
    [root, caseSensitive, wholeWord, regex, include, exclude]
  )

  useEffect(() => {
    void run(debouncedQuery)
  }, [debouncedQuery, run])

  /*
   * What each match will become, or null while nothing is being replaced.
   * Built from the same code the main process will run, so the preview cannot
   * disagree with the outcome — a preview that lies about a destructive
   * operation is worse than no preview at all.
   */
  const preview = useMemo(() => {
    if (!showReplace || query === '') return null
    return (matched: string): string =>
      replacementFor(matched, query, replacement, { caseSensitive, wholeWord, regex })
  }, [showReplace, query, replacement, caseSensitive, wholeWord, regex])

  const onReplaceAll = async (): Promise<void> => {
    if (!root || !response || response.results.length === 0) return

    const confirmed = await dialogs.confirm({
      title: t('search.replaceConfirmTitle', {
        files: t('common.files', { count: response.results.length })
      }),
      message: t('search.replaceConfirmBody', {
        occurrences: t('common.occurrences', { count: response.totalMatches }),
        query,
        replacement
      }),
      confirmLabel: t('search.replaceConfirmAction'),
      tone: 'danger'
    })
    if (!confirmed) return

    try {
      const result = await searchService.replace({
        root,
        query,
        replacement,
        caseSensitive,
        wholeWord,
        regex,
        include,
        exclude,
        files: response.results.map((entry) => entry.path),
        maxFileMatches: MAX_FILE_MATCHES,
        maxTotalMatches: MAX_TOTAL_MATCHES
      })

      const detail = t('search.replacedDetail', {
        files: t('common.files', { count: result.filesChanged })
      })

      toast.success(
        t('search.replaced', {
          occurrences: t('common.occurrences', { count: result.replacements })
        }),
        result.skipped.length > 0
          ? `${detail} · ${t('search.replacedSkipped', { count: result.skipped.length })}`
          : detail
      )
      void run(query)
    } catch (caught) {
      toast.error(
        t('search.replaceFailed'),
        isServiceError(caught) ? caught.message : String(caught)
      )
    }
  }

  const toggleFile = (path: string): void => {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  if (!root) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <EmptyState
          title={t('search.noFolderTitle')}
          description={t('search.noFolderDescription')}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none flex-col gap-1.5 p-2">
        <div className="flex min-w-0 items-center gap-1">
          <IconButton
            icon={showReplace ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            label={t(showReplace ? 'find.hideReplace' : 'find.showReplace')}
            size="sm"
            onClick={() => setShowReplace((value) => !value)}
          />

          <SearchInput
            size="sm"
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onClear={() => setQuery('')}
            aria-label={t('search.label')}
            className="min-w-0 flex-1"
          />

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
        </div>

        {showReplace ? (
          <div className="flex min-w-0 items-center gap-1">
            <span className="grid w-[22px] flex-none place-items-center text-ink-tertiary">
              <Replace size={13} />
            </span>

            <Input
              size="sm"
              placeholder={t('search.replacePlaceholder')}
              value={replacement}
              onChange={(event) => setReplacement(event.currentTarget.value)}
              aria-label={t('find.replaceWith')}
              className="min-w-0 flex-1"
            />

            <Button
              size="sm"
              disabled={!response || response.results.length === 0}
              onClick={() => void onReplaceAll()}
            >
              {t('find.replaceAll')}
            </Button>
          </div>
        ) : null}

        <button
          type="button"
          className="flex items-center gap-1 self-start rounded-xs px-1 py-px text-2xs text-ink-tertiary hover:text-ink-secondary"
          onClick={() => setShowFilters((value) => !value)}
        >
          {showFilters ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {t('search.fileFilters')}
        </button>

        {showFilters ? (
          <div className="flex flex-col gap-1 pl-3">
            <Input
              size="sm"
              placeholder={t('search.includePlaceholder')}
              value={include}
              onChange={(event) => setInclude(event.currentTarget.value)}
              aria-label={t('search.includeLabel')}
            />
            <Input
              size="sm"
              placeholder={t('search.excludePlaceholder')}
              value={exclude}
              onChange={(event) => setExclude(event.currentTarget.value)}
              aria-label={t('search.excludeLabel')}
            />
          </div>
        ) : null}
      </div>

      <div className="flex-none px-3 pb-1.5">
        <span
          className={cx(
            'inline-flex items-center gap-1.5 text-2xs',
            error ? 'text-danger' : 'text-ink-tertiary'
          )}
        >
          {running ? (
            <>
              <Spinner size={11} /> {t('search.searching')}
            </>
          ) : error ? (
            <>
              <X size={12} /> {error}
            </>
          ) : response ? (
            <>
              {response.totalMatches === 0
                ? t('search.noResults')
                : t('search.resultsIn', {
                    results: t('common.results', { count: response.totalMatches }),
                    files: t('common.files', { count: response.results.length })
                  })}
              {response.truncated ? t('search.truncated') : ''}
            </>
          ) : (
            t('search.prompt')
          )}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-4">
        {response?.results.length === 0 && !running ? (
          <EmptyState
            icon={<Search size={16} />}
            title={t('search.noResults')}
            description={t('search.noResultsDescription', { query })}
          />
        ) : null}

        {response?.results.map((file) => (
          <FileResult
            key={file.path}
            file={file}
            homePath={homePath}
            collapsed={collapsed.has(file.path)}
            onToggle={() => toggleFile(file.path)}
            onSelect={(line) => {
              void openPath(file.path).then(() => onRevealMatch(file.path, line))
            }}
            preview={preview}
          />
        ))}
      </div>
    </div>
  )
}
