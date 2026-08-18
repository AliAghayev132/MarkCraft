import { describe, expect, it } from 'vitest'

import { deepMerge } from '@main/util/json-store'

/**
 * The merge behind every settings write.
 *
 * Written after "reset all colours" turned out to do nothing: the merge can
 * only ever add keys, so a patch that omits one keeps the old value. That is
 * right for a fixed set of fields — a patch touching one setting must not wipe
 * its neighbours — and wrong for a map whose keys the user creates and deletes.
 */
describe('deepMerge', () => {
  it('patches one field without disturbing its neighbours', () => {
    const merged = deepMerge(
      { appearance: { theme: 'light', accent: 'teal' }, editor: { wrap: true } },
      { appearance: { theme: 'dark' } }
    )

    expect(merged).toEqual({
      appearance: { theme: 'dark', accent: 'teal' },
      editor: { wrap: true }
    })
  })

  it('keeps the known-good section when the patch is the wrong shape', () => {
    // Reachable: the settings file is user-editable by design.
    const merged = deepMerge({ appearance: { theme: 'light' } }, { appearance: 'broken' })
    expect(merged).toEqual({ appearance: { theme: 'light' } })
  })

  it('ignores an undefined patch value rather than erasing the field', () => {
    const merged = deepMerge({ a: 1, b: 2 }, { b: undefined })
    expect(merged).toEqual({ a: 1, b: 2 })
  })

  it('replaces arrays outright, because a merged array is never what was meant', () => {
    const merged = deepMerge({ rules: [1, 2, 3] }, { rules: [9] })
    expect(merged).toEqual({ rules: [9] })
  })

  describe('user-keyed maps', () => {
    const REPLACE = new Set(['appearance.customColors', 'keyboard.overrides'])

    it('cannot remove a key without being told the map is user-keyed', () => {
      const merged = deepMerge(
        { appearance: { customColors: { light: { accent: '#f00' } } } },
        { appearance: { customColors: { light: {} } } }
      )

      // The defect, preserved as a test: the colour survives its own removal.
      expect(merged.appearance.customColors.light).toEqual({ accent: '#f00' })
    })

    it('removes a key once the path is named', () => {
      const merged = deepMerge(
        { appearance: { customColors: { light: { accent: '#f00' }, dark: {} } } },
        { appearance: { customColors: { light: {}, dark: {} } } },
        REPLACE
      )

      expect(merged.appearance.customColors).toEqual({ light: {}, dark: {} })
    })

    it('replaces only the named path, leaving its siblings merged', () => {
      const merged = deepMerge(
        {
          appearance: { theme: 'light', customColors: { light: { accent: '#f00' }, dark: {} } },
          keyboard: { overrides: { save: 'Ctrl+S' } }
        },
        { appearance: { customColors: { light: {}, dark: {} } } },
        REPLACE
      )

      expect(merged.appearance.theme).toBe('light')
      expect(merged.appearance.customColors.light).toEqual({})
      expect(merged.keyboard.overrides).toEqual({ save: 'Ctrl+S' })
    })

    it('unbinds a single shortcut without clearing the rest', () => {
      const merged = deepMerge(
        { keyboard: { overrides: { save: 'Ctrl+S', open: 'Ctrl+O' } } },
        { keyboard: { overrides: { open: 'Ctrl+O' } } },
        REPLACE
      )

      expect(merged.keyboard.overrides).toEqual({ open: 'Ctrl+O' })
    })

    it('does not confuse a same-named key at another depth', () => {
      // `overrides` nested somewhere else must still merge normally.
      const merged = deepMerge(
        { icons: { overrides: { md: 'file' } }, keyboard: { overrides: { save: 'Ctrl+S' } } },
        { icons: { overrides: {} }, keyboard: { overrides: {} } },
        REPLACE
      )

      expect(merged.icons.overrides).toEqual({ md: 'file' })
      expect(merged.keyboard.overrides).toEqual({})
    })
  })
})
