// ── @lib ───────────────────────────────────────────────────────────────────
import { FilePlus2, FolderPlus, Palette, RefreshCw } from '@icons'
import { useCallback } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { dirname } from '@shared'
import type { DirEntry } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { clipboardService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import type { MenuEntry } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import {
  copyEntries,
  createFileIn,
  createFolderIn,
  cutEntries,
  deleteEntries,
  duplicateEntry,
  pasteInto,
  refreshDirectory,
  renameEntry,
  toggleDirectory,
  togglePin
} from './workspace-actions'
import { openPath } from '@features/documents'
import { openIconPicker } from '@features/icons'

// ── types ──────────────────────────────────────────────────────────────────
import type { TreeNode } from '@store/slices/types'

/**
 * Builds the explorer's context menu.
 *
 * Extracted from the component because it is pure data assembly, and because it
 * needs the current selection at *invocation* time rather than at render time —
 * reading it from the store here avoids re-creating the callback on every
 * selection change.
 */
export function useExplorerMenu(
  targetsFor: (node: TreeNode) => DirEntry[]
): (node: TreeNode | null) => MenuEntry[] {
  const t = useT()

  return useCallback(
    (node: TreeNode | null): MenuEntry[] => {
      const workspace = getState().workspace
      const targets = node ? targetsFor(node) : []
      const directory = node
        ? node.kind === 'directory'
          ? node.path
          : dirname(node.path)
        : (workspace.root ?? '')

      const entries: MenuEntry[] = [
        {
          id: 'new-file',
          label: t('explorer.menu.newMarkdownFile'),
          icon: <FilePlus2 size={13} />,
          onSelect: () => void createFileIn(directory)
        },
        {
          id: 'new-folder',
          label: t('explorer.menu.newFolder'),
          icon: <FolderPlus size={13} />,
          onSelect: () => void createFolderIn(directory)
        }
      ]

      if (node) {
        entries.push(
          { id: 'sep-1', separator: true },
          {
            id: 'open',
            label: t(node.kind === 'directory' ? 'common.expand' : 'common.open'),
            onSelect: () =>
              node.kind === 'directory' ? void toggleDirectory(node.path) : void openPath(node.path)
          },
          {
            id: 'rename',
            label: t('explorer.menu.rename'),
            shortcut: 'F2',
            onSelect: () => void renameEntry(node)
          },
          {
            id: 'duplicate',
            label: t('common.duplicate'),
            onSelect: () => void duplicateEntry(node)
          },
          { id: 'sep-2', separator: true },
          {
            id: 'cut',
            label: t('common.cut'),
            shortcut: 'mod+x',
            onSelect: () => cutEntries(targets.map((entry) => entry.path))
          },
          {
            id: 'copy',
            label: t('common.copy'),
            shortcut: 'mod+c',
            onSelect: () => copyEntries(targets.map((entry) => entry.path))
          },
          {
            id: 'paste',
            label: t('common.paste'),
            shortcut: 'mod+v',
            disabled: !workspace.clipboard,
            onSelect: () => void pasteInto(directory)
          },
          { id: 'sep-3', separator: true },
          {
            id: 'copy-path',
            label: t('explorer.menu.copyPath'),
            onSelect: () => {
              void clipboardService.writeText(node.path)
              toast.success(t('notifications.pathCopied'))
            }
          },
          {
            id: 'pin',
            label: t('explorer.menu.pin'),
            disabled: node.kind === 'directory',
            onSelect: () => void togglePin(node.path)
          },
          {
            id: 'icon',
            label: t('explorer.menu.iconAndColour'),
            icon: <Palette size={13} />,
            onSelect: () => openIconPicker(node)
          },
          { id: 'sep-4', separator: true },
          {
            id: 'delete',
            label:
              targets.length > 1
                ? t('explorer.menu.deleteMany', { count: targets.length })
                : t('common.delete'),
            shortcut: 'Delete',
            danger: true,
            onSelect: () => void deleteEntries(targets)
          }
        )
      } else if (workspace.clipboard) {
        entries.push({
          id: 'paste-root',
          label: t('common.paste'),
          onSelect: () => void pasteInto(directory)
        })
      }

      entries.push(
        { id: 'sep-5', separator: true },
        {
          id: 'refresh',
          label: t('common.refresh'),
          icon: <RefreshCw size={13} />,
          onSelect: () => void refreshDirectory(directory)
        }
      )

      return entries
    },
    [t, targetsFor]
  )
}
