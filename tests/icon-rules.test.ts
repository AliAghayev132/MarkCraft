import { describe, expect, it } from 'vitest'

import {
  CUSTOM_ICON_PREFIX,
  ICON_COLORS,
  ICON_LIBRARY,
  customIconId,
  isCustomIcon,
  resolveIconRule,
  type IconRule,
  type IconSubject
} from '@shared'

/**
 * Rule precedence is the part users notice when it is wrong: recolouring one
 * folder must not be silently overruled by an older "all folders named X" rule,
 * and vice versa.
 */

function rule(partial: Partial<IconRule> & Pick<IconRule, 'match' | 'value'>): IconRule {
  return {
    id: `${partial.match}:${partial.value}`,
    target: 'any',
    icon: null,
    color: 'red',
    ...partial
  }
}

const notesFolder: IconSubject = {
  kind: 'directory',
  name: 'notes',
  path: 'C:/w/notes',
  ext: ''
}

const readme: IconSubject = {
  kind: 'file',
  name: 'README.md',
  path: 'C:/w/README.md',
  ext: 'md'
}

describe('resolveIconRule', () => {
  it('returns null when nothing matches', () => {
    expect(resolveIconRule([], readme)).toBeNull()
    expect(resolveIconRule([rule({ match: 'extension', value: 'txt' })], readme)).toBeNull()
  })

  it('matches an extension with or without the leading dot', () => {
    expect(resolveIconRule([rule({ match: 'extension', value: 'md' })], readme)).not.toBeNull()
    expect(resolveIconRule([rule({ match: 'extension', value: '.md' })], readme)).not.toBeNull()
    expect(resolveIconRule([rule({ match: 'extension', value: 'MD' })], readme)).not.toBeNull()
  })

  it('matches a name case-insensitively', () => {
    expect(resolveIconRule([rule({ match: 'name', value: 'NOTES' })], notesFolder)).not.toBeNull()
  })

  it('matches a path case-insensitively', () => {
    expect(
      resolveIconRule([rule({ match: 'path', value: 'c:/W/NOTES' })], notesFolder)
    ).not.toBeNull()
  })

  it('prefers the path rule over name and extension', () => {
    const winner = resolveIconRule(
      [
        rule({ match: 'extension', value: 'md', color: 'blue' }),
        rule({ match: 'path', value: 'C:/w/README.md', color: 'green' }),
        rule({ match: 'name', value: 'README.md', color: 'teal' })
      ],
      readme
    )

    expect(winner?.color).toBe('green')
  })

  it('prefers a name rule over an extension rule', () => {
    const winner = resolveIconRule(
      [
        rule({ match: 'extension', value: 'md', color: 'blue' }),
        rule({ match: 'name', value: 'README.md', color: 'teal' })
      ],
      readme
    )

    expect(winner?.color).toBe('teal')
  })

  it('honours the target so a folder rule cannot hit a file', () => {
    const rules = [rule({ match: 'name', value: 'README.md', target: 'directory' })]
    expect(resolveIconRule(rules, readme)).toBeNull()
  })

  it('applies a directory-targeted rule to a directory', () => {
    const rules = [rule({ match: 'name', value: 'notes', target: 'directory' })]
    expect(resolveIconRule(rules, notesFolder)).not.toBeNull()
  })

  it('never matches an extension rule against a directory', () => {
    const rules = [rule({ match: 'extension', value: '', target: 'any' })]
    expect(resolveIconRule(rules, notesFolder)).toBeNull()
  })
})

describe('custom icon references', () => {
  it('recognises and unwraps a custom reference', () => {
    const reference = `${CUSTOM_ICON_PREFIX}my-icon`
    expect(isCustomIcon(reference)).toBe(true)
    expect(customIconId(reference)).toBe('my-icon')
  })

  it('does not mistake a library name for a custom one', () => {
    expect(isCustomIcon('folder')).toBe(false)
    expect(isCustomIcon(null)).toBe(false)
  })
})

describe('icon library', () => {
  it('has no duplicate names', () => {
    expect(new Set(ICON_LIBRARY).size).toBe(ICON_LIBRARY.length)
  })

  it('gives every colour both a light and a dark value', () => {
    for (const [name, pair] of Object.entries(ICON_COLORS)) {
      expect(pair.light, name).toMatch(/^#[0-9a-f]{6}$/i)
      expect(pair.dark, name).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
