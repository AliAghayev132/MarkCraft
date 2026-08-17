// ── types ──────────────────────────────────────────────────────────────────
import type { CommandDefinition, ParsedAccelerator } from './types'

const IS_MAC = navigator.platform.toLowerCase().includes('mac')

export function parseAccelerator(accelerator: string): ParsedAccelerator | null {
  const parts = accelerator
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return null

  const parsed: ParsedAccelerator = {
    key: '',
    mod: false,
    ctrl: false,
    alt: false,
    shift: false,
    meta: false
  }

  for (const part of parts) {
    switch (part) {
      case 'mod':
      case 'cmdorctrl':
        parsed.mod = true
        break
      case 'ctrl':
      case 'control':
        parsed.ctrl = true
        break
      case 'alt':
      case 'option':
        parsed.alt = true
        break
      case 'shift':
        parsed.shift = true
        break
      case 'cmd':
      case 'meta':
      case 'super':
        parsed.meta = true
        break
      default:
        parsed.key = part
    }
  }

  return parsed.key ? parsed : null
}

function normalizeEventKey(event: KeyboardEvent): string {
  const key = event.key.toLowerCase()
  if (key === ' ') return 'space'
  if (key === 'esc') return 'escape'
  return key
}

export function matchesAccelerator(event: KeyboardEvent, accelerator: string): boolean {
  const parsed = parseAccelerator(accelerator)
  if (!parsed) return false

  const expectedCtrl = parsed.ctrl || (parsed.mod && !IS_MAC)
  const expectedMeta = parsed.meta || (parsed.mod && IS_MAC)

  if (event.ctrlKey !== expectedCtrl) return false
  if (event.metaKey !== expectedMeta) return false
  if (event.altKey !== parsed.alt) return false
  if (event.shiftKey !== parsed.shift) return false

  const eventKey = normalizeEventKey(event)

  // `mod+shift+z` arrives as "Z" on most layouts; compare case-insensitively
  // and also accept the physical code for digits and letters.
  if (eventKey === parsed.key) return true
  if (parsed.key.length === 1 && event.code.toLowerCase() === `key${parsed.key}`) return true
  if (/^\d$/.test(parsed.key) && event.code.toLowerCase() === `digit${parsed.key}`) return true

  return false
}

/** Human-facing form used in menus, tooltips and the palette. */
export function formatAccelerator(accelerator: string): string {
  const parsed = parseAccelerator(accelerator)
  if (!parsed) return accelerator

  const parts: string[] = []
  if (parsed.mod) parts.push(IS_MAC ? 'Cmd' : 'Ctrl')
  if (parsed.ctrl && !parsed.mod) parts.push('Ctrl')
  if (parsed.meta && !parsed.mod) parts.push('Cmd')
  if (parsed.alt) parts.push(IS_MAC ? 'Alt' : 'Alt')
  if (parsed.shift) parts.push('Shift')

  const key = parsed.key
  const label =
    key.startsWith('arrow')
      ? { arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' }[key] ?? key
      : key.length === 1
        ? key.toUpperCase()
        : key.charAt(0).toUpperCase() + key.slice(1)

  parts.push(label)
  return parts.join('+')
}

/**
 * Resolves each command's effective accelerator, applying the user's overrides
 * from Settings → Keyboard. `null` in the overrides means "unbound".
 */
export function resolveShortcuts(
  commands: CommandDefinition[],
  overrides: Record<string, string | null>
): Map<string, string> {
  const resolved = new Map<string, string>()

  for (const command of commands) {
    if (command.id in overrides) {
      const override = overrides[command.id]
      if (override) resolved.set(command.id, override)
      continue
    }
    if (command.shortcut) resolved.set(command.id, command.shortcut)
  }

  return resolved
}

/** Finds commands that would fire on the same key combination. */
export function findConflicts(shortcuts: Map<string, string>): Map<string, string[]> {
  const byAccelerator = new Map<string, string[]>()

  for (const [commandId, accelerator] of shortcuts) {
    const key = accelerator.toLowerCase()
    const existing = byAccelerator.get(key) ?? []
    existing.push(commandId)
    byAccelerator.set(key, existing)
  }

  const conflicts = new Map<string, string[]>()
  for (const [accelerator, ids] of byAccelerator) {
    if (ids.length > 1) conflicts.set(accelerator, ids)
  }

  return conflicts
}

/**
 * True when the event target is a place where a bare key should type text
 * rather than trigger a command. Accelerators with a modifier still fire —
 * Ctrl+S must work while the caret is in the editor.
 */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

const FUNCTION_KEY = /^f([1-9]|1\d|2[0-4])$/

/**
 * True when a bare press of this key could put a character into a text field.
 *
 * Function keys cannot, so a focused field has no claim on them. That matters
 * for the ones a user only ever presses *while writing* — F5 has to start the
 * presentation from inside the editor, which is the single place the caret is
 * when they reach for it.
 */
export function isTypableKey(event: KeyboardEvent): boolean {
  return !FUNCTION_KEY.test(event.key.toLowerCase())
}

export { IS_MAC }
