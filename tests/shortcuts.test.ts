import { beforeAll, describe, expect, it } from 'vitest'

// `shortcuts.ts` reads `navigator.platform` when it loads, so a stub has to be
// in place before the module is imported.
beforeAll(() => {
  if (typeof globalThis.navigator === 'undefined') {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      configurable: true
    })
  }
})

const {
  findConflicts,
  formatAccelerator,
  isTypableKey,
  matchesAccelerator,
  parseAccelerator,
  resolveShortcuts
} = await import('@features/commands')

function keyEvent(init: Partial<KeyboardEvent> & { key: string }): KeyboardEvent {
  return {
    key: init.key,
    code: init.code ?? '',
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    altKey: init.altKey ?? false,
    shiftKey: init.shiftKey ?? false
  } as KeyboardEvent
}

describe('parseAccelerator', () => {
  it('splits modifiers from the key', () => {
    expect(parseAccelerator('mod+shift+p')).toMatchObject({
      key: 'p',
      mod: true,
      shift: true,
      alt: false
    })
  })

  it('returns null when there is no key', () => {
    expect(parseAccelerator('mod+shift')).toBeNull()
    expect(parseAccelerator('')).toBeNull()
  })
})

describe('matchesAccelerator', () => {
  it('matches mod as Ctrl on non-mac platforms', () => {
    expect(matchesAccelerator(keyEvent({ key: 's', ctrlKey: true }), 'mod+s')).toBe(true)
    expect(matchesAccelerator(keyEvent({ key: 's' }), 'mod+s')).toBe(false)
  })

  it('requires every modifier to match exactly', () => {
    // Ctrl+Shift+S must not fire the plain Ctrl+S binding.
    expect(matchesAccelerator(keyEvent({ key: 's', ctrlKey: true, shiftKey: true }), 'mod+s')).toBe(
      false
    )
    expect(
      matchesAccelerator(keyEvent({ key: 's', ctrlKey: true, shiftKey: true }), 'mod+shift+s')
    ).toBe(true)
  })

  it('is case-insensitive for letter keys', () => {
    expect(
      matchesAccelerator(keyEvent({ key: 'Z', ctrlKey: true, shiftKey: true }), 'mod+shift+z')
    ).toBe(true)
  })

  it('falls back to the physical key code', () => {
    expect(
      matchesAccelerator(keyEvent({ key: 'Dead', code: 'KeyB', ctrlKey: true }), 'mod+b')
    ).toBe(true)
    expect(
      matchesAccelerator(keyEvent({ key: '±', code: 'Digit1', ctrlKey: true }), 'mod+1')
    ).toBe(true)
  })
})

describe('formatAccelerator', () => {
  it('renders a readable label', () => {
    expect(formatAccelerator('mod+shift+p')).toBe('Ctrl+Shift+P')
    expect(formatAccelerator('mod+arrowright')).toBe('Ctrl+→')
  })
})

describe('resolveShortcuts', () => {
  const commands = [
    { id: 'a', title: 'A', category: 'Edit' as const, shortcut: 'mod+a', run: () => undefined },
    { id: 'b', title: 'B', category: 'Edit' as const, shortcut: 'mod+b', run: () => undefined },
    { id: 'c', title: 'C', category: 'Edit' as const, run: () => undefined }
  ]

  it('uses defaults when there are no overrides', () => {
    const resolved = resolveShortcuts(commands, {})
    expect(resolved.get('a')).toBe('mod+a')
    expect(resolved.has('c')).toBe(false)
  })

  it('applies a user override', () => {
    const resolved = resolveShortcuts(commands, { a: 'mod+alt+a' })
    expect(resolved.get('a')).toBe('mod+alt+a')
  })

  it('treats a null override as unbound', () => {
    const resolved = resolveShortcuts(commands, { a: null })
    expect(resolved.has('a')).toBe(false)
  })

  it('can bind a command that had no default', () => {
    const resolved = resolveShortcuts(commands, { c: 'mod+shift+c' })
    expect(resolved.get('c')).toBe('mod+shift+c')
  })
})

describe('findConflicts', () => {
  it('reports accelerators bound to more than one command', () => {
    const conflicts = findConflicts(
      new Map([
        ['a', 'mod+k'],
        ['b', 'mod+k'],
        ['c', 'mod+j']
      ])
    )

    expect(conflicts.get('mod+k')).toEqual(['a', 'b'])
    expect(conflicts.has('mod+j')).toBe(false)
  })
})

describe('isTypableKey', () => {
  it('treats ordinary keys as belonging to a focused text field', () => {
    for (const key of ['a', '5', ' ', 'Enter', 'Backspace']) {
      expect(isTypableKey(keyEvent({ key }))).toBe(true)
    }
  })

  /*
   * F5 is pressed while writing — the caret is in the editor every time — so a
   * guard that hands every bare key to the focused field would make the
   * presentation shortcut unreachable in the only situation it is used.
   */
  it('lets function keys through a focused text field', () => {
    for (const key of ['F1', 'F5', 'F11', 'F12', 'F24']) {
      expect(isTypableKey(keyEvent({ key }))).toBe(false)
    }
  })

  it('does not mistake other f-prefixed keys for function keys', () => {
    for (const key of ['f', 'f0', 'F25', 'Find']) {
      expect(isTypableKey(keyEvent({ key }))).toBe(true)
    }
  })
})
