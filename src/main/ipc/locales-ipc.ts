// ── ../services ────────────────────────────────────────────────────────────
import {
  listCustomLocales,
  revealLocalesDirectory,
  writeLocaleTemplate
} from '../services/locales-service'

// ── ./ipc ──────────────────────────────────────────────────────────────────
import { handle, requireString } from './register'

export function registerLocaleHandlers(): void {
  handle('locales:list', () => listCustomLocales())

  handle('locales:reveal', () => revealLocalesDirectory())

  handle('locales:writeTemplate', async ({ code, content }) => {
    requireString(code, 'code')
    requireString(content, 'content')
    return { path: await writeLocaleTemplate(code, content) }
  })
}
