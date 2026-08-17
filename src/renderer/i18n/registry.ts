// ── @i18n ──────────────────────────────────────────────────────────────────
import { computeCoverage } from '@i18n/translate'

// ── types ──────────────────────────────────────────────────────────────────
import { FALLBACK_LANGUAGE, type Locale, type LocaleMeta, type LocaleTree } from '@i18n/types'

/**
 * Locale discovery.
 *
 * Built-in locales are found by globbing `./locales/*.json` at build time, so
 * adding a language to the application is *only* adding a file — there is no
 * registration list to keep in sync and therefore no way to add a translation
 * and forget to wire it up.
 *
 * Custom locales are read at runtime from the user's data folder, which is what
 * lets someone add a language to an installed copy without rebuilding.
 */

type RawLocaleModule = LocaleTree & { $meta?: Partial<LocaleMeta> }

const builtinModules = import.meta.glob<RawLocaleModule>('./locales/*.json', {
  eager: true,
  import: 'default'
})

function metaFrom(code: string, raw: RawLocaleModule): LocaleMeta {
  const meta = raw.$meta ?? {}
  return {
    code: meta.code ?? code,
    name: meta.name ?? code,
    nativeName: meta.nativeName ?? meta.name ?? code,
    direction: meta.direction === 'rtl' ? 'rtl' : 'ltr',
    authors: meta.authors
  }
}

function codeFromPath(path: string): string {
  return path.replace(/^.*\//, '').replace(/\.json$/, '')
}

/** The English bundle, used as the fallback and as the coverage reference. */
export const referenceMessages: LocaleTree = (() => {
  for (const [path, raw] of Object.entries(builtinModules)) {
    if (codeFromPath(path) === FALLBACK_LANGUAGE) return raw as LocaleTree
  }
  throw new Error(`The ${FALLBACK_LANGUAGE} locale is required and was not found.`)
})()

const builtinLocales: Locale[] = Object.entries(builtinModules)
  .map(([path, raw]) => {
    const code = codeFromPath(path)
    return {
      meta: metaFrom(code, raw),
      messages: raw as LocaleTree,
      source: 'builtin' as const,
      coverage: computeCoverage(raw as LocaleTree, referenceMessages)
    }
  })
  .sort((a, b) => a.meta.name.localeCompare(b.meta.name))

/** Registry state: built-ins plus whatever custom locales were last loaded. */
let registry = new Map<string, Locale>(builtinLocales.map((locale) => [locale.meta.code, locale]))

export function listLocales(): Locale[] {
  return [...registry.values()].sort((a, b) => {
    // English first, then alphabetically by native name.
    if (a.meta.code === FALLBACK_LANGUAGE) return -1
    if (b.meta.code === FALLBACK_LANGUAGE) return 1
    return a.meta.nativeName.localeCompare(b.meta.nativeName)
  })
}

export function getLocale(code: string): Locale | undefined {
  return registry.get(code)
}

export function hasLocale(code: string): boolean {
  return registry.has(code)
}

/**
 * Merges user-supplied locales in, replacing any previous custom set.
 *
 * A custom file may override a built-in language (a user improving the Russian
 * translation, say) — that is deliberate, and the `source` marker keeps it
 * visible in the settings list.
 */
export function registerCustomLocales(
  files: { code: string; messages: LocaleTree }[]
): Locale[] {
  const next = new Map<string, Locale>(builtinLocales.map((locale) => [locale.meta.code, locale]))

  for (const file of files) {
    const raw = file.messages as RawLocaleModule
    const meta = metaFrom(file.code, raw)
    next.set(meta.code, {
      meta,
      messages: file.messages,
      source: 'custom',
      coverage: computeCoverage(file.messages, referenceMessages)
    })
  }

  registry = next
  return listLocales()
}

/**
 * Picks the best available locale for a preference.
 *
 * Handles the region-code case: a system language of `ru-RU` should find `ru`,
 * and `pt-BR` should fall back to `pt` if only that exists.
 */
export function resolveLanguage(preference: string, systemLanguage: string): string {
  const wanted = preference === 'system' ? systemLanguage : preference

  if (registry.has(wanted)) return wanted

  const base = wanted.split('-')[0] ?? ''
  if (base && registry.has(base)) return base

  for (const code of registry.keys()) {
    if (code.split('-')[0] === base) return code
  }

  return FALLBACK_LANGUAGE
}
