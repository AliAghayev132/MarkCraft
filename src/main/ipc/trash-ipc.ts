// ── ../services ────────────────────────────────────────────────────────────
import { clearTrash, listTrash, purgeFromTrash, restoreFromTrash } from '../services/trash-service'

// ── ./ ─────────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

/**
 * The deleted-documents list.
 *
 * No channel here takes a filesystem path. An entry is addressed by the id the
 * trash itself issued, so the renderer can restore or purge only things the
 * application put there — naming an arbitrary path to be deleted is not
 * expressible.
 */
export function registerTrashHandlers(): void {
  handle('trash:list', () => listTrash())

  handle('trash:restore', async ({ id }) => ({
    path: await restoreFromTrash(requireString(id, 'id'))
  }))

  handle('trash:purge', ({ id }) => purgeFromTrash(requireString(id, 'id')))

  handle('trash:clear', () => clearTrash())
}
