// ── @i18n ──────────────────────────────────────────────────────────────────
import { applyCustomLocales, applyLanguage } from '@i18n/active'
import { listLocales } from '@i18n/registry'

// ── @services ──────────────────────────────────────────────────────────────
import { localeService } from './locale-service'

// ── @store ─────────────────────────────────────────────────────────────────
import { dispatch, getState, languageResolved, localesRegistered } from '@store'

/**
 * Locale orchestration.
 *
 * Kept out of the `useLanguage` hook so the settings screen can trigger a
 * reload without mounting a second copy of the hook's startup effects.
 */

/** Publishes the registry to the store, so language lists re-render. */
export function publishLocales(): void {
  dispatch(
    localesRegistered(
      listLocales().map((locale) => ({
        ...locale.meta,
        source: locale.source,
        coverage: locale.coverage
      }))
    )
  )
}

/**
 * Re-reads `userData/languages/*.json` and re-applies the active language.
 *
 * Called once at startup and again whenever the user edits a translation file
 * and asks for a reload — no restart required.
 */
export async function reloadCustomLocales(): Promise<void> {
  const files = await localeService.list()
  if (files.length > 0) applyCustomLocales(files)

  publishLocales()

  const preference = getState().settings.values.language.preference
  dispatch(languageResolved({ preference, ...applyLanguage(preference) }))
}
