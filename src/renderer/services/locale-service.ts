// ── @services ──────────────────────────────────────────────────────────────
import { soft, unwrap } from './ipc'

// ── types ──────────────────────────────────────────────────────────────────
import type { CustomLocaleFile } from './types'

/**
 * User-supplied translation files.
 *
 * Listing is deliberately `soft`: a malformed language file must never stop the
 * application from starting, it just means that language is unavailable.
 */
export const localeService = {
  list(): Promise<CustomLocaleFile[]> {
    return soft(window.api.locales.list(), [])
  },

  revealFolder(): Promise<void> {
    return soft(window.api.locales.reveal(), undefined)
  },

  writeTemplate(code: string, content: string): Promise<{ path: string }> {
    return unwrap(window.api.locales.writeTemplate({ code, content }))
  }
}
