// ── @lib ───────────────────────────────────────────────────────────────────
import { Bold, Image as ImageIcon, Italic, Link2, Table2 } from '@icons'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, getState, insertDialogOpened } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { applyFormat } from '@features/editor'

// ── types ──────────────────────────────────────────────────────────────────
import type { CommandDefinition, CommandGroupFactory } from '@features/commands'

const hasDocument = (): boolean => getState().documents.activeId !== null

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const

/** Inline and block formatting, plus the structured insert dialogs. */
export const formatCommands: CommandGroupFactory = (): CommandDefinition[] => [
  {
    id: 'format.bold',
    category: 'Format',
    shortcut: 'mod+b',
    icon: <Bold size={14} />,
    enabled: hasDocument,
    run: () => applyFormat('bold')
  },
  {
    id: 'format.italic',
    category: 'Format',
    shortcut: 'mod+i',
    icon: <Italic size={14} />,
    enabled: hasDocument,
    run: () => applyFormat('italic')
  },
  {
    id: 'format.underline',
    category: 'Format',
    shortcut: 'mod+u',
    enabled: hasDocument,
    run: () => applyFormat('underline')
  },
  {
    id: 'format.strikethrough',
    category: 'Format',
    enabled: hasDocument,
    run: () => applyFormat('strikethrough')
  },
  {
    id: 'format.code',
    category: 'Format',
    shortcut: 'mod+e',
    enabled: hasDocument,
    run: () => applyFormat('code')
  },
  {
    id: 'format.codeBlock',
    category: 'Format',
    enabled: hasDocument,
    run: () => applyFormat('codeBlock')
  },
  {
    id: 'format.quote',
    category: 'Format',
    enabled: hasDocument,
    run: () => applyFormat('quote')
  },
  {
    id: 'format.bulletList',
    category: 'Format',
    enabled: hasDocument,
    run: () => applyFormat('bulletList')
  },
  {
    id: 'format.orderedList',
    category: 'Format',
    enabled: hasDocument,
    run: () => applyFormat('orderedList')
  },
  {
    id: 'format.taskList',
    category: 'Format',
    enabled: hasDocument,
    run: () => applyFormat('taskList')
  },
  {
    id: 'format.paragraph',
    category: 'Format',
    shortcut: 'mod+0',
    enabled: hasDocument,
    run: () => applyFormat('paragraph')
  },

  ...HEADING_LEVELS.map((level) => ({
    id: `format.heading${level}`,
    category: 'Format' as const,
    shortcut: `mod+${level}`,
    enabled: hasDocument,
    run: () => applyFormat(`heading${level}` as const)
  })),

  /* ── Insert ────────────────────────────────────────────────────────────── */
  {
    id: 'insert.link',
    category: 'Insert',
    shortcut: 'mod+k',
    icon: <Link2 size={14} />,
    enabled: hasDocument,
    run: () => dispatch(insertDialogOpened('link'))
  },
  {
    id: 'insert.image',
    category: 'Insert',
    icon: <ImageIcon size={14} />,
    enabled: hasDocument,
    run: () => dispatch(insertDialogOpened('image'))
  },
  {
    id: 'insert.table',
    category: 'Insert',
    icon: <Table2 size={14} />,
    enabled: hasDocument,
    run: () => dispatch(insertDialogOpened('table'))
  },
  {
    id: 'insert.horizontalRule',
    category: 'Insert',
    enabled: hasDocument,
    run: () => applyFormat('horizontalRule')
  }
]
