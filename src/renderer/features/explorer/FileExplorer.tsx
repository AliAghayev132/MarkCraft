// ── @lib ───────────────────────────────────────────────────────────────────
import { FilePlus2 } from '@icons'
import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement
} from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { dirname, pathKey, pathsEqual } from '@shared'
import type { DirEntry } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { resolveDroppedPaths } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { filterChanged, getState, isSelected, selectActiveDocument, selectionChanged, selectVisibleTree, selectWorkspace, useAppDispatch, useAppSelector } from '@store'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { useVirtualList } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, EmptyState, SearchInput, Spinner, useContextMenu } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { ExplorerHeader } from './ExplorerHeader'
import { ROW_HEIGHT, TreeRow } from './TreeRow'
import { useExplorerMenu } from './useExplorerMenu'
import { openPath } from '@features/documents'
import {
  copyEntries,
  cutEntries,
  deleteEntries,
  moveEntries,
  pasteInto,
  openDroppedPaths,
  openWorkspaceFromDialog,
  createFileIn,
  renameEntry,
  toggleDirectory
} from './workspace-actions'

// ── types ──────────────────────────────────────────────────────────────────
import type { TreeNode } from '@store/slices/types'
import type { FileExplorerProps } from './types'

export function FileExplorer({ homePath }: FileExplorerProps): ReactElement {
  const t = useT()
  const dispatch = useAppDispatch()
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const workspace = useAppSelector(selectWorkspace)
  const rows = useAppSelector(selectVisibleTree)
  const activePath = useAppSelector((state) => selectActiveDocument(state)?.path ?? null)

  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const showContextMenu = useContextMenu()
  const window_ = useVirtualList(scrollRef, rows.length, ROW_HEIGHT)

  /** Selected entries, falling back to the row under the pointer. */
  const targetsFor = useCallback(
    (node: TreeNode): DirEntry[] => {
      const selection = getState().workspace.selection
      const selected = rows.filter((row) => isSelected(selection, row.path))
      return selected.length > 0 ? selected : [node]
    },
    [rows]
  )

  const buildMenu = useExplorerMenu(targetsFor)

  /* ── Selection ─────────────────────────────────────────────────────────── */
  const onRowClick = useCallback(
    (node: TreeNode, index: number, event: MouseEvent) => {
      const { selection, lastSelected } = getState().workspace

      if (event.shiftKey && lastSelected) {
        const anchorIndex = rows.findIndex((row) => pathsEqual(row.path, lastSelected))
        if (anchorIndex >= 0) {
          const [from, to] = anchorIndex < index ? [anchorIndex, index] : [index, anchorIndex]
          dispatch(
            selectionChanged({
              paths: rows.slice(from, to + 1).map((row) => row.path),
              anchor: lastSelected
            })
          )
          return
        }
      }

      if (event.ctrlKey || event.metaKey) {
        const already = isSelected(selection, node.path)
        dispatch(
          selectionChanged({
            paths: already
              ? selection.filter((path) => !pathsEqual(path, node.path))
              : [...selection, node.path],
            anchor: node.path
          })
        )
        return
      }

      dispatch(selectionChanged({ paths: [node.path], anchor: node.path }))

      if (node.kind === 'directory') void toggleDirectory(node.path)
      else void openPath(node.path)
    },
    [rows, dispatch]
  )

  /* ── Keyboard navigation ───────────────────────────────────────────────── */
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { selection, expanded, root } = getState().workspace
      const current = selection[selection.length - 1]
      const index = current ? rows.findIndex((row) => pathsEqual(row.path, current)) : -1

      const focusRow = (next: number): void => {
        const clamped = Math.max(0, Math.min(rows.length - 1, next))
        const row = rows[clamped]
        if (!row) return
        dispatch(selectionChanged({ paths: [row.path], anchor: row.path }))
        scrollRowIntoView(scrollRef.current, clamped)
      }

      /*
       * Cut, copy and paste, on the keys everyone already has in their fingers.
       * They were reachable only from the context menu, which is not where
       * anyone reaches for Ctrl+C.
       *
       * Paste targets the folder the selection is in — pasting "here" means
       * beside what is selected, not inside a file that happens to be selected.
       */
      if (event.ctrlKey || event.metaKey) {
        const node = rows[index]
        const paths = selection.length > 0 ? selection : node ? [node.path] : []

        switch (event.key.toLowerCase()) {
          case 'c':
            if (paths.length === 0) break
            event.preventDefault()
            copyEntries(paths)
            return
          case 'x':
            if (paths.length === 0) break
            event.preventDefault()
            cutEntries(paths)
            return
          case 'v': {
            const target = node?.kind === 'directory' ? node.path : node ? dirname(node.path) : root
            if (!target) break
            event.preventDefault()
            void pasteInto(target)
            return
          }
          default:
            break
        }
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          focusRow(index + 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          focusRow(index - 1)
          break
        case 'ArrowRight': {
          const node = rows[index]
          if (!node) break
          event.preventDefault()
          if (node.kind === 'directory' && !expanded[pathKey(node.path)]) {
            void toggleDirectory(node.path)
          } else {
            focusRow(index + 1)
          }
          break
        }
        case 'ArrowLeft': {
          const node = rows[index]
          if (!node) break
          event.preventDefault()
          if (node.kind === 'directory' && expanded[pathKey(node.path)]) {
            void toggleDirectory(node.path)
          } else {
            const parentIndex = rows.findIndex((row) => pathsEqual(row.path, dirname(node.path)))
            if (parentIndex >= 0) focusRow(parentIndex)
          }
          break
        }
        case 'Enter': {
          const node = rows[index]
          if (!node) break
          event.preventDefault()
          if (node.kind === 'directory') void toggleDirectory(node.path)
          else void openPath(node.path)
          break
        }
        case 'F2': {
          const node = rows[index]
          if (node) void renameEntry(node)
          break
        }
        case 'Delete': {
          const node = rows[index]
          if (node) void deleteEntries(targetsFor(node))
          break
        }
        case 'Home':
          event.preventDefault()
          focusRow(0)
          break
        case 'End':
          event.preventDefault()
          focusRow(rows.length - 1)
          break
      }
    },
    [rows, dispatch, targetsFor]
  )

  /* ── Empty state ───────────────────────────────────────────────────────── */
  if (!workspace.root) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EmptyState
          title={t('explorer.empty.noFolderTitle')}
          description={t('explorer.empty.noFolderDescription')}
          action={
            <Button variant="primary" onClick={() => void openWorkspaceFromDialog()}>
              {t('explorer.empty.openFolder')}
            </Button>
          }
        />
      </div>
    )
  }

  const root = workspace.root

  return (
    <div className="group/explorer flex min-h-0 min-w-0 flex-1 flex-col @container">
      <ExplorerHeader homePath={homePath} />

      <div className="flex-none px-2 pb-1.5">
        <SearchInput
          size="sm"
          placeholder={t('explorer.filter')}
          value={workspace.filter}
          onChange={(event) => dispatch(filterChanged(event.currentTarget.value))}
          onClear={() => dispatch(filterChanged(''))}
          aria-label={t('explorer.filterLabel')}
        />
      </div>

      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--mc-accent-border)]"
        role="tree"
        aria-label={t('explorer.files')}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest('[data-tree-row]')) return
          showContextMenu(event, buildMenu(null), t('explorer.menu.workspace'))
        }}
        data-drop-zone
        onDragOver={(event: DragEvent) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={(event: DragEvent) => {
          event.preventDefault()
          setDropTarget(null)
          void handleExternalDrop(event)
        }}
      >
        {rows.length === 0 ? (
          <div className="px-2 py-4">
            {workspace.filter ? (
              <EmptyState
                title={t('explorer.empty.noMatchesTitle')}
                description={t('explorer.empty.noMatchesDescription', { query: workspace.filter })}
              />
            ) : Object.keys(workspace.loading).length > 0 ? (
              <div className="grid place-items-center p-8">
                <Spinner size={16} />
              </div>
            ) : (
              <EmptyState
                title={t('explorer.empty.emptyTitle')}
                description={t('explorer.empty.emptyDescription')}
                action={
                  <Button
                    variant="primary"
                    icon={<FilePlus2 size={14} />}
                    onClick={() => void createFileIn(root)}
                  >
                    {t('explorer.newFile')}
                  </Button>
                }
              />
            )}
          </div>
        ) : (
          <div className="relative w-full" style={{ height: window_.totalHeight }}>
            <div
              className="absolute inset-x-0 top-0 will-change-transform"
              style={{ transform: `translateY(${window_.offsetTop}px)` }}
            >
              {rows.slice(window_.startIndex, window_.endIndex).map((node, offset) => {
                const index = window_.startIndex + offset

                return (
                  <TreeRow
                    key={node.path}
                    node={node}
                    index={index}
                    selected={isSelected(workspace.selection, node.path)}
                    active={activePath ? pathsEqual(activePath, node.path) : false}
                    expanded={Boolean(workspace.expanded[pathKey(node.path)])}
                    loading={Boolean(workspace.loading[pathKey(node.path)])}
                    cut={
                      workspace.clipboard?.mode === 'cut' &&
                      isSelected(workspace.clipboard.paths, node.path)
                    }
                    isDropTarget={dropTarget !== null && pathsEqual(dropTarget, node.path)}
                    onClick={(event) => onRowClick(node, index, event)}
                    onContextMenu={(event) => {
                      if (!isSelected(workspace.selection, node.path)) {
                        dispatch(selectionChanged({ paths: [node.path], anchor: node.path }))
                      }
                      showContextMenu(event, buildMenu(node), node.name)
                    }}
                    onDragStart={(event) => {
                      const selection = getState().workspace.selection
                      const paths = isSelected(selection, node.path) ? selection : [node.path]
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData(
                        'application/x-markcraft-paths',
                        JSON.stringify(paths)
                      )
                    }}
                    onDropTargetChange={setDropTarget}
                    onMove={(sources, targetDir) => void moveEntries(sources, targetDir)}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function scrollRowIntoView(container: HTMLElement | null, index: number): void {
  if (!container) return
  const top = index * ROW_HEIGHT
  const bottom = top + ROW_HEIGHT

  if (top < container.scrollTop) container.scrollTop = top
  else if (bottom > container.scrollTop + container.clientHeight) {
    container.scrollTop = bottom - container.clientHeight
  }
}

/** Files dragged in from the OS are opened, not moved. */
async function handleExternalDrop(event: DragEvent): Promise<void> {
  if (event.dataTransfer.types.includes('application/x-markcraft-paths')) return

  const paths = await resolveDroppedPaths(event.dataTransfer)
  if (paths.length === 0) return
  await openDroppedPaths(paths)
}
