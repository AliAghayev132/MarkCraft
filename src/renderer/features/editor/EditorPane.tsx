// ── @lib ───────────────────────────────────────────────────────────────────
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { dirname } from '@shared'
import type { ViewMode } from '@shared'

// ── @store ─────────────────────────────────────────────────────────────────
import { contentChanged, cursorMoved, dispatch as storeDispatch, useAppDispatch, viewModeChanged } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, EmptyState, LoadingBlock } from '@ui'

// ── @components ────────────────────────────────────────────────────────────
import { ErrorBoundary } from '@components'

// ── @features ──────────────────────────────────────────────────────────────
import { TableToolbar } from './rich'
import { Preview } from './preview'

/*
 * The rich editor is ~900 KB of Tiptap and ProseMirror, and a reader or a
 * source-mode user never opens it. Loading it on first use keeps that out of
 * the startup graph; the chunk is small enough to arrive within the switch.
 */
const RichEditor = lazy(() =>
  import('./rich').then((m) => ({ default: m.RichEditor }))
)
import { SourceEditor } from './source'
import { SplitResizer } from './SplitResizer'
import { handleEditorDrop } from './file-drop'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { EditorPaneProps } from './types'
import type { PreviewHandle } from './preview'

/**
 * Hosts whichever editing surfaces the current view mode calls for.
 *
 * The two editors and the preview are three *views* of one Markdown string
 * held in the document store — never three copies of the document. That is what
 * makes mode switching lossless (§5).
 */
export function EditorPane({
  document,
  settings,
  onSave,
  onOpenDocument,
  revealLine
}: EditorPaneProps): React.ReactElement {
  const dispatch = useAppDispatch()
  const previewRef = useRef<PreviewHandle | null>(null)
  const [splitRatio, setSplitRatio] = useState(0.5)

  // Scroll sync is one-directional at any instant: whichever pane the user is
  // actually scrolling drives the other. Without this, the two panes fight and
  // the preview jitters.
  const driverRef = useRef<'editor' | 'preview' | null>(null)
  const releaseTimer = useRef<number | null>(null)

  const claimDriver = useCallback((driver: 'editor' | 'preview') => {
    driverRef.current = driver
    if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current)
    releaseTimer.current = window.setTimeout(() => {
      driverRef.current = null
    }, 220)
  }, [])

  useEffect(
    () => () => {
      if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current)
    },
    []
  )

  const baseDir = document.path ? dirname(document.path) : null
  const mode = document.viewMode

  const handleChange = useCallback(
    (value: string) => dispatch(contentChanged({ id: document.id, content: value })),
    [document.id, dispatch]
  )

  const handleCursor = useCallback(
    (line: number, column: number) => {
      dispatch(cursorMoved({ id: document.id, cursor: { line, column } }))

      if (settings.markdown.syncScroll && mode === 'split' && driverRef.current !== 'preview') {
        claimDriver('editor')
        previewRef.current?.scrollToLine(line)
      }
    },
    [document.id, dispatch, settings.markdown.syncScroll, mode, claimDriver]
  )

  const showSource = mode === 'source' || mode === 'split'
  const showPreview = mode === 'preview' || mode === 'split'
  const showRich = mode === 'rich'

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 bg-surface"
      onDragOver={(event) => {
        // Without this the browser navigates to the dropped file and the
        // whole application is replaced by it.
        if (event.dataTransfer.types.includes('Files')) event.preventDefault()
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        void handleEditorDrop(event.dataTransfer)
      }}
    >
      {showRich ? (
        <ErrorBoundary
          scope="richEditor"
          fallback={(error, reset) => (
            <EditorFallback
              message={error.message}
              onRetry={reset}
              onFallbackToSource={() =>
                storeDispatch(viewModeChanged({ id: document.id, viewMode: 'source' }))
              }
            />
          )}
        >
          <TableToolbar />

          <Suspense fallback={<LoadingBlock />}>
            <RichEditor
              documentId={document.id}
              value={document.content}
              settings={settings}
              onChange={handleChange}
              onSave={onSave}
              editable={!document.locked}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}

      {showSource ? (
        <div className={cx('flex min-h-0 min-w-0 flex-col overflow-hidden', mode === 'split' ? 'flex-[1_1_50%]' : 'flex-1')} style={
          mode === 'split' ? { flexBasis: `${splitRatio * 100}%` } : undefined
        }>
          <ErrorBoundary
            scope="editor"
            fallback={(error, reset) => (
              <EditorFallback message={error.message} onRetry={reset} />
            )}
          >
            <SourceEditor
              documentId={document.id}
              value={document.content}
              settings={settings.editor}
              onChange={handleChange}
              onCursor={handleCursor}
              onSave={onSave}
              readOnly={document.locked}
              revealLine={revealLine ?? null}
            />
          </ErrorBoundary>
        </div>
      ) : null}

      {mode === 'split' ? (
        <SplitResizer
          ratio={splitRatio}
          onChange={setSplitRatio}
          ariaLabel="Resize editor and preview"
        />
      ) : null}

      {showPreview ? (
        <div className={cx('flex min-h-0 min-w-0 flex-col overflow-hidden', mode === 'split' ? 'flex-[1_1_50%]' : 'flex-1')}>
          <ErrorBoundary
            scope="preview"
            fallback={(error, reset) => (
              <EditorFallback message={error.message} onRetry={reset} />
            )}
          >
            <Preview
              ref={previewRef}
              markdown={document.content}
              baseDir={baseDir}
              settings={settings.markdown}
              onOpenDocument={onOpenDocument}
              onVisibleLine={
                settings.markdown.syncScroll && mode === 'split'
                  ? () => claimDriver('preview')
                  : undefined
              }
            />
          </ErrorBoundary>
        </div>
      ) : null}
    </div>
  )
}

function EditorFallback({
  message,
  onRetry,
  onFallbackToSource
}: {
  message: string
  onRetry: () => void
  onFallbackToSource?: () => void
}): React.ReactElement {
  return (
    <div className="grid min-h-0 flex-1 place-items-center p-6">
      <EmptyState
        title="This view could not be rendered"
        description={
          <>
            {message}
            <br />
            Your document text is unaffected — it is still held in full.
          </>
        }
        action={
          <div className="flex gap-2">
            <Button onClick={onRetry}>Try again</Button>
            {onFallbackToSource ? (
              <Button variant="primary" onClick={onFallbackToSource}>
                Switch to Markdown source
              </Button>
            ) : null}
          </div>
        }
      />
    </div>
  )
}

export type { ViewMode }
