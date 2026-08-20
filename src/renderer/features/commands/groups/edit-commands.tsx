// ── @lib ───────────────────────────────────────────────────────────────────
import { MessageSquareText, Redo2, Replace, Scissors, Search, Undo2 } from '@icons'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, getState, sidebarViewChanged } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { applyFormat } from '@features/editor'
import { saveSelectionAsSnippet } from '@features/snippets'

// ── types ──────────────────────────────────────────────────────────────────
import type { CommandDefinition, CommandGroupFactory } from '@features/commands'

const hasDocument = (): boolean => getState().documents.activeId !== null

/** Undo/redo and the search entry points. */
export const editCommands: CommandGroupFactory = (context): CommandDefinition[] => [
  {
    id: 'edit.undo',
    category: 'Edit',
    shortcut: 'mod+z',
    icon: <Undo2 size={14} />,
    enabled: hasDocument,
    run: () => applyFormat('undo')
  },
  {
    id: 'edit.redo',
    category: 'Edit',
    shortcut: 'mod+shift+z',
    icon: <Redo2 size={14} />,
    enabled: hasDocument,
    run: () => applyFormat('redo')
  },
  {
    id: 'edit.find',
    category: 'Edit',
    shortcut: 'mod+f',
    icon: <Search size={14} />,
    enabled: hasDocument,
    run: () => context.openFind(false)
  },
  {
    id: 'edit.replace',
    category: 'Edit',
    shortcut: 'mod+h',
    icon: <Replace size={14} />,
    enabled: hasDocument,
    run: () => context.openFind(true)
  },
  {
    id: 'edit.findInFiles',
    category: 'Workspace',
    shortcut: 'mod+shift+f',
    icon: <Search size={14} />,
    run: () => {
      dispatch(sidebarViewChanged('search'))
      void updateSettings({ appearance: { sidebarVisible: true } })
    }
  },
  {
    id: 'edit.goToLine',
    category: 'Edit',
    shortcut: 'mod+g',
    enabled: hasDocument,
    run: () => context.openGoToLine()
  },
  {
    id: 'edit.comment',
    category: 'Edit',
    icon: <MessageSquareText size={14} />,
    keywords: 'comment note annotate review remark',
    enabled: hasDocument,
    run: () => {
      // The panel is where a comment is written; this opens it and puts the
      // selection in front of the person, rather than inventing a second
      // place to type one.
      dispatch(sidebarViewChanged('comments'))
    }
  },
  {
    /*
     * Keeps what is selected as a reusable block, named from its first line.
     * Bound to nothing by default: it is a deliberate act, and every free
     * two-key combination is worth more to something done every minute.
     */
    id: 'edit.saveSnippet',
    category: 'Edit',
    icon: <Scissors size={14} />,
    keywords: 'snippet save selection reuse block',
    enabled: hasDocument,
    run: () => void saveSelectionAsSnippet()
  }
]
