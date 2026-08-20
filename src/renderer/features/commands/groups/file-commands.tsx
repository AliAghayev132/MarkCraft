// ── @lib ───────────────────────────────────────────────────────────────────
import {
  FilePlus2,
  FileText,
  FolderOpen,
  Printer,
  RotateCcw,
  Save,
  History,
  Share2,
  Presentation,
  FolderTree,
  Globe,
  Lock,
  Beaker,
  Book,
  Clipboard,
  Crosshair,
  LifeBuoy,
  Shapes,
  Sparkles,
  SquareCode,
  Wrench,
  Smile,
  Upload,
  X,
  XCircle
} from '@icons'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState, selectActiveDocument, selectDirtyDocuments } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import {
  closeAllDocuments,
  closeDocument,
  closeOtherDocuments,
  newDocument,
  openFromDialog,
  reopenClosedDocument,
  revertDocument,
  saveAll,
  saveDocument
} from '@features/documents'
import { openWorkspaceFromDialog } from '@features/explorer'

// ── types ──────────────────────────────────────────────────────────────────
import type { CommandDefinition, CommandGroupFactory } from '@features/commands'

const hasDocument = (): boolean => getState().documents.activeId !== null

/** Document lifecycle and tab management. */
export const fileCommands: CommandGroupFactory = (context): CommandDefinition[] => [
  {
    id: 'file.new',
    category: 'File',
    shortcut: 'mod+n',
    icon: <FilePlus2 size={14} />,
    run: () => void newDocument()
  },
  {
    id: 'file.newFromTemplate',
    category: 'File',
    shortcut: 'mod+alt+n',
    icon: <FilePlus2 size={14} />,
    run: () => context.openTemplates()
  },
  {
    id: 'file.open',
    category: 'File',
    shortcut: 'mod+o',
    icon: <FileText size={14} />,
    run: () => openFromDialog()
  },
  {
    id: 'file.openFolder',
    category: 'File',
    shortcut: 'mod+shift+o',
    icon: <FolderOpen size={14} />,
    run: () => openWorkspaceFromDialog()
  },
  {
    id: 'file.save',
    category: 'File',
    shortcut: 'mod+s',
    icon: <Save size={14} />,
    enabled: hasDocument,
    run: () => {
      const id = getState().documents.activeId
      if (id) return saveDocument(id)
    }
  },
  {
    id: 'file.saveAs',
    category: 'File',
    shortcut: 'mod+shift+s',
    enabled: hasDocument,
    run: () => {
      const id = getState().documents.activeId
      if (id) return saveDocument(id, { saveAs: true })
    }
  },
  {
    id: 'file.saveAll',
    category: 'File',
    shortcut: 'mod+alt+s',
    enabled: () => selectDirtyDocuments(getState()).length > 0,
    run: () => saveAll()
  },
  {
    id: 'file.revert',
    category: 'File',
    icon: <RotateCcw size={14} />,
    enabled: () => Boolean(selectActiveDocument(getState())?.path),
    run: () => {
      const id = getState().documents.activeId
      if (id) return revertDocument(id)
    }
  },
  {
    id: 'file.print',
    category: 'File',
    shortcut: 'mod+p',
    icon: <Printer size={14} />,
    enabled: hasDocument,
    run: () => context.print()
  },
  {
    id: 'file.export',
    category: 'File',
    // mod+shift+e is the explorer, as it is in every editor with a sidebar.
    shortcut: 'mod+alt+e',
    icon: <Upload size={14} />,
    keywords: 'pdf html markdown save copy',
    enabled: hasDocument,
    run: () => context.openExport()
  },
  {
    id: 'file.share',
    category: 'File',
    icon: <Share2 size={14} />,
    enabled: hasDocument,
    run: () => context.openShare()
  },
  {
    id: 'file.history',
    category: 'File',
    shortcut: 'mod+alt+h',
    icon: <History size={14} />,
    enabled: hasDocument,
    run: () => context.openHistory()
  },
  {
    id: 'insert.emoji',
    category: 'Insert',
    shortcut: 'mod+alt+m',
    icon: <Smile size={14} />,
    enabled: hasDocument,
    run: () => context.openEmoji()
  },
  {
    id: 'view.present',
    category: 'View',
    shortcut: 'f5',
    icon: <Presentation size={14} />,
    enabled: hasDocument,
    run: () => context.present()
  },
  {
    id: 'tools.open',
    category: 'View',
    shortcut: 'mod+alt+t',
    icon: <Wrench size={14} />,
    run: () => context.openDevTools()
  },
  {
    id: 'view.links',
    category: 'View',
    shortcut: 'mod+alt+l',
    icon: <FolderTree size={14} />,
    run: () => context.openLinks()
  },
  {
    id: 'view.website',
    category: 'View',
    shortcut: 'mod+alt+w',
    icon: <Globe size={14} />,
    enabled: hasDocument,
    run: () => context.openWebsite()
  },
  {
    id: 'document.clean',
    category: 'Edit',
    icon: <Sparkles size={14} />,
    enabled: hasDocument,
    run: () => context.cleanDocument()
  },
  {
    id: 'insert.codeLanguage',
    category: 'Insert',
    icon: <SquareCode size={14} />,
    enabled: hasDocument,
    run: () => context.openCodeLanguage()
  },
  {
    id: 'edit.pasteAsMarkdown',
    category: 'Edit',
    icon: <Clipboard size={14} />,
    enabled: hasDocument,
    run: () => context.pasteAsMarkdown()
  },
  {
    id: 'ai.review',
    category: 'Edit',
    icon: <LifeBuoy size={14} />,
    enabled: hasDocument,
    run: () => context.reviewDocument()
  },
  {
    id: 'view.book',
    category: 'View',
    shortcut: 'mod+alt+k',
    icon: <Book size={14} />,
    run: () => context.openBook()
  },
  {
    id: 'view.study',
    category: 'View',
    icon: <Beaker size={14} />,
    enabled: hasDocument,
    run: () => context.openStudy()
  },
  {
    id: 'view.canvas',
    category: 'View',
    icon: <Shapes size={14} />,
    run: () => context.openCanvas()
  },
  {
    /*
     * The document, laid out as a canvas beside it. The other direction lives
     * on the canvas itself; between them the two stop being separate places to
     * keep the same notes.
     */
    id: 'document.toCanvas',
    category: 'View',
    icon: <Shapes size={14} />,
    enabled: hasDocument,
    run: () => context.documentToCanvas()
  },
  {
    /*
     * Dims everything but the paragraph being written. A preference about how
     * somebody works, so it is remembered rather than reset each session.
     */
    id: 'view.focusMode',
    category: 'View',
    icon: <Crosshair size={14} />,
    enabled: hasDocument,
    run: () => context.toggleFocusMode()
  },
  {
    id: 'document.lock',
    category: 'File',
    icon: <Lock size={14} />,
    enabled: hasDocument,
    run: () => context.toggleLock()
  },
  {
    id: 'tools.http',
    category: 'View',
    icon: <Globe size={14} />,
    run: () => context.openHttp()
  },
  {
    id: 'help.guide',
    category: 'View',
    shortcut: 'f1',
    icon: <LifeBuoy size={14} />,
    run: () => context.openHelp()
  },

  /* ── Tabs ──────────────────────────────────────────────────────────────── */
  {
    id: 'tab.close',
    category: 'File',
    shortcut: 'mod+w',
    icon: <X size={14} />,
    enabled: hasDocument,
    run: () => {
      const id = getState().documents.activeId
      if (id) return closeDocument(id)
    }
  },
  {
    id: 'tab.closeOthers',
    category: 'File',
    enabled: () => getState().documents.order.length > 1,
    run: () => {
      const id = getState().documents.activeId
      if (id) return closeOtherDocuments(id)
    }
  },
  {
    id: 'tab.closeAll',
    category: 'File',
    icon: <XCircle size={14} />,
    enabled: hasDocument,
    run: () => closeAllDocuments()
  },
  {
    id: 'tab.reopen',
    category: 'File',
    shortcut: 'mod+shift+t',
    run: () => reopenClosedDocument()
  }
]
