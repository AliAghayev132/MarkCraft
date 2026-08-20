// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import type { TranslateFn } from '@i18n'

export type CommandCategory =
  | 'File'
  | 'Edit'
  | 'Format'
  | 'View'
  | 'Insert'
  | 'Workspace'
  | 'Application'

/**
 * A command as *defined*: behaviour only, no display text.
 *
 * Titles are looked up from `commands.<id>` at render time rather than stored
 * here, which is what lets the palette, the shortcut editor and the menus all
 * follow a language change without the registry being rebuilt by every consumer.
 */
export interface CommandDefinition {
  id: string
  category: CommandCategory
  /** Default accelerator; users can rebind it in Settings → Keyboard. */
  shortcut?: string
  icon?: ReactElement
  /** Extra search terms for the palette, in English. */
  keywords?: string
  /** False hides the command from the palette and disables its shortcut. */
  enabled?: () => boolean
  /**
   * Return values are ignored. Handlers may forward straight to an action
   * function without a wrapper that discards the result.
   */
  run: () => unknown
}

/** A definition with its display text resolved for the active language. */
export interface Command extends CommandDefinition {
  title: string
  categoryLabel: string
}

/**
 * Everything the command layer needs from the application shell.
 *
 * Passing these in rather than importing the shell keeps the registry free of
 * React state and testable in isolation.
 */
export interface CommandContext {
  openCommandPalette: () => void
  openSettings: () => void
  openShortcuts: () => void
  openExport: () => void
  openShare: () => void
  openHistory: () => void
  openEmoji: () => void
  present: () => void
  openDevTools: () => void
  openLinks: () => void
  openWebsite: () => void
  cleanDocument: () => void
  openCodeLanguage: () => void
  pasteAsMarkdown: () => void
  reviewDocument: () => void
  openBook: () => void
  openStudy: () => void
  openCanvas: () => void
  /** Lays the open document out as a canvas beside it. */
  documentToCanvas: () => void
  toggleLock: () => void
  openHttp: () => void
  openHelp: () => void
  openStatistics: () => void
  openTemplates: () => void
  openFind: (replace: boolean) => void
  openGoToLine: () => void
  print: () => void
}

export type CommandGroupFactory = (context: CommandContext) => CommandDefinition[]

/** Resolves display text for a definition. */
export function localizeCommand(definition: CommandDefinition, t: TranslateFn): Command {
  return {
    ...definition,
    title: t(`commands.${definition.id}`),
    categoryLabel: t(`commands.categories.${definition.category}`)
  }
}


export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  commands: Command[]
  shortcuts: Map<string, string>
}

/**
 * Accelerator handling.
 *
 * Accelerators are stored in a platform-neutral form ("mod+shift+p") and
 * resolved at match time, so a single definition works on Windows, Linux and
 * macOS and can be rebound by the user without any per-platform bookkeeping.
 */

export interface ParsedAccelerator {
  key: string
  mod: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export interface CommandRegistry {
  commands: Command[]
  shortcuts: Map<string, string>
  byId: Map<string, Command>
  run: (commandId: string) => void
}
