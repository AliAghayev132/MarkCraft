// ── @lib ───────────────────────────────────────────────────────────────────
import { ChevronDown, FolderOpen, FolderX } from '@icons'
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { pathsEqual, tildify } from '@shared'
import type { RecentWorkspace } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { workspaceService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Dropdown, type MenuEntry } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import {
  closeWorkspace,
  openWorkspace,
  openWorkspaceFromDialog
} from './workspace-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { WorkspaceSwitcherProps } from './types'

/**
 * The workspace name, as a menu.
 *
 * Switching folders used to live only in the overflow menu, which made it look
 * like a workspace was chosen once per launch. The root name is the thing a
 * user points at when they mean "this folder", so that is where the switch
 * belongs — with the recent folders listed inline, because reopening a previous
 * project is the common case and a native dialog for it is a detour.
 */
export function WorkspaceSwitcher({ homePath }: WorkspaceSwitcherProps): ReactElement {
  const t = useT()
  const root = useAppSelector((state) => state.workspace.root)
  const rootName = useAppSelector((state) => state.workspace.rootName)

  const [recent, setRecent] = useState<RecentWorkspace[]>([])

  // Read when the menu is built rather than mirrored into the store: the list
  // is short, changes outside the renderer, and is only needed on open.
  useEffect(() => {
    void workspaceService.recentWorkspaces().then(setRecent)
  }, [root])

  const others = recent.filter((entry) => !root || !pathsEqual(entry.path, root))

  const items: MenuEntry[] = [
    {
      id: 'open',
      label: t('explorer.changeFolder'),
      icon: <FolderOpen size={13} />,
      onSelect: () => void openWorkspaceFromDialog()
    },

    ...(others.length > 0
      ? ([
          { id: 'recent-sep', separator: true },
          { id: 'recent-header', label: t('recent.folders'), disabled: true },
          ...others.slice(0, 8).map((entry) => ({
            id: `recent:${entry.path}`,
            label: entry.name,
            hint: tildify(entry.path, homePath),
            onSelect: () => void openWorkspace(entry.path)
          }))
        ] satisfies MenuEntry[])
      : []),

    ...(root
      ? ([
          { id: 'close-sep', separator: true },
          {
            id: 'close',
            label: t('explorer.closeFolder'),
            icon: <FolderX size={13} />,
            onSelect: () => void closeWorkspace()
          }
        ] satisfies MenuEntry[])
      : [])
  ]

  return (
    <Dropdown items={items} placement="bottom-start" ariaLabel={t('explorer.workspaceMenu')}>
      <button
        type="button"
        className="group/switcher -ml-1 flex h-6 min-w-0 flex-1 items-center gap-1 rounded-sm px-1 text-left hover:bg-hover focus-visible:shadow-focus focus-visible:outline-none"
        title={root ?? undefined}
      >
        <span className="min-w-0 truncate text-2xs font-semibold uppercase tracking-wider text-ink-tertiary group-hover/switcher:text-ink-secondary">
          {rootName || t('explorer.noFolder')}
        </span>
        <ChevronDown size={11} className="flex-none text-ink-tertiary" />
      </button>
    </Dropdown>
  )
}
