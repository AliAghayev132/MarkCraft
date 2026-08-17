// ── @lib ───────────────────────────────────────────────────────────────────
import { Keyboard, Settings as SettingsIcon } from '@icons'

// ── types ──────────────────────────────────────────────────────────────────
import type { CommandDefinition, CommandGroupFactory } from '@features/commands'

/** Application-level surfaces: the palette, settings, shortcut help. */
export const appCommands: CommandGroupFactory = (context): CommandDefinition[] => [
  {
    id: 'app.commandPalette',
    category: 'Application',
    shortcut: 'mod+shift+p',
    run: () => context.openCommandPalette()
  },
  {
    id: 'app.settings',
    category: 'Application',
    shortcut: 'mod+,',
    icon: <SettingsIcon size={14} />,
    run: () => context.openSettings()
  },
  {
    id: 'app.shortcuts',
    category: 'Application',
    shortcut: 'mod+/',
    icon: <Keyboard size={14} />,
    run: () => context.openShortcuts()
  }
]
