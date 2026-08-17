// ── @features ──────────────────────────────────────────────────────────────
import { appCommands, editCommands, fileCommands, formatCommands, viewCommands } from './groups'

// ── types ──────────────────────────────────────────────────────────────────
import type { CommandContext, CommandDefinition } from './types'

/**
 * The command registry.
 *
 * Every user-triggerable action is defined exactly once, in one of the group
 * modules, and the palette, the keyboard shortcuts and the menus are all just
 * different front-ends onto this list. Adding a feature means adding one entry
 * — not wiring three call sites — and it is why a shortcut can be rebound
 * without touching any UI.
 *
 * Definitions carry no display text: titles are looked up from
 * `commands.<id>` at render time so the whole registry follows a language
 * change for free.
 */
const GROUPS = [fileCommands, editCommands, formatCommands, viewCommands, appCommands]

export function buildCommandDefinitions(context: CommandContext): CommandDefinition[] {
  return GROUPS.flatMap((group) => group(context))
}
