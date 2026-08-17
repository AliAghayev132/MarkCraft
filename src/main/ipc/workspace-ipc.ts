// ── @shared ────────────────────────────────────────────────────────────────
import { pathKey } from '@shared'

// ── ../services ────────────────────────────────────────────────────────────
import * as recent from '../services/recent-service'
import { loadWorkspaceState, saveWorkspaceState } from '../services/workspace-service'

// ── ../security ────────────────────────────────────────────────────────────
import { pathGuard } from '../security/path-guard'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/**
 * True if main's *own* records say the user opened this folder before — either
 * it is in the recent-workspaces list, or it is the workspace the last session
 * was left in.
 *
 * The distinction that matters: this is decided from persisted state, never
 * from the argument alone, so re-granting on restart cannot be turned into a
 * way for the renderer to grant itself an arbitrary root.
 */
async function isRememberedRoot(root: string): Promise<boolean> {
  const { remembered } = await recent.isRemembered(root)
  if (remembered) return true

  const bootstrap = await loadWorkspaceState(null)
  return bootstrap.rootPath !== null && pathKey(bootstrap.rootPath) === pathKey(root)
}

export function registerWorkspaceHandlers(): void {
  handle('workspace:loadState', async ({ root }) => {
    // Re-granting on load is what makes a workspace survive a restart: the
    // guard starts empty every launch and is repopulated only from persisted,
    // user-chosen roots. A folder picked in the native dialog was already
    // granted there, so this only has to cover the restored routes.
    if (root && !(await pathGuard.isAllowed(root)) && (await isRememberedRoot(root))) {
      pathGuard.grantRoot(root)
    }

    return loadWorkspaceState(root)
  })

  handle('workspace:saveState', (state) => saveWorkspaceState(state))

  handle('workspace:recentFiles', () => recent.getRecentFiles())
  handle('workspace:addRecentFile', async ({ path }) => {
    // Only something already reachable may be remembered. Without this, the
    // renderer could name any path here and then have it granted back on the
    // next `authorizeRemembered` — turning the recent list into a way around
    // the path guard rather than a record of what the user opened.
    const target = requireString(path, 'path')
    if (!(await pathGuard.isAllowed(target))) return recent.getRecentFiles()
    return recent.addRecentFile(target)
  })
  handle('workspace:removeRecentFile', ({ path }) =>
    recent.removeRecentFile(requireString(path, 'path'))
  )
  handle('workspace:clearRecentFiles', () => recent.clearRecentFiles())

  handle('workspace:recentWorkspaces', () => recent.getRecentWorkspaces())
  handle('workspace:addRecentWorkspace', async ({ path }) => {
    const target = requireString(path, 'path')
    if (!(await pathGuard.isAllowed(target))) return recent.getRecentWorkspaces()
    return recent.addRecentWorkspace(target)
  })
  handle('workspace:removeRecentWorkspace', ({ path }) =>
    recent.removeRecentWorkspace(requireString(path, 'path'))
  )
  handle('workspace:clearRecentWorkspaces', () => recent.clearRecentWorkspaces())

  handle('workspace:pins', () => recent.getPins())
  handle('workspace:togglePin', async ({ path }) => {
    const target = requireString(path, 'path')

    // Adding a pin needs the same justification as adding a recent entry.
    // *Removing* one must always work: a pin whose file is no longer reachable
    // is exactly the one a user wants to get rid of.
    const { remembered } = await recent.isRemembered(target)
    if (!remembered && !(await pathGuard.isAllowed(target))) return recent.getPins()

    return recent.togglePin(target)
  })

  handle('workspace:authorizeRemembered', async ({ path }) => {
    const target = requireString(path, 'path')

    // The grant is decided by main's own record of what the user opened, never
    // by the argument alone — otherwise this handler would be a way around the
    // path guard rather than a controlled exception to it.
    const { remembered, kind } = await recent.isRemembered(target)
    if (!remembered) return false

    if (kind === 'workspace') pathGuard.grantRoot(target)
    else pathGuard.grantFile(target)

    return true
  })
}
