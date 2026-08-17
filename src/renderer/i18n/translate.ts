// ── types ──────────────────────────────────────────────────────────────────
import type { LocaleTree, TranslationValues, TranslatorOptions } from '@i18n/types'

/**
 * A small, dependency-free translation engine.
 *
 * `i18next` and friends bring a plugin system, backends and a resource loader
 * that this application has no use for — the whole feature is a nested lookup,
 * `{{placeholder}}` interpolation, and correct plurals. Those are implemented
 * here in about a hundred lines, with `Intl.PluralRules` doing the part that is
 * genuinely hard.
 */

const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g

/**
 * Resolves a dotted key path against a locale tree.
 *
 * A leaf name may itself contain dots — the command bundle is written as
 * `{ "commands": { "file.new": "New Document" } }`, because a command's id *is*
 * `file.new` and splitting it into a nested object would make the two drift.
 * So at each level the longest literal match wins, and only what is left over
 * is treated as a further path.
 *
 * Without this, `t('commands.file.new')` walked to `commands` → `file`, found
 * nothing, and rendered the raw key.
 */
export function lookup(tree: LocaleTree, key: string): string | undefined {
  let node: LocaleTree = tree
  let segments = key.split('.')

  while (segments.length > 0) {
    let advanced = false

    for (let take = segments.length; take >= 1; take--) {
      const candidate = segments.slice(0, take).join('.')
      const next: string | LocaleTree | undefined = node[candidate]
      if (next === undefined) continue

      // The whole key is accounted for: this is the value, or nothing.
      if (take === segments.length) return typeof next === 'string' ? next : undefined

      // A prefix matched a subtree; carry on with the remainder.
      if (typeof next !== 'object' || next === null) return undefined
      node = next
      segments = segments.slice(take)
      advanced = true
      break
    }

    if (!advanced) return undefined
  }

  return undefined
}

/**
 * Picks the plural form for `count`.
 *
 * Russian needs one/few/many where English needs one/other, and Azerbaijani
 * needs only one form. `Intl.PluralRules` knows all of this per language, so
 * plural handling stays correct for languages added later without any code
 * change — the translator just supplies the `_few` / `_many` keys their
 * language requires.
 */
function pluralKey(tree: LocaleTree, key: string, count: number, language: string): string {
  let category: string
  try {
    category = new Intl.PluralRules(language).select(count)
  } catch {
    category = count === 1 ? 'one' : 'other'
  }

  const candidates = [`${key}_${category}`, `${key}_other`, key]
  for (const candidate of candidates) {
    if (lookup(tree, candidate) !== undefined) return candidate
  }

  return key
}

export function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template

  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = values[name]
    if (value === undefined || value === null) return match
    return typeof value === 'number' ? formatNumber(value) : String(value)
  })
}

let numberFormatter: Intl.NumberFormat | null = null
let numberFormatterLanguage = ''

function formatNumber(value: number): string {
  if (numberFormatter === null) return String(value)
  return numberFormatter.format(value)
}

/** Locale-aware number formatting used by every interpolated `{{count}}`. */
export function setNumberLocale(language: string): void {
  if (numberFormatterLanguage === language) return
  try {
    numberFormatter = new Intl.NumberFormat(language)
    numberFormatterLanguage = language
  } catch {
    numberFormatter = null
  }
}

/**
 * Builds the `t` function.
 *
 * A missing key falls back to English rather than rendering blank or throwing —
 * a partially translated locale must still produce a usable interface, which is
 * what makes user-contributed language files practical.
 */
export function createTranslator(options: TranslatorOptions): (
  key: string,
  values?: TranslationValues
) => string {
  const { language, messages, fallback, onMissing } = options
  setNumberLocale(language)

  return (key, values) => {
    const hasCount = typeof values?.count === 'number'
    const activeKey = hasCount ? pluralKey(messages, key, values.count as number, language) : key

    const translated = lookup(messages, activeKey)
    if (translated !== undefined) return interpolate(translated, values)

    const fallbackKey = hasCount
      ? pluralKey(fallback, key, values.count as number, 'en')
      : key
    const fallbackText = lookup(fallback, fallbackKey)

    if (fallbackText !== undefined) {
      onMissing?.(key)
      return interpolate(fallbackText, values)
    }

    onMissing?.(key)
    // Returning the key itself makes an untranslated string obvious in the UI
    // instead of silently rendering nothing.
    return key
  }
}

/** Flattens a tree to dotted keys, for coverage and template generation. */
export function flattenKeys(tree: LocaleTree, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith('$')) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') keys.push(path)
    else keys.push(...flattenKeys(value, path))
  }

  return keys
}

/** Share of `reference`'s keys that `messages` defines, 0–1. */
export function computeCoverage(messages: LocaleTree, reference: LocaleTree): number {
  const referenceKeys = flattenKeys(reference)
  if (referenceKeys.length === 0) return 1

  let present = 0
  for (const key of referenceKeys) {
    if (lookup(messages, key) !== undefined) present++
  }

  return present / referenceKeys.length
}
