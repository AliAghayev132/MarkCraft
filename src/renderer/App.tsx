// ── @lib ───────────────────────────────────────────────────────────────────
import { Share2, Upload } from '@icons'
import { useCallback, useEffect, useMemo, useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { AppInfo, PendingOpen, ViewMode } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { appService, loadSettings, onMainEvent, updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { lockToggled, readerModeEntered, readerModeExited, selectActiveDocument, selectReaderMode, useAppDispatch, useAppSelector, viewModeChanged } from '@store'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useAppearance, useLanguage } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, dialogs } from '@ui'

// ── @components ────────────────────────────────────────────────────────────
import { ErrorBoundary } from '@components'

// ── @features ──────────────────────────────────────────────────────────────
import { hasUnseenRelease, whatsNew } from '@features/whatsnew'
import { CommandPalette, useCommands } from '@features/commands'
import {
  closeAllDocuments,
  handleExternalChange,
  handleExternalRemoval,
  openPath,
  openPaths,
  saveDocument
} from '@features/documents'
import { ExternalChangeBanner, useAutosave } from '@features/documents'
import { EditorPane, editorRegistry } from '@features/editor'
import { openLanguageDialog } from '@features/editor/dialogs'
import { startAi } from '@features/ai'
import { pasteAsMarkdown } from '@features/editor/markdown'
import { goToLine } from '@features/editor/source'
import { MarkdownToolbar } from '@features/editor/toolbar'
import {
  onDirectoryChanged,
  openWorkspace,
  openWorkspaceFromDialog
} from '@features/explorer'
import { ReaderView } from '@features/reader'
import { cleanDocument } from '@features/stats'
import { printDocument } from '@features/output'
import { FindReplaceBar } from '@features/search'
import { AppOverlays, Sidebar, StatusBar, TitleBar, TitleBarDocumentLabel, useOverlays } from '@features/shell'
import { TabBar } from '@features/tabs'
import { WelcomeScreen } from '@features/welcome'
import { useSession } from '@features/workspace'

// ── types ──────────────────────────────────────────────────────────────────
import type { CommandContext } from '@features/commands'

