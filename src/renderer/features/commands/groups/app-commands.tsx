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
    /*
     * The palette matches commands by substring, which is right for a name
     * typed in full; a file is not typed in full, and `usrv` for
     * `user-service.ts` finds nothing that way.
     *
     * Not on Ctrl+P, which is Print. Some editors take that key because they
     * never print; this one is for writing documents, where printing is an
     * ordinary thing to do and losing the key everybody knows for it would
     * surprise more people than gaining this one would please. Ctrl+T is the
     * other convention for "go to file", and it is free.
     */
    id: 'app.quickOpen',
    category: 'Application',
    shortcut: 'mod+t',
    run: () => context.openQuickOpen()
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
