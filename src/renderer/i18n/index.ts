/**
 * Internationalisation — public surface.
 *
 * Three languages ship with the application (English, Azerbaijani, Russian) and
 * more can be added two ways:
 *
 *   1. **In the codebase** — drop a JSON file into `i18n/locales/`. It is
 *      discovered by a build-time glob, so there is nothing else to register.
 *   2. **In an installed copy** — drop a JSON file into the `languages` folder
 *      inside the app's data directory (Settings → Language → Open languages
 *      folder). It is read at startup and can be reloaded without restarting.
 *
 * Any key a locale omits falls back to English, so a partial translation is
 * still perfectly usable — which is the point of allowing user-supplied files.
 *
 * The *identity* of the active language lives in the Redux i18n slice; the
 * message trees and the translator live in `i18n/active`, because they are
 * large, static and non-serialisable.
 */

// ── The translator ─────────────────────────────────────────────────────────
export {
  applyCustomLocales,
  applyLanguage,
  currentLanguage,
  getTranslator,
  systemLanguage,
  t,
  untranslatedKeys
} from '@i18n/active'

export { useT, useTranslation } from '@i18n/useTranslation'

// ── Registry ───────────────────────────────────────────────────────────────
export { getLocale, hasLocale, listLocales, referenceMessages } from '@i18n/registry'
export { computeCoverage, flattenKeys } from '@i18n/translate'

// ── Types ──────────────────────────────────────────────────────────────────
export { FALLBACK_LANGUAGE, TEMPLATE_CODE } from '@i18n/types'
export type {
  LanguagePreference,
  Locale,
  LocaleMeta,
  LocaleTree,
  TranslateFn,
  TranslationValues
} from '@i18n/types'

export type { Translation } from '@i18n/types'
