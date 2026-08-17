/** A translation bundle: arbitrarily nested objects of strings. */
export type LocaleTree = { [key: string]: string | LocaleTree }

export interface LocaleMeta {
  /** BCP-47 code, e.g. "az", "ru", "pt-BR". */
  code: string
  /** English name, for sorting and diagnostics. */
  name: string
  /** The name as written in that language — what the picker shows. */
  nativeName: string
  direction: 'ltr' | 'rtl'
  authors?: string[]
}

export interface Locale {
  meta: LocaleMeta
  messages: LocaleTree
  /** Built-in locales ship with the app; custom ones come from userData. */
  source: 'builtin' | 'custom'
  /** Share of the reference (English) keys this locale defines, 0–1. */
  coverage: number
}

/** Values interpolated into `{{placeholders}}`; `count` also drives plurals. */
export type TranslationValues = Record<string, string | number> & { count?: number }

export type TranslateFn = (key: string, values?: TranslationValues) => string

/** `system` follows the OS language and re-resolves when it changes. */
export type LanguagePreference = 'system' | string

export const FALLBACK_LANGUAGE = 'en'

/**
 * The code an exported starter file carries.
 *
 * It has to be a code the loader accepts, because the file is named after it —
 * 'template' is not one, and asking for it was how 'Export template…' came to
 * fail. `xx` is the conventional private-use placeholder, so the exported file
 * loads as a real (if untranslated) language until the translator renames it.
 */
export const TEMPLATE_CODE = 'xx'

export interface TranslatorOptions {
  language: string
  messages: LocaleTree
  /** Consulted when the active locale omits a key. */
  fallback: LocaleTree
  /** Called once per missing key, for the dev-time completeness report. */
  onMissing?: (key: string) => void
}

export interface Translation {
  t: TranslateFn
  language: string
  direction: 'ltr' | 'rtl'
}
