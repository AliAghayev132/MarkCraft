// ── @i18n ──────────────────────────────────────────────────────────────────
import type { TranslateFn } from '@i18n'

// ── types ──────────────────────────────────────────────────────────────────
import type { SettingEntry, SettingsSearchHit, SettingsSectionId } from './types'

/**
 * The searchable catalogue of settings.
 *
 * A flat list rather than something derived from the rendered tree: search has
 * to work across *all* sections, including the ones not currently mounted, and
 * a user typing "font" should be told it lives under Editor without that
 * section having to render first.
 *
 * Adding a setting means adding a row here and a `<SettingsRow id="…">` in the
 * section — the shared id is what ties the two together.
 */
export const SETTINGS_CATALOGUE: SettingEntry[] = [
  // ── Editor ───────────────────────────────────────────────────────────────
  { id: 'editor.fontFamily', section: 'editor', labelKey: 'settings.editor.fontFamily', keywords: 'typeface monospace' },
  { id: 'editor.fontSize', section: 'editor', labelKey: 'settings.editor.fontSize', keywords: 'size zoom bigger smaller' },
  { id: 'editor.lineHeight', section: 'editor', labelKey: 'settings.editor.lineHeight', keywords: 'spacing leading' },
  { id: 'editor.tabSize', section: 'editor', labelKey: 'settings.editor.tabSize', keywords: 'indent width' },
  { id: 'editor.insertSpaces', section: 'editor', labelKey: 'settings.editor.insertSpaces', keywords: 'indent tabs' },
  { id: 'editor.wordWrap', section: 'editor', labelKey: 'settings.editor.wordWrap', keywords: 'wrap lines' },
  { id: 'editor.lineNumbers', section: 'editor', labelKey: 'settings.editor.lineNumbers', keywords: 'gutter' },
  { id: 'editor.highlightActiveLine', section: 'editor', labelKey: 'settings.editor.highlightActiveLine' },
  { id: 'editor.bracketMatching', section: 'editor', labelKey: 'settings.editor.bracketMatching', keywords: 'parentheses close' },
  { id: 'editor.autoIndent', section: 'editor', labelKey: 'settings.editor.autoIndent' },
  { id: 'editor.spellCheck', section: 'editor', labelKey: 'settings.editor.spellCheck', keywords: 'spelling dictionary' },

  // ── Appearance ───────────────────────────────────────────────────────────
  { id: 'appearance.theme', section: 'appearance', labelKey: 'settings.appearance.theme', keywords: 'dark light system colour scheme' },
  { id: 'appearance.accent', section: 'appearance', labelKey: 'settings.appearance.accent', keywords: 'colour color highlight' },
  { id: 'appearance.density', section: 'appearance', labelKey: 'settings.appearance.density', keywords: 'compact comfortable spacing' },
  { id: 'appearance.uiScale', section: 'appearance', labelKey: 'settings.appearance.uiScale', hintKey: 'settings.appearance.uiScaleHint', keywords: 'zoom scale bigger smaller sidebar icons text ctrl plus minus' },
  { id: 'appearance.splashScreen', section: 'appearance', labelKey: 'settings.appearance.splashScreen', hintKey: 'settings.appearance.startupHint', keywords: 'launch startup logo boot' },
  { id: 'appearance.startupSound', section: 'appearance', labelKey: 'settings.appearance.startupSound', keywords: 'sound audio chime launch startup mute' },
  { id: 'appearance.sidebarVisible', section: 'appearance', labelKey: 'settings.appearance.showSidebar', keywords: 'panel explorer' },
  { id: 'appearance.toolbarVisible', section: 'appearance', labelKey: 'settings.appearance.showToolbar', keywords: 'formatting bar' },
  { id: 'appearance.statusBarVisible', section: 'appearance', labelKey: 'settings.appearance.showStatusBar', keywords: 'word count' },
  { id: 'appearance.reduceMotion', section: 'appearance', labelKey: 'settings.appearance.reduceMotion', keywords: 'animation accessibility' },

  // ── Markdown ─────────────────────────────────────────────────────────────
  { id: 'markdown.defaultViewMode', section: 'markdown', labelKey: 'settings.markdown.defaultView', keywords: 'split preview source rich' },
  { id: 'markdown.gfm', section: 'markdown', labelKey: 'settings.markdown.gfm', keywords: 'github tables strikethrough' },
  { id: 'markdown.syncScroll', section: 'markdown', labelKey: 'settings.markdown.syncScroll', keywords: 'scrolling split' },
  { id: 'markdown.codeHighlighting', section: 'markdown', labelKey: 'settings.markdown.codeHighlighting', keywords: 'syntax colour' },
  { id: 'markdown.bullet', section: 'markdown', labelKey: 'settings.markdown.bullet', keywords: 'list marker dash asterisk' },
  { id: 'markdown.emphasis', section: 'markdown', labelKey: 'settings.markdown.emphasis', keywords: 'italic underscore asterisk' },
  { id: 'markdown.strong', section: 'markdown', labelKey: 'settings.markdown.strong', keywords: 'bold asterisk underscore' },
  { id: 'markdown.imageHandling', section: 'markdown', labelKey: 'settings.markdown.imageHandling', keywords: 'copy relative absolute' },
  { id: 'markdown.imageFolder', section: 'markdown', labelKey: 'settings.markdown.imageFolder', keywords: 'assets directory' },

  // ── Files ────────────────────────────────────────────────────────────────
  { id: 'files.autoSave', section: 'files', labelKey: 'settings.files.autoSave', keywords: 'automatic save delay' },
  { id: 'files.autoSaveDelayMs', section: 'files', labelKey: 'settings.files.autoSaveDelayLabel', keywords: 'delay timing' },
  { id: 'files.markdownOnly', section: 'files', labelKey: 'settings.files.markdownOnly', hintKey: 'settings.files.markdownOnlyHint', keywords: 'filter explorer md hide other' },
  { id: 'files.showHiddenFiles', section: 'files', labelKey: 'settings.files.showHidden', keywords: 'dotfiles hidden' },
  { id: 'files.recoveryEnabled', section: 'files', labelKey: 'settings.files.recovery', keywords: 'crash journal backup' },
  { id: 'files.watchExternalChanges', section: 'files', labelKey: 'settings.files.watchExternal', keywords: 'reload disk conflict' },
  { id: 'files.confirmDelete', section: 'files', labelKey: 'settings.files.confirmDelete', keywords: 'trash prompt' },
  { id: 'files.defaultEol', section: 'files', labelKey: 'settings.files.lineEndings', keywords: 'crlf lf unix windows' },
  { id: 'files.trashLimit', section: 'files', labelKey: 'settings.files.trashLimit', hintKey: 'settings.files.trashLimitHint', keywords: 'trash deleted bin recycle limit keep permanently' },
  { id: 'files.historyLimit', section: 'files', labelKey: 'settings.files.historyLimit', hintKey: 'settings.files.historyLimitHint', keywords: 'history version snapshot restore revert keep' },
  { id: 'files.recentLimit', section: 'files', labelKey: 'settings.files.recentLimit', keywords: 'history recent' },

  { id: 'appearance.palette', section: 'appearance', labelKey: 'settings.appearance.palette', hintKey: 'settings.appearance.paletteHint', keywords: 'theme palette nord solarized gruvbox sepia contrast colour scheme' },
  { id: 'appearance.toolbarItems', section: 'appearance', labelKey: 'settings.appearance.toolbarItems', hintKey: 'settings.appearance.toolbarItemsHint', keywords: 'toolbar buttons order hide show customise formatting' },
  { id: 'appearance.customColors', section: 'appearance', labelKey: 'settings.appearance.customColors', hintKey: 'settings.appearance.customColorsHint', keywords: 'custom colour color token override background text border' },

  // ── AI ───────────────────────────────────────────────────────────────────
  { id: 'ai.enabled', section: 'ai', labelKey: 'settings.ai.enabled', hintKey: 'settings.ai.enabledHint', keywords: 'assistant llm openrouter openai anthropic gemini ollama model' },
  { id: 'ai.confirmBeforeRun', section: 'ai', labelKey: 'settings.ai.confirm', hintKey: 'settings.ai.confirmHint', keywords: 'ask confirm privacy prompt before send' },
  { id: 'ai.activeProfileId', section: 'ai', labelKey: 'settings.ai.active', hintKey: 'settings.ai.activeHint', keywords: 'model profile connection active switch' },
  { id: 'ai.houseStyle', section: 'ai', labelKey: 'settings.ai.houseStyle', hintKey: 'settings.ai.houseStyleHint', keywords: 'system prompt tone terminology style' },

  // ── Icons ────────────────────────────────────────────────────────────────
  { id: 'icons.rules', section: 'icons', labelKey: 'icons.rulesTitle', keywords: 'folder colour color icon custom override rule' },
  { id: 'icons.addRule', section: 'icons', labelKey: 'icons.addRule', hintKey: 'icons.addRuleHint', keywords: 'extension name folder colour icon' },
  { id: 'icons.custom', section: 'icons', labelKey: 'icons.customTitle', hintKey: 'icons.customHint', keywords: 'svg import custom icon pack folder' },

  // ── Language ─────────────────────────────────────────────────────────────
  { id: 'language.preference', section: 'language', labelKey: 'settings.language.interfaceLanguage', hintKey: 'settings.language.interfaceHint', keywords: 'locale translation english azerbaijani russian' },
  { id: 'language.custom', section: 'language', labelKey: 'settings.language.addTitle', hintKey: 'settings.language.addDescription', keywords: 'translate json add locale folder' },

  // ── Keyboard ─────────────────────────────────────────────────────────────
  { id: 'keyboard.shortcuts', section: 'keyboard', labelKey: 'settings.nav.keyboard', keywords: 'shortcut accelerator keybinding rebind hotkey' }
]

/**
 * Matches the query against the translated label, the hint and the English
 * keywords — so a search works in the user's own language *and* still finds
 * things by their common English name.
 */
export function searchSettings(query: string, t: TranslateFn): SettingsSearchHit[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const hits: SettingsSearchHit[] = []

  for (const entry of SETTINGS_CATALOGUE) {
    const label = t(entry.labelKey)
    const haystack = [
      label,
      entry.hintKey ? t(entry.hintKey) : '',
      t(`settings.nav.${entry.section}`),
      entry.keywords ?? '',
      entry.id
    ]
      .join(' ')
      .toLowerCase()

    if (haystack.includes(needle)) hits.push({ entry, label })
  }

  return hits
}

/** Hit ids grouped by section, for the nav badges and the results view. */
export function groupHits(hits: SettingsSearchHit[]): Map<SettingsSectionId, SettingsSearchHit[]> {
  const grouped = new Map<SettingsSectionId, SettingsSearchHit[]>()

  for (const hit of hits) {
    const existing = grouped.get(hit.entry.section) ?? []
    existing.push(hit)
    grouped.set(hit.entry.section, existing)
  }

  return grouped
}
