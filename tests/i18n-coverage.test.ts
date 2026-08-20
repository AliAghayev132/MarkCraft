import { describe, expect, it } from 'vitest'

import az from '@i18n/locales/az.json'
import en from '@i18n/locales/en.json'
import ru from '@i18n/locales/ru.json'
import { flattenKeys, lookup } from '@i18n/translate'

import type { LocaleTree } from '@i18n/types'

/**
 * English is the reference: a key it has and a translation lacks falls back at
 * runtime, which is *usable* but invisible — nobody notices a missing string
 * until a user reports an English word in a Russian menu.
 *
 * This is the check that makes the fallback a safety net rather than a hiding
 * place. It runs on the built-in locales only; user-supplied files are expected
 * to be partial and show a coverage badge instead.
 */

const reference = en as LocaleTree
const translations: [string, LocaleTree][] = [
  ['az', az as LocaleTree],
  ['ru', ru as LocaleTree]
]

const referenceKeys = flattenKeys(reference)

/** The forms `Intl.PluralRules` can ask for, appended by `pluralKey`. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

describe('built-in locales', () => {
  it('has a non-trivial reference to compare against', () => {
    expect(referenceKeys.length).toBeGreaterThan(200)
  })

  for (const [code, tree] of translations) {
    describe(code, () => {
      it('translates every key English defines', () => {
        const missing = referenceKeys.filter((key) => lookup(tree, key) === undefined)
        expect(missing, `${code} is missing ${missing.length} key(s)`).toEqual([])
      })

      it('defines no key English does not', () => {
        // A key with no English counterpart is dead weight: nothing looks it up,
        // and it will not be noticed when the string it belonged to is removed.
        //
        // Plural variants are the exception, and the point of the design:
        // Russian needs `_few` and `_many` where English needs neither, so
        // `Intl.PluralRules` picks the form and the translator supplies it.
        const known = new Set(referenceKeys)
        const extra = flattenKeys(tree)
          .filter((key) => !PLURAL_SUFFIX.test(key))
          .filter((key) => !known.has(key))

        expect(extra, `${code} has ${extra.length} orphan key(s)`).toEqual([])
      })

      it('keeps every placeholder the English string uses', () => {
        // `{{count}}` disappearing from a translation renders a sentence with a
        // hole in it, which no fallback catches because the key exists.
        const broken: string[] = []

        for (const key of referenceKeys) {
          const source = lookup(reference, key)
          const target = lookup(tree, key)
          if (typeof source !== 'string' || typeof target !== 'string') continue

          const placeholders = [...source.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])
          for (const name of placeholders) {
            if (!target.includes(`{{${name}}}`)) broken.push(`${key} → {{${name}}}`)
          }
        }

        expect(broken).toEqual([])
      })

      it('leaves no string empty', () => {
        const blank = flattenKeys(tree).filter((key) => {
          const value = lookup(tree, key)
          return typeof value === 'string' && value.trim() === ''
        })
        expect(blank).toEqual([])
      })
    })
  }
})

/**
 * The regression this file was written to catch.
 *
 * Command bundles are stored as `{ "commands": { "file.new": "…" } }` — the
 * leaf name *is* the command id, dots and all, so that the two cannot drift.
 * A resolver that only splits on dots walks to `commands` → `file`, finds
 * nothing, and renders the raw key: every command title in the palette, the
 * menus and the shortcut editor silently became `commands.file.new`.
 */
describe('lookup', () => {
  it('resolves a nested path', () => {
    expect(lookup(reference, 'settings.editor.fontSize')).toBeTypeOf('string')
  })

  it('resolves a leaf name that contains dots', () => {
    expect(lookup(reference, 'commands.file.new')).toBe('New Document')
    expect(lookup(reference, 'commands.view.zoomIn')).toBeTypeOf('string')
  })

  it('still resolves a nested key living beside dotted ones', () => {
    expect(lookup(reference, 'commands.categories.File')).toBe('File')
  })

  it('returns undefined for a key that is not there', () => {
    expect(lookup(reference, 'commands.file.doesNotExist')).toBeUndefined()
    expect(lookup(reference, 'nope')).toBeUndefined()
  })

  it('returns undefined when the path stops on a subtree', () => {
    expect(lookup(reference, 'settings')).toBeUndefined()
  })

  it('resolves every key the reference declares', () => {
    const unreachable = referenceKeys.filter((key) => lookup(reference, key) === undefined)
    expect(unreachable, `${unreachable.length} key(s) cannot be looked up`).toEqual([])
  })
})

describe('placeholders', () => {
  /*
   * The syntax is `{{name}}`. A single-braced `{name}` is not a placeholder,
   * it is literal text — and it renders as literal text, in front of the user,
   * with no warning anywhere. That is exactly how it shipped: a selection
   * counter that read "{count} selected" instead of "3 selected", found by
   * driving the interface rather than by reading the file.
   */
  const PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g
  const SINGLE_BRACE = /(?<!\{)\{\s*\w+\s*\}(?!\})/

  const named = (text: string): string[] =>
    [...text.matchAll(PLACEHOLDER)].map((match) => match[1]).sort()

  for (const [language, tree] of [['en', reference], ...translations] as [string, LocaleTree][]) {
    it(`${language} has no single-braced text pretending to be a placeholder`, () => {
      const offenders = flattenKeys(tree)
        .filter((key) => {
          const value = lookup(tree, key)
          return typeof value === 'string' && SINGLE_BRACE.test(value)
        })
        .map((key) => `${key}: ${String(lookup(tree, key))}`)

      expect(offenders).toEqual([])
    })
  }

  for (const [language, tree] of translations) {
    it(`${language} interpolates exactly what English does`, () => {
      // A translation that drops a placeholder loses information; one that
      // invents a placeholder renders the braces, because nothing will be
      // passed for a name the call site has never heard of.
      const mismatched = flattenKeys(reference)
        .filter((key) => {
          const source = lookup(reference, key)
          const target = lookup(tree, key)
          if (typeof source !== 'string' || typeof target !== 'string') return false
          return named(source).join() !== named(target).join()
        })
        .map((key) => key)

      expect(mismatched).toEqual([])
    })
  }
})
