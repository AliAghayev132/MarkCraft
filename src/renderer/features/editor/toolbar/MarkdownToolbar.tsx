// ── @lib ───────────────────────────────────────────────────────────────────
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListChecks,
  Smile,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Table2,
  Underline,
  Undo2
} from '@icons'
import { useEffect, useState, useMemo, useSyncExternalStore } from '@lib/react'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Divider, IconButton, Toolbar, ToolbarGroup } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { emojiPicker } from '@features/emoji'
import { AiMenu } from '@features/ai'
import {
  openImageDialog,
  openLinkDialog,
  openTableDialog
} from '@features/editor/dialogs'
import { activeFormats, applyFormat, editorRegistry } from '@features/editor'

// ── types ──────────────────────────────────────────────────────────────────
import type { FormatAction } from '@features/editor'

interface ToolDescriptor {
  id: string
  icon: React.ReactElement
  label: string
  shortcut?: string
  action?: FormatAction
  activeKey?: string
  onClick?: () => void
}

const GROUPS: ToolDescriptor[][] = [
  [
    { id: 'undo', icon: <Undo2 size={15} />, label: 'Undo', shortcut: 'mod+z', action: 'undo' },
    { id: 'redo', icon: <Redo2 size={15} />, label: 'Redo', shortcut: 'mod+shift+z', action: 'redo' }
  ],
  [
    {
      id: 'h1',
      icon: <Heading1 size={15} />,
      label: 'Heading 1',
      shortcut: 'mod+1',
      action: 'heading1',
      activeKey: 'heading-1'
    },
    {
      id: 'h2',
      icon: <Heading2 size={15} />,
      label: 'Heading 2',
      shortcut: 'mod+2',
      action: 'heading2',
      activeKey: 'heading-2'
    },
    {
      id: 'h3',
      icon: <Heading3 size={15} />,
      label: 'Heading 3',
      shortcut: 'mod+3',
      action: 'heading3',
      activeKey: 'heading-3'
    }
  ],
  [
    {
      id: 'bold',
      icon: <Bold size={15} />,
      label: 'Bold',
      shortcut: 'mod+b',
      action: 'bold',
      activeKey: 'bold'
    },
    {
      id: 'italic',
      icon: <Italic size={15} />,
      label: 'Italic',
      shortcut: 'mod+i',
      action: 'italic',
      activeKey: 'italic'
    },
    {
      id: 'underline',
      icon: <Underline size={15} />,
      label: 'Underline',
      shortcut: 'mod+u',
      action: 'underline',
      activeKey: 'underline'
    },
    {
      id: 'strike',
      icon: <Strikethrough size={15} />,
      label: 'Strikethrough',
      action: 'strikethrough',
      activeKey: 'strike'
    },
    {
      id: 'code',
      icon: <Code size={15} />,
      label: 'Inline code',
      shortcut: 'mod+e',
      action: 'code',
      activeKey: 'code'
    }
  ],
  [
    {
      id: 'bullet',
      icon: <List size={15} />,
      label: 'Bullet list',
      action: 'bulletList',
      activeKey: 'bullet'
    },
    {
      id: 'ordered',
      icon: <ListOrdered size={15} />,
      label: 'Numbered list',
      action: 'orderedList',
      activeKey: 'ordered'
    },
    {
      id: 'task',
      icon: <ListChecks size={15} />,
      label: 'Task list',
      action: 'taskList',
      activeKey: 'task'
    },
    {
      id: 'quote',
      icon: <Quote size={15} />,
      label: 'Blockquote',
      action: 'quote',
      activeKey: 'quote'
    }
  ],
  [
    { id: 'link', icon: <Link2 size={15} />, label: 'Insert link', shortcut: 'mod+k', onClick: openLinkDialog },
    { id: 'image', icon: <ImageIcon size={15} />, label: 'Insert image', onClick: openImageDialog },
    { id: 'table', icon: <Table2 size={15} />, label: 'Insert table', onClick: openTableDialog },
    { id: 'emoji', icon: <Smile size={15} />, label: 'Insert emoji', shortcut: 'mod+alt+m', onClick: () => emojiPicker.open() },
    {
      id: 'codeBlock',
      icon: <SquareCode size={15} />,
      label: 'Code block',
      action: 'codeBlock',
      activeKey: 'codeBlock'
    },
    {
      id: 'rule',
      icon: <Minus size={15} />,
      label: 'Horizontal rule',
      action: 'horizontalRule'
    }
  ]
]

/**
 * The formatting toolbar (§12).
 *
 * Buttons act on the surface that currently has focus and reflect its state,
 * so the same toolbar drives the rich editor and the Markdown source without
 * the user having to think about which one they are in.
 */
/**
 * Applies the user's arrangement to the built-in groups.
 *
 * Grouping survives customisation: a chosen order is walked once and each tool
 * is emitted into the group it belongs to, so the dividers still separate
 * headings from emphasis rather than falling wherever the list happens to end.
 */
function arrange(order: string[]): ToolDescriptor[][] {
  if (order.length === 0) return GROUPS

  const wanted = new Set(order)
  const rank = new Map(order.map((id, index) => [id, index]))

  return GROUPS.map((group) =>
    group
      .filter((tool) => wanted.has(tool.id))
      .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
  ).filter((group) => group.length > 0)
}

/** Every tool this build knows, in its built-in order. */
export function toolbarToolIds(): { id: string; label: string }[] {
  return GROUPS.flat().map((tool) => ({ id: tool.id, label: tool.label }))
}

export function MarkdownToolbar(): React.ReactElement {
  const surface = useSyncExternalStore(
    (listener) => editorRegistry.subscribe(listener),
    () => editorRegistry.getSurface()
  )
  const [active, setActive] = useState<Set<string>>(new Set())
  const order = useAppSelector((state) => state.settings.values.appearance.toolbarItems)
  const groups = useMemo(() => arrange(order), [order])

  // Selection changes do not flow through React, so the toolbar samples the
  // editor state instead. A short interval is far cheaper than subscribing to
  // every transaction and re-rendering the tree.
  useEffect(() => {
    const sample = (): void => setActive(activeFormats())
    sample()

    const interval = window.setInterval(sample, 220)
    document.addEventListener('selectionchange', sample)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('selectionchange', sample)
    }
  }, [surface])

  return (
    <Toolbar ariaLabel="Formatting" className="h-toolbar flex-none overflow-x-auto border-b border-line-subtle bg-surface px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:h-0">
      {groups.map((group, index) => (
        <ToolbarGroup key={index}>
          {index > 0 ? <Divider orientation="vertical" /> : null}
          {group.map((tool) => (
            <IconButton
              key={tool.id}
              icon={tool.icon}
              label={tool.label}
              shortcut={tool.shortcut}
              size="md"
              active={tool.activeKey ? active.has(tool.activeKey) : false}
              onMouseDown={(event) => {
                // Keep focus in the editor so the command has a live selection.
                event.preventDefault()
              }}
              onClick={() => {
                if (tool.onClick) tool.onClick()
                else if (tool.action) applyFormat(tool.action)
              }}
            />
          ))}
        </ToolbarGroup>
      ))}

      {/* Renders nothing until a model is connected and switched on. */}
      <ToolbarGroup>
        <AiMenu />
      </ToolbarGroup>
    </Toolbar>
  )
}
