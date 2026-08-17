// ── node: ──────────────────────────────────────────────────────────────────
import { createHash } from 'node:crypto'

// ── @shared ────────────────────────────────────────────────────────────────
import { EMPTY_WORKSPACE_STATE, pathKey, type WorkspaceState } from '@shared'

// ── ../util ────────────────────────────────────────────────────────────────
import { JsonStore } from '../util/json-store'

/**
 * Workspace session state (expanded folders, open tabs, active document) is
 * stored per root so switching between projects restores each one exactly as it
 * was left. The "no folder open" session uses a dedicated slot.
 */
const stores = new Map<string, JsonStore<WorkspaceState>>()

function slotFor(root: string | null): string {
  if (!root) return 'workspaces/__no-folder.json'
  const digest = createHash('sha1').update(pathKey(root)).digest('hex').slice(0, 16)
  return `workspaces/${digest}.json`
}

function getStore(root: string | null): JsonStore<WorkspaceState> {
  const file = slotFor(root)
  let store = stores.get(file)
  if (!store) {
    store = new JsonStore<WorkspaceState>({
      file,
      defaults: { ...EMPTY_WORKSPACE_STATE, rootPath: root },
      version: 1,
      debounceMs: 400
    })
    stores.set(file, store)
  }
  return store
}

export async function loadWorkspaceState(root: string | null): Promise<WorkspaceState> {
  const state = await getStore(root).read()

  // For a named workspace the caller already knows the root, and stamping it
  // keeps the slot self-describing. For the bootstrap slot the *stored*
  // rootPath is the whole point of the read — it is how the application knows
  // which workspace to reopen — so it must not be overwritten with null.
  return root ? { ...state, rootPath: root } : state
}

export async function saveWorkspaceState(state: WorkspaceState): Promise<void> {
  await getStore(state.rootPath).set({ ...state, updatedAt: Date.now() })

  /*
   * Keep the bootstrap slot pointing at the folder that is open.
   *
   * It has to be maintained here, because a slot is addressed by `rootPath` and
   * the bootstrap slot's address is `null` while its *content* names a real
   * root. The renderer used to write it by calling save a second time with the
   * root in the payload — which addressed the named slot instead, so the root
   * was never remembered *and* the real session was overwritten with an empty
   * one. Owning the invariant here means the two records cannot disagree.
   */
  if (state.rootPath) {
    await getStore(null).set({
      ...EMPTY_WORKSPACE_STATE,
      rootPath: state.rootPath,
      sidebarView: state.sidebarView,
      updatedAt: Date.now()
    })
  }
}

export async function flushWorkspaces(): Promise<void> {
  await Promise.all([...stores.values()].map((store) => store.flush()))
}
