// ── @lib ───────────────────────────────────────────────────────────────────
import { FolderOpen, PenLine, Printer } from '@icons'
import { useMemo, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { dirname } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { readerModeExited, selectActiveDocument, useAppDispatch, useAppSelector } from '@store'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useEscapeKey } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, IconButton } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { openPath } from '@features/documents'
import { Preview } from '@features/editor/preview'
import { printDocument } from '@features/output'
import { computeStats } from '@features/editor/markdown'

/**
 * The document, presented rather than edited.
 *
 * This is what a `.md` file opened from the operating system lands in. Someone
 * who double-clicked a document in Explorer wants to *read* it; dropping them
 * into a split-pane editor with a file tree and a formatting toolbar answers a
 * question they did not ask.
 *
 * It is a view over the same open document, not a separate mode of the
 * application: "Edit" simply leaves reading mode, and the full editor appears
 * around the file that is already loaded — no reopening, no reparsing, and an
 * unsaved change could not be lost because there cannot be one yet.
 */
export function ReaderView(): ReactElement | null {
  const t = useT()
  const dispatch = useAppDispatch()

  const document_ = useAppSelector(selectActiveDocument)
  const markdown = useAppSelector((state) => state.settings.values.markdown)

  /* Escape is the only exit a reader will look for, and this view has one. */
  useEscapeKey(true, () => dispatch(readerModeExited()))

  // Computed once per document rather than on a debounce: nothing is being
  // typed here, so there is no stream of changes to throttle.
  const stats = useMemo(() => computeStats(document_?.content ?? ''), [document_?.content])

  if (!document_) return null

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
      <header className="ui-scaled flex h-toolbar flex-none items-center gap-3 border-b border-line-subtle px-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-sm font-semibold text-ink">{document_.title}</h1>
          <p className="truncate text-2xs text-ink-tertiary">
            {t('reader.stats', {
              words: stats.words,
              minutes: Math.max(1, Math.round(stats.readingTimeMinutes))
            })}
          </p>
        </div>

        <IconButton
          icon={<Printer size={15} />}
          label={t('commands.file.print')}
          onClick={() => void printDocument()}
        />

        <IconButton
          icon={<FolderOpen size={15} />}
          label={t('commands.file.openFolder')}
          onClick={() => {
            // Reading a document and then wanting its folder is common enough
            // to be one click; it necessarily leaves reading mode.
            if (document_.path) {
              window.dispatchEvent(
                new CustomEvent('markcraft:open-workspace', { detail: dirname(document_.path) })
              )
            }
            dispatch(readerModeExited())
          }}
        />

        <Button
          variant="primary"
          icon={<PenLine size={14} />}
          data-autofocus
          onClick={() => dispatch(readerModeExited())}
        >
          {t('reader.edit')}
        </Button>
      </header>

      <Preview
        markdown={document_.content}
        baseDir={document_.path ? dirname(document_.path) : null}
        settings={markdown}
        onOpenDocument={(path) => void openPath(path)}
        className="min-h-0 flex-1"
      />
    </div>
  )
}