export function App(): React.ReactElement {
  useAppearance()
  useLanguage()
  useAutosave()
  useSession()

  const t = useT()
  const settings = useAppSelector((state) => state.settings.values)
  const settingsLoaded = useAppSelector((state) => state.settings.loaded)

  const dispatch = useAppDispatch()
  const activeDocument = useAppSelector(selectActiveDocument)
  const readerMode = useAppSelector(selectReaderMode)

  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [selectionLength, setSelectionLength] = useState(0)
  const [revealLine, setRevealLine] = useState<number | null>(null)

  const overlays = useOverlays()

  const dirty = Boolean(activeDocument && activeDocument.content !== activeDocument.savedContent)

  /* ── Bootstrap ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    void (async () => {
      const settings = await loadSettings()
      const info = await appService.getInfo()
      setAppInfo(info)

      /*
       * Release notes are shown once per build, and never on a first run —
       * announcing what changed to someone who has never seen the application
       * is noise in front of an empty editor. The seen marker is written when
       * the modal is dismissed rather than here, so closing the window without
       * reading it means it is still waiting next time.
       */
      if (hasUnseenRelease(info.version, settings.app.lastSeenVersion)) whatsNew.open()
      else if (settings.app.lastSeenVersion === '') {
        void updateSettings({ app: { lastSeenVersion: info.version } })
      }
    })()
  }, [])

  /* ── Commands ──────────────────────────────────────────────────────────── */
  const openGoToLine = useCallback(async () => {
    const view = editorRegistry.getSourceView()
    if (!view) return

    const total = view.state.doc.lines
    const answer = await dialogs.prompt({
      title: t('dialogs.goToLine.title'),
      label: t('dialogs.goToLine.label', { total }),
      placeholder: String(view.state.doc.lineAt(view.state.selection.main.head).number),
      confirmLabel: t('common.go'),
      validate: (value) => {
        const parsed = Number(value)
        if (!Number.isInteger(parsed)) return t('dialogs.goToLine.invalidNumber')
        if (parsed < 1 || parsed > total) return t('dialogs.goToLine.outOfRange', { total })
        return null
      }
    })

    if (answer) goToLine(view, Number(answer))
  }, [t])

  /*
   * Every command that needs the full interface leaves reading mode on its way
   * in. A shortcut that appears to do nothing because the surface it opens is
   * not mounted is worse than one that changes the surface.
   */
  const commandContext = useMemo<CommandContext>(
    () => ({
      openCommandPalette: () => overlays.show('palette'),
      openSettings: () => overlays.show('settings'),
      openShortcuts: () => overlays.show('settings'),
      openExport: () => overlays.show('export'),
      openShare: () => overlays.show('share'),
      openHistory: () => overlays.show('history'),
      openWebsite: () => overlays.show('website'),
      openBook: () => overlays.show('book'),
      openStudy: () => overlays.show('study'),
      openCanvas: () => overlays.show('canvas'),
      openHttp: () => overlays.show('http'),
      toggleLock: () => {
        if (!activeDocument) return
        dispatch(lockToggled({ id: activeDocument.id, locked: !activeDocument.locked }))
      },
      reviewDocument: () => {
        dispatch(readerModeExited())
        startAi('review')
      },
      pasteAsMarkdown: () => {
        dispatch(readerModeExited())
        void pasteAsMarkdown()
      },
      openCodeLanguage: () => {
        dispatch(readerModeExited())
        openLanguageDialog()
      },
      cleanDocument: () => {
        dispatch(readerModeExited())
        cleanDocument()
      },
      openLinks: () => overlays.show('links'),
      openDevTools: () => overlays.show('devTools'),
      present: () => overlays.show('present'),
      openStatistics: () => overlays.show('stats'),
      openTemplates: () => overlays.show('templates'),
      openEmoji: () => overlays.showEmoji(),
      openFind: (replace: boolean) => overlays.showFind(replace),
      openGoToLine: () => {
        dispatch(readerModeExited())
        void openGoToLine()
      },
      // Printing renders the document, not the editor, so it works either way.
      print: () => void printDocument()
    }),
    [overlays, openGoToLine, dispatch, activeDocument]
  )

  const registry = useCommands(commandContext)

  /* ── Main-process events ───────────────────────────────────────────────── */

  /**
   * Files the OS handed us.
   *
   * Two routes, because of timing: anything that arrived before this component
   * subscribed is *collected* once (main holds it in a queue), and anything
   * after arrives as an event. Only a launch opens the reader — if the
   * application was already running the user is mid-task, and the file becomes
   * a tab instead.
   */
  useEffect(() => {
    const accept = ({ paths, reason }: PendingOpen): void => {
      void openPaths(paths).then(() => {
        if (reason === 'launch') dispatch(readerModeEntered())
      })
    }

    const off = onMainEvent('event:openPaths', accept)
    void appService.takePendingOpen().then((queued) => queued.forEach(accept))

    return off
  }, [dispatch])

  useEffect(
    () =>
      onMainEvent('event:watch', (event) => {
        if (!settings.files.watchExternalChanges) return
        if (event.type === 'file-changed') void handleExternalChange(event.path, event.stamp)
        else if (event.type === 'file-removed') handleExternalRemoval(event.path)
        else if (event.type === 'dir-changed') void onDirectoryChanged(event.path)
      }),
    [settings.files.watchExternalChanges]
  )

  useEffect(
    () =>
      onMainEvent('event:quitRequested', () => {
        void (async () => {
          // The renderer owns dirty state, so it decides whether quitting is
          // safe — main is waiting on this answer (§8).
          const cleared = await closeAllDocuments()
          await appService.confirmQuit(cleared)
        })()
      }),
    []
  )

  /* ── Welcome-screen intents ────────────────────────────────────────────── */
  useEffect(() => {
    const onOpenFolder = (): void => void openWorkspaceFromDialog()
    const onOpenWorkspace = (event: Event): void => {
      const path = (event as CustomEvent<string>).detail
      if (path) void openWorkspace(path)
    }

    window.addEventListener('markcraft:open-folder', onOpenFolder)
    window.addEventListener('markcraft:open-workspace', onOpenWorkspace)
    return () => {
      window.removeEventListener('markcraft:open-folder', onOpenFolder)
      window.removeEventListener('markcraft:open-workspace', onOpenWorkspace)
    }
  }, [])

  /* ── Window title ──────────────────────────────────────────────────────── */
  useEffect(() => {
    document.title = activeDocument
      ? `${dirty ? '● ' : ''}${activeDocument.title} — MarkCraft`
      : 'MarkCraft'
    void appService.setDocumentEdited(dirty)
    void appService.setRepresentedFilename(activeDocument?.path ?? null)
  }, [activeDocument, dirty])

  /* ── Find bar closes when the document changes ─────────────────────────── */
  useEffect(() => {
    overlays.hide('find')
  }, [activeDocument?.id, overlays])

  const onViewModeChange = useCallback(
    (mode: ViewMode) => {
      if (activeDocument) dispatch(viewModeChanged({ id: activeDocument.id, viewMode: mode }))
    },
    [activeDocument, dispatch]
  )

  /* The outline jumps within the open document; a search result may have to
     open another file first. Both end in the same reveal. */
  const onRevealLine = useCallback((line: number) => {
    setRevealLine(line)
    window.setTimeout(() => setRevealLine(null), 120)
  }, [])

  const onRevealMatch = useCallback((path: string, line: number) => {
    void openPath(path).then(() => {
      // A new object identity each time so repeatedly choosing the same result
      // still re-triggers the reveal.
      setRevealLine(line)
      window.setTimeout(() => setRevealLine(null), 120)
    })
  }, [])

  if (!settingsLoaded) {
    return <div className="h-full w-full bg-app" />
  }

  /*
   * Reading mode replaces the whole shell rather than hiding parts of it: a
   * document opened from the operating system is presented, not edited, and a
   * reader with a disabled toolbar still looks like an editor.
   */
  if (readerMode && activeDocument) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-app">
        <TitleBar>
          <TitleBarDocumentLabel
            title={activeDocument.title}
            subtitle={activeDocument.path ?? t('titleBar.notSaved')}
            dirty={false}
          />
        </TitleBar>

        <ErrorBoundary scope="editor">
          <ReaderView />
        </ErrorBoundary>

        <AppOverlays
          overlays={overlays}
          appInfo={appInfo}
          documentTitle={activeDocument?.title ?? ''}
          hasPath={Boolean(activeDocument?.path)}
          onOpenDocument={(path) => void openPath(path)}
          onSelectionChange={setSelectionLength}
        />
      </div>
    )
  }

  const showToolbar = settings.appearance.toolbarVisible && activeDocument !== null
  const showFind = overlays.open.find && activeDocument !== null && activeDocument.viewMode !== 'rich'

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-app">
      <TitleBar
        actions={
          /* Share and Export were reachable only from the command palette,
             which is not where anyone looks for them. */
          activeDocument ? (
            <>
              <IconButton
                icon={<Share2 size={15} />}
                label={t('commands.file.share')}
                size="sm"
                onClick={() => overlays.show('share')}
              />
              <IconButton
                icon={<Upload size={15} />}
                label={t('commands.file.export')}
                shortcut="mod+alt+e"
                size="sm"
                onClick={() => overlays.show('export')}
              />
            </>
          ) : null
        }
      >
        {activeDocument ? (
          <TitleBarDocumentLabel
            title={activeDocument.title}
            subtitle={activeDocument.path ?? t('titleBar.notSaved')}
            dirty={dirty}
          />
        ) : null}
      </TitleBar>

      <div className="flex min-h-0 min-w-0 flex-1">
        <ErrorBoundary scope="sidebar">
          <Sidebar
            homePath={appInfo?.homePath ?? null}
            onRevealMatch={onRevealMatch}
            onRevealLine={onRevealLine}
            onOpenSettings={() => overlays.show('settings')}
            onOpenTool={(id) => overlays.show(id)}
          />
        </ErrorBoundary>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-line-subtle bg-surface">
          <TabBar homePath={appInfo?.homePath ?? null} />

          {activeDocument ? <ExternalChangeBanner document={activeDocument} /> : null}

          {showToolbar ? <MarkdownToolbar /> : null}

          {showFind ? (
            <FindReplaceBar
              open
              showReplace={overlays.replacing}
              onToggleReplace={(replace) => overlays.showFind(replace)}
              onClose={() => overlays.hide('find')}
              documentText={activeDocument?.content ?? ''}
            />
          ) : null}

          <ErrorBoundary scope="editor">
            {activeDocument ? (
              <EditorPane
                document={activeDocument}
                settings={settings}
                onSave={() => void saveDocument(activeDocument.id)}
                onOpenDocument={(path) => void openPath(path)}
                revealLine={revealLine}
              />
            ) : (
              <WelcomeScreen
                homePath={appInfo?.homePath ?? null}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {settings.appearance.statusBarVisible ? (
        <StatusBar
          document={activeDocument}
          selectionLength={selectionLength}
          onViewModeChange={onViewModeChange}
          onStatsClick={() => overlays.show('stats')}
        />
      ) : null}

      {/* ── Overlays ──────────────────────────────────────────────────────── */}
      <CommandPalette
        open={overlays.open.palette}
        onClose={() => overlays.hide('palette')}
        commands={registry.commands}
        shortcuts={registry.shortcuts}
      />

      <AppOverlays
        overlays={overlays}
        appInfo={appInfo}
        documentTitle={activeDocument?.title ?? ''}
        hasPath={Boolean(activeDocument?.path)}
        onOpenDocument={(path) => void openPath(path)}
        onSelectionChange={setSelectionLength}
      />
    </div>
  )
}
