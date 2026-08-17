// ── @lib ───────────────────────────────────────────────────────────────────
import { Clock, FileText, FolderOpen, Star, Trash2, X } from '@icons'
import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode
} from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { formatRelativeTime, pathsEqual, tildify } from '@shared'
import type { PinnedFile, RecentFile, RecentWorkspace } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { clipboardService, fileService, toast, workspaceService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, store, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { EmptyState, IconButton, SectionHeading, useContextMenu, type MenuEntry } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { openRecentDocument, openWorkspace } from '@features/explorer'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { RecentPanelProps } from './types'

/**
 * Recent documents, pinned files and recent folders.
 *
 * Refreshed when the panel is shown rather than mirrored into the store: the
 * lists are short, they change from outside the renderer, and re-reading them
 * is cheaper than keeping a second copy in sync.
 */
export function RecentPanel({ homePath }: RecentPanelProps): ReactElement {
  const t = useT()
  const showContextMenu = useContextMenu()

  const [pins, setPins] = useState<PinnedFile[]>([])
  const [files, setFiles] = useState<RecentFile[]>([])
  const [workspaces, setWorkspaces] = useState<RecentWorkspace[]>([])

  const activePath = useAppSelector((state) => selectActiveDocument(state)?.path ?? null)

  const refresh = useCallback(() => {
    void workspaceService.pins().then(setPins)
    void workspaceService.recentFiles().then(setFiles)
    void workspaceService.recentWorkspaces().then(setWorkspaces)
  }, [])

  useEffect(refresh, [refresh])

  // The lists change as documents are opened and saved elsewhere.
  useEffect(() => store.subscribe(refresh), [refresh])

  const fileMenu = (path: string, pinned: boolean): MenuEntry[] => [
    { id: 'open', label: t('common.open'), onSelect: () => void openRecentDocument(path) },
    {
      id: 'pin',
      label: t(pinned ? 'recent.removeFromPinned' : 'recent.pinToTop'),
      onSelect: () => void workspaceService.togglePin(path).then(setPins)
    },
    { id: 'sep', separator: true },
    {
      id: 'copy',
      label: t('tabs.menu.copyPath'),
      onSelect: () => {
        void clipboardService.writeText(path)
        toast.success(t('notifications.pathCopied'))
      }
    },
    { id: 'reveal', label: t('tabs.menu.reveal'), onSelect: () => void fileService.reveal(path) },
    { id: 'sep2', separator: true },
    {
      id: 'remove',
      label: t('notifications.fileGoneAction'),
      danger: true,
      onSelect: () => void workspaceService.removeRecentFile(path).then(setFiles)
    }
  ]

  if (pins.length === 0 && files.length === 0 && workspaces.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1.5 pb-4">
        <EmptyState
          icon={<Clock size={16} />}
          title={t('recent.emptyTitle')}
          description={t('recent.emptyDescription')}
        />
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1.5 pb-4">
      {pins.length > 0 ? (
        <section>
          <SectionHeading>
            <span className="inline-flex items-center gap-1.5">
              <Star size={11} /> {t('recent.pinned')}
            </span>
          </SectionHeading>

          {pins.map((pin) => (
            <Row
              key={pin.path}
              icon={<FileText size={13} className="flex-none text-info" />}
              name={pin.name}
              detail={tildify(pin.directory, homePath)}
              active={activePath ? pathsEqual(activePath, pin.path) : false}
              onOpen={() => void openRecentDocument(pin.path)}
              onContextMenu={(event) => showContextMenu(event, fileMenu(pin.path, true), pin.name)}
              action={
                <IconButton
                  icon={<X size={11} />}
                  label={t('recent.unpin', { name: pin.name })}
                  size="sm"
                  onClick={() => void workspaceService.togglePin(pin.path).then(setPins)}
                />
              }
            />
          ))}
        </section>
      ) : null}

      {files.length > 0 ? (
        <section>
          <SectionHeading
            actions={
              <IconButton
                icon={<Trash2 size={12} />}
                label={t('recent.clearDocuments')}
                size="sm"
                onClick={() => void workspaceService.clearRecentFiles().then(setFiles)}
              />
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock size={11} /> {t('recent.documents')}
            </span>
          </SectionHeading>

          {files.map((file) => (
            <Row
              key={file.path}
              icon={<FileText size={13} className="flex-none text-info" />}
              name={file.name}
              detail={formatRelativeTime(file.openedAt)}
              active={activePath ? pathsEqual(activePath, file.path) : false}
              onOpen={() => void openRecentDocument(file.path)}
              onContextMenu={(event) =>
                showContextMenu(
                  event,
                  fileMenu(
                    file.path,
                    pins.some((pin) => pathsEqual(pin.path, file.path))
                  ),
                  file.name
                )
              }
              action={
                <IconButton
                  icon={<X size={11} />}
                  label={t('recent.removeFromRecent', { name: file.name })}
                  size="sm"
                  onClick={() => void workspaceService.removeRecentFile(file.path).then(setFiles)}
                />
              }
            />
          ))}
        </section>
      ) : null}

      {workspaces.length > 0 ? (
        <section>
          <SectionHeading
            actions={
              <IconButton
                icon={<Trash2 size={12} />}
                label={t('recent.clearFolders')}
                size="sm"
                onClick={() => void workspaceService.clearRecentWorkspaces().then(setWorkspaces)}
              />
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen size={11} /> {t('recent.folders')}
            </span>
          </SectionHeading>

          {workspaces.map((workspace) => (
            <Row
              key={workspace.path}
              icon={<FolderOpen size={13} className="flex-none text-accent" />}
              name={workspace.name}
              detail={tildify(workspace.path, homePath)}
              active={false}
              onOpen={() => void openWorkspace(workspace.path)}
              action={
                <IconButton
                  icon={<X size={11} />}
                  label={t('recent.removeFromRecent', { name: workspace.name })}
                  size="sm"
                  onClick={() =>
                    void workspaceService.removeRecentWorkspace(workspace.path).then(setWorkspaces)
                  }
                />
              }
            />
          ))}
        </section>
      ) : null}
    </div>
  )
}

function Row({
  icon,
  name,
  detail,
  active,
  onOpen,
  onContextMenu,
  action
}: {
  icon: ReactNode
  name: string
  detail: string
  active: boolean
  onOpen: () => void
  onContextMenu?: (event: MouseEvent) => void
  action?: ReactNode
}): ReactElement {
  return (
    <div
      className={cx(
        'group flex min-w-0 items-center gap-px rounded-sm',
        active ? 'bg-selected' : 'hover:bg-hover'
      )}
      onContextMenu={onContextMenu}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1.5 py-1.5 text-left focus-visible:shadow-focus focus-visible:outline-none"
        onClick={onOpen}
      >
        {icon}
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-sm text-ink">{name}</span>
          <span className="truncate text-2xs text-ink-tertiary">{detail}</span>
        </span>
      </button>

      {action ? (
        <span className="flex-none pr-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {action}
        </span>
      ) : null}
    </div>
  )
}
