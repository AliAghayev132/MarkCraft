// ── @lib ───────────────────────────────────────────────────────────────────
import {
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Info,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Smile,
  SquareCode,
  Table2
} from '@icons'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @features ──────────────────────────────────────────────────────────────
import { applyFormat, editorRegistry } from '@features/editor'
import { openImageDialog, openLinkDialog, openTableDialog } from '@features/editor/dialogs'
import { insertBlock } from '@features/editor/source'
import { emojiPicker } from '@features/emoji'

// ── types ──────────────────────────────────────────────────────────────────
import type { SlashBlock, SlashBlockDefinition } from './types'

/**
 * What `/` can insert.
 *
 * Every entry routes through `applyFormat` or an existing dialog rather than
 * writing Markdown of its own: the slash menu is a second way to reach the
 * toolbar's blocks, not a second implementation of them, so a change to how a
 * task list is written reaches both (§12).
 *
 * Keywords carry the English name of every block as well as its shorthands,
 * and they are never translated. The label is localised and matched too, so a
 * writer can type `/başlıq` — but `/heading` and `/h1` have to keep working in
 * a localised build, because that is what the Markdown world calls it and what
 * a bilingual user's hands already know.
 */
const DEFINITIONS: SlashBlockDefinition[] = [
  { id: 'heading1', icon: <Heading1 size={15} />, keywords: ['h1', 'heading', 'title'], run: () => applyFormat('heading1') },
  { id: 'heading2', icon: <Heading2 size={15} />, keywords: ['h2', 'heading', 'subtitle'], run: () => applyFormat('heading2') },
  { id: 'heading3', icon: <Heading3 size={15} />, keywords: ['h3', 'heading'], run: () => applyFormat('heading3') },
  { id: 'bulletList', icon: <List size={15} />, keywords: ['ul', 'bullet', 'list', 'unordered'], run: () => applyFormat('bulletList') },
  { id: 'orderedList', icon: <ListOrdered size={15} />, keywords: ['ol', 'ordered', 'list', 'number'], run: () => applyFormat('orderedList') },
  { id: 'taskList', icon: <ListChecks size={15} />, keywords: ['task', 'todo', 'list', 'checkbox'], run: () => applyFormat('taskList') },
  { id: 'quote', icon: <Quote size={15} />, keywords: ['quote', 'blockquote'], run: () => applyFormat('quote') },
  { id: 'codeBlock', icon: <SquareCode size={15} />, keywords: ['code', 'fence', 'pre'], run: () => applyFormat('codeBlock') },
  { id: 'callout', icon: <Info size={15} />, keywords: ['callout', 'note', 'admonition'], run: () => insertCallout() },
  { id: 'table', icon: <Table2 size={15} />, keywords: ['table', 'grid'], run: openTableDialog },
  { id: 'link', icon: <Link2 size={15} />, keywords: ['link', 'url', 'href'], run: openLinkDialog },
  { id: 'image', icon: <ImageIcon size={15} />, keywords: ['image', 'img', 'picture', 'photo'], run: openImageDialog },
  { id: 'emoji', icon: <Smile size={15} />, keywords: ['emoji', 'icon', 'smiley'], run: () => emojiPicker.open() },
  { id: 'horizontalRule', icon: <Minus size={15} />, keywords: ['divider', 'hr', 'rule', 'line'], run: () => applyFormat('horizontalRule') }
]

/*
 * Written directly rather than through `applyFormat`, because a callout is
 * source syntax with no counterpart in the rich editor — and the slash menu
 * only ever runs in the Markdown source, so there is nothing to keep in step.
 */
function insertCallout(): void {
  const view = editorRegistry.getSourceView()
  // `NOTE` is the plainest of the five: a writer who wanted a warning changes
  // one word, and one who wanted a note has nothing to undo.
  if (view) insertBlock(view, '> [!NOTE]\n> ')
}

/** The blocks with labels in the active language, for matching and display. */
export function slashBlocks(): SlashBlock[] {
  return DEFINITIONS.map((block) => ({ ...block, label: t(`slash.blocks.${block.id}`) }))
}
