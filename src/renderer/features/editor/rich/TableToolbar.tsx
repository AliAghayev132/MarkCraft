// ── @lib ───────────────────────────────────────────────────────────────────
import { Columns2, Minus, Plus, Table2, Trash2 } from '@icons'
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, Toolbar, ToolbarGroup } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'

/** Polling interval for "is the caret in a table". */
const SAMPLE_MS = 220

/**
 * Table editing, in the rich view.
 *
 * A table is the one construct where Markdown's syntax is genuinely worse than
 * a button: adding a column means editing every row's pipes and keeping the
 * separator line in step. So the rich editor gets controls, and only while the
 * caret is actually inside a table — a toolbar that is always visible but
 * usually disabled is just clutter.
 *
 * The editor's selection state is sampled rather than subscribed to, matching
 * how the formatting toolbar already works: ProseMirror fires on every
 * keystroke, and re-rendering this row that often would cost more than it saves.
 */
export function TableToolbar(): ReactElement | null {
  const t = useT()
  const [inTable, setInTable] = useState(false)

  useEffect(() => {
    const sample = (): void => {
      const editor = editorRegistry.getRichEditor()
      setInTable(Boolean(editor?.isActive('table')))
    }

    sample()
    const timer = window.setInterval(sample, SAMPLE_MS)
    return () => window.clearInterval(timer)
  }, [])

  if (!inTable) return null

  const run = (command: (chain: ReturnType<NonNullable<ReturnType<typeof editorRegistry.getRichEditor>>['chain']>) => unknown): void => {
    const editor = editorRegistry.getRichEditor()
    if (!editor) return
    command(editor.chain().focus())
  }

  return (
    <Toolbar className="ui-scaled border-b border-line-subtle bg-sunken px-2">
      <span className="flex items-center gap-1.5 pr-1 text-2xs font-medium uppercase tracking-wider text-ink-tertiary">
        <Table2 size={13} />
        {t('table.title')}
      </span>

      <ToolbarGroup>
        <IconButton
          icon={<Plus size={14} />}
          label={t('table.addRow')}
          size="sm"
          onClick={() => run((chain) => (chain as { addRowAfter: () => { run: () => void } }).addRowAfter().run())}
        />
        <IconButton
          icon={<Minus size={14} />}
          label={t('table.deleteRow')}
          size="sm"
          onClick={() => run((chain) => (chain as { deleteRow: () => { run: () => void } }).deleteRow().run())}
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <IconButton
          icon={<Columns2 size={14} />}
          label={t('table.addColumn')}
          size="sm"
          onClick={() =>
            run((chain) => (chain as { addColumnAfter: () => { run: () => void } }).addColumnAfter().run())
          }
        />
        <IconButton
          icon={<Minus size={14} className="rotate-90" />}
          label={t('table.deleteColumn')}
          size="sm"
          onClick={() =>
            run((chain) => (chain as { deleteColumn: () => { run: () => void } }).deleteColumn().run())
          }
        />
      </ToolbarGroup>

      <ToolbarGroup>
        <IconButton
          icon={<Table2 size={14} />}
          label={t('table.toggleHeader')}
          size="sm"
          onClick={() =>
            run((chain) => (chain as { toggleHeaderRow: () => { run: () => void } }).toggleHeaderRow().run())
          }
        />
        <IconButton
          icon={<Trash2 size={14} />}
          label={t('table.deleteTable')}
          size="sm"
          onClick={() => run((chain) => (chain as { deleteTable: () => { run: () => void } }).deleteTable().run())}
        />
      </ToolbarGroup>
    </Toolbar>
  )
}
