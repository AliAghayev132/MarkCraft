// ── @lib ───────────────────────────────────────────────────────────────────
import { createSlice, type PayloadAction } from '@lib/redux'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename, dirname, isDescendantPath, pathKey, pathsEqual } from '@shared'
import type { DirEntry, SortDirection, SortKey } from '@shared'

// ── types ──────────────────────────────────────────────────────────────────
import type { ClipboardState, SidebarView, TreeNode, WorkspaceState } from '@store/slices/types'

const initialState: WorkspaceState = {
  root: null,
  rootName: '',
  children: {},
  expanded: {},
  loading: {},
  selection: [],
  lastSelected: null,
  filter: '',
  sortKey: 'name',
  sortDirection: 'asc',
  foldersFirst: true,
  showHidden: false,
  sidebarView: 'explorer',
  clipboard: null
}

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    rootOpened(state, action: PayloadAction<{ root: string | null; name?: string }>) {
      const { root, name } = action.payload
      state.root = root
      state.rootName = name ?? (root ? basename(root) : '')
      state.children = {}
      state.expanded = root ? { [pathKey(root)]: true } : {}
      state.selection = []
      state.lastSelected = null
      state.filter = ''
    },

    childrenLoaded(state, action: PayloadAction<{ directory: string; entries: DirEntry[] }>) {
      state.children[pathKey(action.payload.directory)] = action.payload.entries
    },

    /** Drops a cached listing so the next read re-fetches it. */
    directoryInvalidated(state, action: PayloadAction<string>) {
      delete state.children[pathKey(action.payload)]
    },

    loadingChanged(state, action: PayloadAction<{ directory: string; loading: boolean }>) {
      const key = pathKey(action.payload.directory)
      if (action.payload.loading) state.loading[key] = true
      else delete state.loading[key]
    },

    expandedChanged(state, action: PayloadAction<{ directory: string; expanded: boolean }>) {
      const key = pathKey(action.payload.directory)
      if (action.payload.expanded) state.expanded[key] = true
      else delete state.expanded[key]
    },

    allCollapsed(state) {
      state.expanded = state.root ? { [pathKey(state.root)]: true } : {}
    },

    /** Expands every ancestor of `path` so it becomes visible in the tree. */
    revealed(state, action: PayloadAction<string>) {
      if (!state.root) return

      let current = dirname(action.payload)
      while (current && isDescendantPath(state.root, current)) {
        state.expanded[pathKey(current)] = true
        const parent = dirname(current)
        if (parent === current) break
        current = parent
      }
      state.expanded[pathKey(state.root)] = true
    },

    selectionChanged(
      state,
      action: PayloadAction<{ paths: string[]; anchor?: string | null }>
    ) {
      state.selection = action.payload.paths
      state.lastSelected =
        action.payload.anchor ?? action.payload.paths[action.payload.paths.length - 1] ?? null
    },

    filterChanged(state, action: PayloadAction<string>) {
      state.filter = action.payload
    },

    sortChanged(
      state,
      action: PayloadAction<{ key: SortKey; direction?: SortDirection }>
    ) {
      const { key, direction } = action.payload
      state.sortDirection =
        direction ?? (state.sortKey === key ? (state.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc')
      state.sortKey = key
    },

    hiddenFilesToggled(state, action: PayloadAction<boolean>) {
      state.showHidden = action.payload
      // Listings were filtered on read, so they all have to be re-fetched.
      state.children = {}
    },

    sidebarViewChanged(state, action: PayloadAction<SidebarView>) {
      state.sidebarView = action.payload
    },

    clipboardChanged(state, action: PayloadAction<ClipboardState | null>) {
      state.clipboard = action.payload
    },

    workspaceReset() {
      return initialState
    }
  }
})

export const {
  rootOpened,
  childrenLoaded,
  directoryInvalidated,
  loadingChanged,
  expandedChanged,
  allCollapsed,
  revealed,
  selectionChanged,
  filterChanged,
  sortChanged,
  hiddenFilesToggled,
  sidebarViewChanged,
  clipboardChanged,
  workspaceReset
} = workspaceSlice.actions

export const workspaceReducer = workspaceSlice.reducer

/* ────────────────────────────────────────────────────────────────────────────
 * Selectors
 * ─────────────────────────────────────────────────────────────────────────── */

interface WithWorkspace {
  workspace: WorkspaceState
}

export const selectWorkspace = (state: WithWorkspace): WorkspaceState => state.workspace
export const selectWorkspaceRoot = (state: WithWorkspace): string | null => state.workspace.root
export const selectSidebarView = (state: WithWorkspace): SidebarView => state.workspace.sidebarView
export const selectSelection = (state: WithWorkspace): string[] => state.workspace.selection
export const selectClipboard = (state: WithWorkspace): ClipboardState | null =>
  state.workspace.clipboard

export function isSelected(selection: string[], path: string): boolean {
  return selection.some((entry) => pathsEqual(entry, path))
}

export function sortEntries(
  entries: DirEntry[],
  key: SortKey,
  direction: SortDirection,
  foldersFirst: boolean
): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (foldersFirst && a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1

    let result: number
    switch (key) {
      case 'modified':
        result = a.modifiedAt - b.modifiedAt
        break
      case 'size':
        result = a.size - b.size
        break
      case 'kind':
        result = a.ext.localeCompare(b.ext) || a.name.localeCompare(b.name)
        break
      default:
        // Numeric collation so "file10" sorts after "file9".
        result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    }

    return direction === 'asc' ? result : -result
  })
}

export function flattenTree(workspace: WorkspaceState): TreeNode[] {
  const { root, children, expanded, filter } = workspace
  if (!root) return []

  const needle = filter.trim().toLowerCase()
  const rows: TreeNode[] = []

  const walk = (directory: string, depth: number): void => {
    const entries = children[pathKey(directory)]
    if (!entries) return

    const sorted = sortEntries(
      entries,
      workspace.sortKey,
      workspace.sortDirection,
      workspace.foldersFirst
    )

    for (const entry of sorted) {
      const isExpanded = Boolean(expanded[pathKey(entry.path)])

      if (needle) {
        // While filtering, a folder is shown only if it or a loaded descendant
        // matches — otherwise the filter would hide the path to the results.
        const selfMatches = entry.name.toLowerCase().includes(needle)
        const descendantMatches =
          entry.kind === 'directory' && subtreeMatches(entry.path, children, needle)

        if (!selfMatches && !descendantMatches) continue
        rows.push({ ...entry, depth })
        if (entry.kind === 'directory' && (isExpanded || descendantMatches)) {
          walk(entry.path, depth + 1)
        }
        continue
      }

      rows.push({ ...entry, depth })
      if (entry.kind === 'directory' && isExpanded) walk(entry.path, depth + 1)
    }
  }

  walk(root, 0)
  return rows
}

function subtreeMatches(
  directory: string,
  children: Record<string, DirEntry[]>,
  needle: string
): boolean {
  const entries = children[pathKey(directory)]
  if (!entries) return false

  for (const entry of entries) {
    if (entry.name.toLowerCase().includes(needle)) return true
    if (entry.kind === 'directory' && subtreeMatches(entry.path, children, needle)) return true
  }

  return false
}
