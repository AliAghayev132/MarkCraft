// ── ../services ────────────────────────────────────────────────────────────
import {
  importCustomIcons,
  listCustomIcons,
  removeCustomIcon,
  revealIconsDirectory
} from '../services/icons-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

export function registerIconHandlers(): void {
  handle('icons:list', () => listCustomIcons())
  handle('icons:import', () => importCustomIcons())
  handle('icons:remove', ({ id }) => removeCustomIcon(requireString(id, 'id')))
  handle('icons:reveal', () => revealIconsDirectory())
}
