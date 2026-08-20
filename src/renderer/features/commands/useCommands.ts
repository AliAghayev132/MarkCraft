// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useMemo } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { onMainEvent } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { buildCommandDefinitions } from './registry'
import {
  isTextEntryTarget,
  isTypableKey,
  matchesAccelerator,
  resolveShortcuts
} from './shortcuts'

import { keyboardIsClaimed } from './keyboard-owner'

// ── types ──────────────────────────────────────────────────────────────────
import { localizeCommand, type Command, type CommandContext } from './types'
import type { CommandRegistry } from './types'

/**
 * Builds the command registry and installs the global key handler.
 *
 * One listener on the document dispatches every shortcut. That keeps binding
 * logic in a single place, makes user rebinding trivial, and means the same
 * command can be invoked from the palette, a menu or a key without duplication.
 */
export function useCommands(context: CommandContext): CommandRegistry {
  const t = useT()
  const overrides = useAppSelector((state) => state.settings.values.keyboard.overrides)

  const registry = useMemo<CommandRegistry>(() => {
    const definitions = buildCommandDefinitions(context)
    const commands: Command[] = definitions.map((definition) => localizeCommand(definition, t))
    const shortcuts = resolveShortcuts(definitions, overrides)
    const byId = new Map<string, Command>(commands.map((command) => [command.id, command]))

    const run = (commandId: string): void => {
      const command = byId.get(commandId)
      if (!command) return
      if (command.enabled && !command.enabled()) return
      void command.run()
    }

    return { commands, shortcuts, byId, run }
  }, [context, overrides, t])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented) return

      /*
       * A modal owns the keyboard while it is up. Without this the canvas's
       * own Ctrl+Z reached the document behind it — and the person watching
       * the canvas saw nothing happen, because what changed was covered up.
       */
      if (keyboardIsClaimed()) return

      const hasModifier = event.ctrlKey || event.metaKey || event.altKey
      // A bare key inside a text field belongs to the field, not to a command —
      // unless it is one the field could never have typed anyway.
      if (!hasModifier && isTypableKey(event) && isTextEntryTarget(event.target)) return

      for (const [commandId, accelerator] of registry.shortcuts) {
        if (!matchesAccelerator(event, accelerator)) continue

        const command = registry.byId.get(commandId)
        if (!command) continue
        if (command.enabled && !command.enabled()) continue

        event.preventDefault()
        event.stopPropagation()
        void command.run()
        return
      }
    }

    // Capture phase so a command wins over an editor's own key handling for
    // the accelerators the application has claimed.
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [registry])

  /* Commands dispatched from the native macOS menu. */
  useEffect(
    () => onMainEvent('event:command', ({ commandId }) => registry.run(commandId)),
    [registry]
  )

  return registry
}
