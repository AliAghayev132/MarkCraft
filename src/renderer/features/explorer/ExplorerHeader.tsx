// ── @lib ───────────────────────────────────────────────────────────────────
import {
  ArrowDownAZ,
  ChevronsDownUp,
  Eye,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  RefreshCw
} from '@icons'
import type { ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { SortKey } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppDispatch, useAppSelector } from '@store'
import {
  allCollapsed,
  hiddenFilesToggled,
  selectWorkspace,
  sortChanged
} from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Dropdown, IconButton, type MenuEntry } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import {
  createFileIn,
  createFolderIn,
  openWorkspaceFromDialog,
  refreshDirectory
} from './workspace-actions'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

// ── types ──────────────────────────────────────────────────────────────────
import type { ExplorerHeaderProps } from './types'

const SORT_KEYS: SortKey[] = ['name', 'modified', 'size', 'kind']

/** Root name plus the explorer's own actions. */
export function ExplorerHeader({ homePath }: ExplorerHeaderProps): ReactElement {
  const t = useT()
  const dispatch = useAppDispatch()
  const workspace = useAppSelector(selectWorkspace)
  const root = workspace.root

  const sortMenu: MenuEntry[] = [
    ...SORT_KEYS.map((key) => ({
      id: key,
      label: t(`explorer.sortBy.${key}`),
      checked: workspace.sortKey === key,
      onSelect: () => dispatch(sortChanged({ key }))
    })),
    { id: 'sep', separator: true },
    {
      id: 'direction',
      label: t(
        workspace.sortDirection === 'asc' ? 'explorer.sortBy.ascending' : 'explorer.sortBy.descending'
      ),
      onSelect: () =>
        dispatch(
          sortChanged({
            key: workspace.sortKey,
            direction: workspace.sortDirection === 'asc' ? 'desc' : 'asc'
          })
        )
    }
  ]

  const overflowMenu: MenuEntry[] = [
    {
      id: 'hidden',
      label: t('explorer.showHidden'),
      checked: workspace.showHidden,
      icon: <Eye size={13} />,
      onSelect: () => {
        dispatch(hiddenFilesToggled(!workspace.showHidden))
        if (root) void refreshDirectory(root)
      }
    },
    {
      id: 'collapse',
      label: t('explorer.collapseAll'),
      icon: <ChevronsDownUp size={13} />,
      onSelect: () => dispatch(allCollapsed())
    }
  ]

  return (
    <header className="flex h-[30px] flex-none items-center gap-1.5 pr-1 pl-3">
      <WorkspaceSwitcher homePath={homePath} />

      {/* The actions recede until the panel is hovered, so the header reads as
          a label rather than a toolbar. */}
      <div className="flex flex-none items-center gap-px opacity-75 transition-opacity group-hover/explorer:opacity-100 focus-within:opacity-100">
        <IconButton
          icon={<FolderOpen size={14} />}
          label={t('explorer.changeFolder')}
          shortcut="mod+shift+o"
          size="sm"
          onClick={() => void openWorkspaceFromDialog()}
        />
        <IconButton
          icon={<FilePlus2 size={14} />}
          label={t('explorer.newFile')}
          size="sm"
          onClick={() => root && void createFileIn(root)}
        />
        <IconButton
          icon={<FolderPlus size={14} />}
          label={t('explorer.newFolder')}
          size="sm"
          onClick={() => root && void createFolderIn(root)}
        />
        <IconButton
          icon={<RefreshCw size={13} />}
          label={t('common.refresh')}
          size="sm"
          onClick={() => root && void refreshDirectory(root)}
        />

        <Dropdown items={sortMenu} placement="bottom-end" ariaLabel={t('explorer.sort')}>
          <IconButton
            icon={<ArrowDownAZ size={14} />}
            label={t('explorer.sort')}
            size="sm"
            tooltip={false}
          />
        </Dropdown>

        <Dropdown items={overflowMenu} placement="bottom-end" ariaLabel={t('explorer.moreOptions')}>
          <IconButton
            icon={<MoreHorizontal size={14} />}
            label={t('explorer.moreOptions')}
            size="sm"
            tooltip={false}
          />
        </Dropdown>
      </div>
    </header>
  )
}
