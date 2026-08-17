// ── @shared ────────────────────────────────────────────────────────────────
import type { CustomIcon } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { soft } from './ipc'

/**
 * User-imported SVG icons.
 *
 * Read on demand rather than mirrored into the store: the list changes only
 * when the user imports or removes one, and the markup is bulkier than
 * anything else the store holds.
 */
export const iconsService = {
  list: (): Promise<CustomIcon[]> => soft(window.api.icons.list(), []),
  import: (): Promise<CustomIcon[]> => soft(window.api.icons.import(), []),
  remove: (id: string): Promise<CustomIcon[]> => soft(window.api.icons.remove({ id }), []),
  revealFolder: (): Promise<void> => soft(window.api.icons.reveal(), undefined)
}
