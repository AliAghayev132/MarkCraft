// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useSyncExternalStore, type ReactElement } from '@lib/react'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @ui ────────────────────────────────────────────────────────────────────
import { ContextMenuLayer, DialogLayer, ToastViewport } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { AiDialog } from '@features/ai'
import { BookDialog } from '@features/book'
import { CanvasView } from '@features/canvas'
import { DevToolsDialog } from '@features/devtools'
import { RecoveryPrompt } from '@features/documents'
import { InsertDialogLayer } from '@features/editor/dialogs'
import { EmojiPicker, emojiPicker } from '@features/emoji'
import { HistoryDialog } from '@features/history'
import { IconPickerLayer } from '@features/icons'
import { HttpDialog } from '@features/http'
import { LinksDialog } from '@features/links'
import { ExportModal, ShareModal } from '@features/output'
import { PresentView } from '@features/present'
import { SettingsModal } from '@features/settings'
import { SlashMenu, slashMenu } from '@features/slash'
import { StudyView } from '@features/study'
import { StatsDialog } from '@features/stats'
import { TemplatePicker } from '@features/templates'
import { WebsiteView } from '@features/website'
import { whatsNew, WhatsNewModal } from '@features/whatsnew'

// ── types ──────────────────────────────────────────────────────────────────
import type { AppOverlaysProps } from './types'

/**
 * Everything that floats above the workspace.
 *
 * Split out of `App` because none of it takes part in the layout: these are a
 * flat list of mounts driven by one state object, and keeping them beside the
 * editor's own structure made the file's shape impossible to see at a glance.
 */
export function AppOverlays({
  overlays,
  appInfo,
  documentTitle,
  hasPath,
  onOpenDocument,
  onSelectionChange
}: AppOverlaysProps): ReactElement {
  const { open, hide } = overlays

  const emojiOpen = useSyncExternalStore(
    (listener) => emojiPicker.subscribe(listener),
    () => emojiPicker.get()
  )
  const whatsNewOpen = useSyncExternalStore(
    (listener) => whatsNew.subscribe(listener),
    () => whatsNew.get()
  )
  const slashState = useSyncExternalStore(
    (listener) => slashMenu.subscribe(listener),
    () => slashMenu.get()
  )

  return (
    <>
      <SettingsModal open={open.settings} onClose={() => hide('settings')} appInfo={appInfo} />

      <ExportModal
        open={open.export}
        onClose={() => hide('export')}
        documentTitle={documentTitle}
      />

      <ShareModal
        open={open.share}
        onClose={() => hide('share')}
        documentTitle={documentTitle}
        hasPath={hasPath}
        onExport={() => {
          hide('share')
          overlays.show('export')
        }}
      />

      <BookDialog
        open={open.book}
        onClose={() => hide('book')}
        onOpenDocument={onOpenDocument}
      />

      <StatsDialog open={open.stats} onClose={() => hide('stats')} />
      <TemplatePicker open={open.templates} onClose={() => hide('templates')} />
      <HistoryDialog open={open.history} onClose={() => hide('history')} />
      <DevToolsDialog open={open.devTools} onClose={() => hide('devTools')} />
      <PresentView open={open.present} onClose={() => hide('present')} />
      <WebsiteView open={open.website} onClose={() => hide('website')} />
      <StudyView open={open.study} onClose={() => hide('study')} />
      <CanvasView open={open.canvas} onClose={() => hide('canvas')} />
      <HttpDialog open={open.http} onClose={() => hide('http')} />

      <LinksDialog
        open={open.links}
        onClose={() => hide('links')}
        onOpenDocument={onOpenDocument}
      />

      {/* Shown once per build, and on demand from Settings → About. */}
      <WhatsNewModal
        open={whatsNewOpen}
        onClose={() => {
          whatsNew.close()
          if (appInfo) void updateSettings({ app: { lastSeenVersion: appInfo.version } })
        }}
        version={appInfo?.version ?? ''}
      />

      <EmojiPicker open={emojiOpen} onClose={() => emojiPicker.close()} />
      <SlashMenu state={slashState} />

      <RecoveryPrompt />
      <IconPickerLayer />
      <InsertDialogLayer />
      <DialogLayer />
      <AiDialog />
      <ContextMenuLayer />
      <ToastViewport />
      <SelectionReporter onChange={onSelectionChange} />
    </>
  )
}

/**
 * Selection length is reported through a tiny sibling rather than lifted into
 * the render path above it, so a drag-select does not re-render the editor.
 */
function SelectionReporter({ onChange }: { onChange: (length: number) => void }): null {
  useEffect(() => {
    const onSelectionChange = (): void => {
      const selection = window.getSelection()
      onChange(selection?.toString().length ?? 0)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [onChange])

  return null
}
