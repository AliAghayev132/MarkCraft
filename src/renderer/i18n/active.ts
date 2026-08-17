// ── @i18n ──────────────────────────────────────────────────────────────────
import {
  getLocale,
  listLocales,
  referenceMessages,
  registerCustomLocales,
  resolveLanguage
} from '@i18n/registry'
import { createTranslator } from '@i18n/translate'

// ── types ──────────────────────────────────────────────────────────────────
import { FALLBACK_LANGUAGE, type Locale, type TranslateFn } from '@i18n/types'

/**
 * The live translator.
 *
 * Message trees are large, static and non-serialisable, so they stay here
 * rather than in the Redux store — only the *identity* of the active language
 * is application state. Components read `t` through `useT()`, which
 * re-subscribes when the language in the store changes.
 */
let activeLanguage = FALLBACK_LANGUAGE
let missingKeys = new Set<string>()
let translate: TranslateFn = buildTranslator(FALLBACK_LANGUAGE)

function buildTranslator(language: string): TranslateFn {
  missingKeys = new Set<string>()
  const locale = getLocale(language)

  return createTranslator({
    language,
    messages: locale?.messages ?? referenceMessages,
    fallback: referenceMessages,
    onMissing: (key) => missingKeys.add(key)
  })
}

export function systemLanguage(): string {
  return typeof navigator === 'undefined' ? FALLBACK_LANGUAGE : navigator.language
}

/**
 * Resolves a preference against what is installed and rebuilds the translator.
 * Returns the resolved language and direction for the store to record.
 */
export function applyLanguage(preference: string): {
  language: string
  direction: 'ltr' | 'rtl'
} {
  const language = resolveLanguage(preference, systemLanguage())

  if (language !== activeLanguage) {
    activeLanguage = language
    translate = buildTranslator(language)
  }

  return { language, direction: getLocale(language)?.meta.direction ?? 'ltr' }
}

/** Merges user-supplied locales, then re-resolves in case one was awaited. */
export function applyCustomLocales(
  files: { code: string; messages: Record<string, unknown> }[]
): Locale[] {
  registerCustomLocales(files.map((file) => ({ code: file.code, messages: file.messages as never })))
  // Force a rebuild: the active language's messages may have been replaced.
  activeLanguage = ''
  return listLocales()
}

export function getTranslator(): TranslateFn {
  return translate
}

export function currentLanguage(): string {
  return activeLanguage
}

/**
 * Non-reactive translation, for code outside React — command handlers, service
 * error paths, toast messages.
 */
export const t: TranslateFn = (key, values) => translate(key, values)

/** Keys the active locale is missing. Surfaced in the language settings. */
export function untranslatedKeys(): string[] {
  return [...missingKeys].sort()
}
