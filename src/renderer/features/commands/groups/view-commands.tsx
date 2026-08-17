// ── @lib ───────────────────────────────────────────────────────────────────
import {
  BookOpen,
  Columns2,
  Eye,
  FileText,
  List,
  Moon,
  PanelLeft,
  PenLine,
  RefreshCw,
  Sun,
  Target,
  ZoomIn,
  ZoomOut
} from '@icons'

// ── @shared ────────────────────────────────────────────────────────────────
import { UI_SCALE_STEP, clampUiScale, type ViewMode } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n/active'

// ── @services ──────────────────────────────────────────────────────────────
import { getSettings, toast, updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, documentActivated, getState, readerModeEntered, readerModeExited, sidebarViewChanged, viewModeChanged } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { refreshWorkspace } from '@features/explorer'

// ── types ──────────────────────────────────────────────────────────────────
import type { CommandDefinition, CommandGroupFactory } from '@features/commands'

const hasDocument = (): boolean => getState().documents.activeId !== null

function setViewMode(viewMode: ViewMode): void {
  const id = getState().documents.activeId
  if (id) dispatch(viewModeChanged({ id, viewMode }))
}

/**
 * Steps the interface zoom and reports where it landed.
 *
 * The toast is what makes the shortcut discoverable: the sidebar visibly
 * changes size, but without a number the user cannot tell how far they have
 * gone or how to get back to 100%.
 */
function nudgeUiScale(delta: number): void {
  const next = clampUiScale(getSettings().appearance.uiScale + delta)
  if (next === getSettings().appearance.uiScale) return

  void updateSettings({ appearance: { uiScale: next } })
  toast.info(t('view.zoomToast', { percent: Math.round(next * 100) }))
}

function cycleTab(delta: number): void {
  const { order, activeId } = getState().documents
  if (order.length === 0) return
  const index = activeId ? order.indexOf(activeId) : -1
  const next = order[(index + delta + order.length) % order.length]
  if (next) dispatch(documentActivated(next))
}

/** View modes, chrome visibility, theme and tab navigation. */
export const viewCommands: CommandGroupFactory = (context): CommandDefinition[] => [
  {
    id: 'view.rich',
    category: 'View',
    icon: <PenLine size={14} />,
    enabled: hasDocument,
    run: () => setViewMode('rich')
  },
  {
    id: 'view.source',
    category: 'View',
    icon: <FileText size={14} />,
    enabled: hasDocument,
    run: () => setViewMode('source')
  },
  {
    id: 'view.split',
    category: 'View',
    icon: <Columns2 size={14} />,
    enabled: hasDocument,
    run: () => setViewMode('split')
  },
  {
    id: 'view.preview',
    category: 'View',
    icon: <Eye size={14} />,
    enabled: hasDocument,
    run: () => setViewMode('preview')
  },
  {
    id: 'view.cycleMode',
    category: 'View',
    shortcut: 'mod+shift+v',
    enabled: hasDocument,
    run: () => {
      const order: ViewMode[] = ['rich', 'source', 'split', 'preview']
      const current = getState().documents.entities[getState().documents.activeId ?? '']?.viewMode
      const next = order[(order.indexOf(current ?? 'split') + 1) % order.length]
      if (next) setViewMode(next)
    }
  },

  /* ── Chrome ────────────────────────────────────────────────────────────── */
  {
    id: 'view.toggleSidebar',
    category: 'View',
    // Not mod+b: that is Bold, and this is a writing application first.
    shortcut: 'mod+alt+b',
    icon: <PanelLeft size={14} />,
    run: () =>
      updateSettings({
        appearance: { sidebarVisible: !getSettings().appearance.sidebarVisible }
      })
  },
  {
    id: 'view.toggleToolbar',
    category: 'View',
    run: () =>
      updateSettings({
        appearance: { toolbarVisible: !getSettings().appearance.toolbarVisible }
      })
  },
  {
    id: 'view.toggleStatusBar',
    category: 'View',
    run: () =>
      updateSettings({
        appearance: { statusBarVisible: !getSettings().appearance.statusBarVisible }
      })
  },
  {
    id: 'view.toggleTheme',
    category: 'View',
    shortcut: 'mod+shift+d',
    icon: getSettings().appearance.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />,
    run: () =>
      updateSettings({
        appearance: { theme: getSettings().appearance.theme === 'dark' ? 'light' : 'dark' }
      })
  },
  {
    id: 'view.explorer',
    category: 'View',
    shortcut: 'mod+shift+e',
    run: () => {
      dispatch(sidebarViewChanged('explorer'))
      void updateSettings({ appearance: { sidebarVisible: true } })
    }
  },

  {
    id: 'view.outline',
    category: 'View',
    shortcut: 'mod+shift+u',
    icon: <List size={14} />,
    run: () => {
      dispatch(sidebarViewChanged('outline'))
      void updateSettings({ appearance: { sidebarVisible: true } })
    }
  },
  {
    id: 'view.statistics',
    category: 'View',
    icon: <Target size={14} />,
    enabled: hasDocument,
    run: () => context.openStatistics()
  },
  {
    id: 'view.readingMode',
    category: 'View',
    shortcut: 'mod+shift+r',
    icon: <BookOpen size={14} />,
    enabled: hasDocument,
    run: () => {
      // A toggle rather than two commands: it is one idea, and the palette
      // should not offer "enter" while you are already in it.
      dispatch(getState().ui.readerMode ? readerModeExited() : readerModeEntered())
    }
  },

  /* ── Interface zoom ────────────────────────────────────────────────────── */
  {
    id: 'view.zoomIn',
    category: 'View',
    shortcut: 'mod+=',
    icon: <ZoomIn size={14} />,
    run: () => nudgeUiScale(UI_SCALE_STEP)
  },
  {
    id: 'view.zoomOut',
    category: 'View',
    shortcut: 'mod+-',
    icon: <ZoomOut size={14} />,
    run: () => nudgeUiScale(-UI_SCALE_STEP)
  },
  {
    id: 'view.zoomReset',
    category: 'View',
    // mod+0 is Paragraph. Zoom reset is the rarer action, so it steps aside.
    shortcut: 'mod+alt+0',
    enabled: () => getSettings().appearance.uiScale !== 1,
    run: () => updateSettings({ appearance: { uiScale: 1 } })
  },

  /* ── Tabs ──────────────────────────────────────────────────────────────── */
  {
    id: 'tab.next',
    category: 'View',
    shortcut: 'mod+alt+arrowright',
    enabled: () => getState().documents.order.length > 1,
    run: () => cycleTab(1)
  },
  {
    id: 'tab.previous',
    category: 'View',
    shortcut: 'mod+alt+arrowleft',
    enabled: () => getState().documents.order.length > 1,
    run: () => cycleTab(-1)
  },

  /* ── Workspace ─────────────────────────────────────────────────────────── */
  {
    id: 'workspace.refresh',
    category: 'Workspace',
    icon: <RefreshCw size={14} />,
    enabled: () => getState().workspace.root !== null,
    run: () => refreshWorkspace()
  }
]
