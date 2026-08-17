// ── @lib ───────────────────────────────────────────────────────────────────
import { createSelector } from '@lib/redux'

// ── @shared ────────────────────────────────────────────────────────────────
import { MARKDOWN_EXTENSIONS } from '@shared'

// ── @store ─────────────────────────────────────────────────────────────────
import type { RootState } from '@store'
import { flattenTree } from '@store'

// ── types ──────────────────────────────────────────────────────────────────
import type { TreeNode } from '@store/slices/types'

/**
 * Selectors that span more than one slice.
 *
 * They live here rather than inside a slice so no slice has to know the shape
 * of another — the file tree needs a *setting* to decide what to show, and the
 * workspace slice has no business importing settings.
 */

const MARKDOWN_SET = new Set<string>(MARKDOWN_EXTENSIONS)

/**
 * The visible, ordered list of tree rows.
 *
 * Memoised on the three inputs that can change it, because it feeds the
 * virtualised list and is recomputed on every workspace action.
 *
 * Only expanded directories contribute children, so a 50,000-file workspace
 * costs exactly as much as the folders the user actually opened.
 */
export const selectVisibleTree = createSelector(
  [
    (state: RootState) => state.workspace,
    (state: RootState) => state.settings.values.files.markdownOnly
  ],
  (workspace, markdownOnly): TreeNode[] => {
    const rows = flattenTree(workspace)
    if (!markdownOnly) return rows

    // Directories always survive: hiding them would make their Markdown
    // contents unreachable, which is the opposite of what the filter is for.
    return rows.filter((row) => row.kind === 'directory' || MARKDOWN_SET.has(row.ext))
  }
)
