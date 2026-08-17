import { describe, expect, it } from 'vitest'

import {
  SETTINGS_CATALOGUE,
  groupHits,
  searchSettings
} from '@features/settings'
import { referenceMessages } from '@i18n/registry'
import { createTranslator, lookup } from '@i18n/translate'

/**
 * The real English bundle and the real translator, so the test fails if a
 * catalogue entry points at a key nobody ever wrote — a broken label would
 * otherwise only show up as a raw dotted key in the running application.
 */
const missing: string[] = []

const t = createTranslator({
  language: 'en',
  messages: referenceMessages,
  fallback: referenceMessages,
  onMissing: (key) => missing.push(key)
})

describe('settings catalogue', () => {
  it('has a translation for every label and hint', () => {
    for (const entry of SETTINGS_CATALOGUE) {
      expect(lookup(referenceMessages, entry.labelKey), `${entry.id} → ${entry.labelKey}`).toBeTypeOf(
        'string'
      )
      if (entry.hintKey) {
        expect(
          lookup(referenceMessages, entry.hintKey),
          `${entry.id} → ${entry.hintKey}`
        ).toBeTypeOf('string')
      }
    }
  })

  it('uses a unique id per setting', () => {
    const ids = SETTINGS_CATALOGUE.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('names a section every setting can be found under', () => {
    for (const entry of SETTINGS_CATALOGUE) {
      expect(lookup(referenceMessages, `settings.nav.${entry.section}`)).toBeTypeOf('string')
    }
  })
})

describe('searchSettings', () => {
  it('returns nothing for an empty query', () => {
    expect(searchSettings('', t)).toEqual([])
    expect(searchSettings('   ', t)).toEqual([])
  })

  it('matches the translated label', () => {
    expect(searchSettings('line height', t).map((hit) => hit.entry.id)).toContain(
      'editor.lineHeight'
    )
  })

  it('is case insensitive', () => {
    expect(searchSettings('THEME', t).map((hit) => hit.entry.id)).toContain('appearance.theme')
  })

  it('matches English keywords the label never mentions', () => {
    // "hotkey" appears in no label — only in the keywords.
    expect(searchSettings('hotkey', t).map((hit) => hit.entry.id)).toContain('keyboard.shortcuts')
  })

  it('matches the hint text', () => {
    expect(searchSettings('Folders are always shown', t).map((hit) => hit.entry.id)).toContain(
      'files.markdownOnly'
    )
  })

  it('finds settings by the section they live in', () => {
    const hits = searchSettings('markdown', t)
    expect(hits.some((hit) => hit.entry.section === 'markdown')).toBe(true)
  })

  it('reports the label so a result can name itself', () => {
    const hit = searchSettings('line height', t).find((it) => it.entry.id === 'editor.lineHeight')
    expect(hit?.label).toBe(lookup(referenceMessages, 'settings.editor.lineHeight'))
  })

  it('never falls back for a catalogue key', () => {
    for (const entry of SETTINGS_CATALOGUE) {
      t(entry.labelKey)
      if (entry.hintKey) t(entry.hintKey)
    }
    expect(missing).toEqual([])
  })
})

describe('groupHits', () => {
  it('buckets hits by section without losing any', () => {
    const hits = searchSettings('e', t)
    const grouped = groupHits(hits)

    const total = [...grouped.values()].reduce((sum, list) => sum + list.length, 0)
    expect(total).toBe(hits.length)

    for (const [section, list] of grouped) {
      for (const hit of list) expect(hit.entry.section).toBe(section)
    }
  })

  it('is empty when nothing matches', () => {
    expect(groupHits(searchSettings('zzzznotasetting', t)).size).toBe(0)
  })
})
