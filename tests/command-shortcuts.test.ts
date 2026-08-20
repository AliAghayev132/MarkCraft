// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'

import { pinPlatform } from './helpers/platform'

// The commands' accelerators are written as `mod+…`; pinned so the expected
// spelling is Ctrl wherever this runs.
pinPlatform('Win32')

const { buildCommandDefinitions, claimKeyboard, keyboardIsClaimed } = await import('@features/commands')
const { findConflicts, parseAccelerator, resolveShortcuts } = await import(
  '@features/commands'
)
const { flattenKeys, lookup } = await import('@i18n/translate')
const en = (await import('@i18n/locales/en.json')).default

/**
 * The default key map, checked as a whole.
 *
 * Two commands on one accelerator is not a warning in this application — it is
 * a dead feature, because only one of them can ever fire and which one depends
 * on registration order. Settings → Keyboard shows conflicts a *user* creates;
 * nothing was checking the ones we shipped with, and there were three.
 */

/** The commands are defined against a context; none of it is called here. */
const noop = (): void => undefined
const definitions = buildCommandDefinitions({
  openCommandPalette: noop,
  openSettings: noop,
  openShortcuts: noop,
  openExport: noop,
  openShare: noop,
  openStatistics: noop,
  openTemplates: noop,
  openFind: noop,
  openGoToLine: noop,
  print: noop
})

describe('default shortcuts', () => {
  it('binds a reasonable number of commands', () => {
    expect(definitions.length).toBeGreaterThan(40)
  })

  it('has no two commands on the same accelerator', () => {
    const conflicts = findConflicts(resolveShortcuts(definitions, {}))
    const described = [...conflicts].map(([key, ids]) => `${key} → ${ids.join(' + ')}`)

    expect(described, `${described.length} conflicting default binding(s)`).toEqual([])
  })

  it('binds only accelerators that parse', () => {
    const unparsed = definitions
      .filter((command) => command.shortcut)
      .filter((command) => parseAccelerator(command.shortcut as string) === null)
      .map((command) => `${command.id} → ${command.shortcut}`)

    expect(unparsed).toEqual([])
  })

  it('gives every command a unique id', () => {
    const ids = definitions.map((command) => command.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('command titles', () => {
  it('has an English title for every command', () => {
    const untitled = definitions
      .map((command) => command.id)
      .filter((id) => lookup(en, `commands.${id}`) === undefined)

    expect(untitled, `${untitled.length} command(s) would render as a raw key`).toEqual([])
  })

  it('has a title for every category a command declares', () => {
    const categories = [...new Set(definitions.map((command) => command.category))]
    const missing = categories.filter(
      (category) => lookup(en, `commands.categories.${category}`) === undefined
    )

    expect(missing).toEqual([])
  })

  it('declares no command title that no command uses', () => {
    const ids = new Set(definitions.map((command) => command.id))

    const orphans = flattenKeys(en)
      .filter((key) => key.startsWith('commands.'))
      .map((key) => key.slice('commands.'.length))
      .filter((id) => !id.startsWith('categories'))
      .filter((id) => !ids.has(id))

    expect(orphans, `${orphans.length} unused command string(s)`).toEqual([])
  })
})

describe('who owns the keyboard', () => {
  /*
   * The registry listens on `document` in the capture phase and stops the event
   * once it matches — which is right, and is what lets a command win over an
   * editor's own key handling. It was wrong the moment something modal was on
   * top: with a document open behind it, Ctrl+Z on the canvas undid an edit in
   * the document, Ctrl+S saved the document, and Ctrl+A selected its text.
   *
   * None of it was visible, because what changed was covered up — and it only
   * happened when a document happened to be open, which is why it survived
   * every check that opened the canvas on its own.
   */
  it('is nobody in particular to start with', () => {
    expect(keyboardIsClaimed()).toBe(false)
  })

  it('is the modal that claimed it', () => {
    const release = claimKeyboard()
    expect(keyboardIsClaimed()).toBe(true)

    release()
    expect(keyboardIsClaimed()).toBe(false)
  })

  it('stays claimed while two of them are stacked', () => {
    const first = claimKeyboard()
    const second = claimKeyboard()

    first()
    expect(keyboardIsClaimed()).toBe(true)

    second()
    expect(keyboardIsClaimed()).toBe(false)
  })

  it('survives a release being called twice', () => {
    // React runs an effect's cleanup twice in development, and a count that
    // went negative would hand the keyboard back for good.
    const first = claimKeyboard()
    const second = claimKeyboard()

    first()
    first()
    expect(keyboardIsClaimed()).toBe(true)

    second()
    expect(keyboardIsClaimed()).toBe(false)
  })
})
