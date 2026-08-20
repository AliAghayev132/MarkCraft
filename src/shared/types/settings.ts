// ── types ──────────────────────────────────────────────────────────────────
import { DEFAULT_AI_SETTINGS, type AiSettings } from './ai'
import { DEFAULT_HISTORY_LIMIT } from './history'

// ── ./types ────────────────────────────────────────────────────────────────
import type { Eol } from './files'
import type { IconRule } from './icons'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type AccentName = 'indigo' | 'blue' | 'teal' | 'violet' | 'amber' | 'rose' | 'graphite'

/**
 * A named neutral ramp.
 *
 * A palette replaces the greys — backgrounds, text, borders — and nothing else,
 * so it composes with the accent rather than replacing it. `default` means the
 * ramp in tokens.css, which is why it is not a stylesheet of its own.
 */
export type PaletteName =
  | 'default'
  | 'nord'
  | 'solarized'
  | 'gruvbox'
  | 'rosePine'
  | 'sepia'
  | 'highContrast'

/**
 * The tokens a user may override by hand.
 *
 * Deliberately a short list rather than every variable in tokens.css: these are
 * the ones that change the look, and each has a visible, nameable job. Exposing
 * all ninety would be a way to break the interface, not to customise it.
 */
export const CUSTOM_COLOR_TOKENS = [
  'bg-app',
  'bg-surface',
  'bg-raised',
  'bg-sunken',
  'text-primary',
  'text-secondary',
  'border',
  'accent',
  'accent-hover',
  'success',
  'warning',
  'danger',
  /*
   * The six canvas slots. On the list because a canvas is coloured to separate
   * one group of cards from another, and which six colours do that best is a
   * judgement about the work — not something an application can make for
   * somebody else.
   */
  'canvas-1',
  'canvas-2',
  'canvas-3',
  'canvas-4',
  'canvas-5',
  'canvas-6'
] as const

export type CustomColorToken = (typeof CUSTOM_COLOR_TOKENS)[number]
export type ViewMode = 'rich' | 'source' | 'split' | 'preview'
export type AutoSaveMode = 'off' | 'afterDelay' | 'onFocusChange'
export type SortKey = 'name' | 'modified' | 'size' | 'kind'
export type SortDirection = 'asc' | 'desc'

export interface EditorSettings {
  fontFamily: string
  fontSize: number
  lineHeight: number
  wordWrap: boolean
  tabSize: number
  insertSpaces: boolean
  lineNumbers: boolean
  minimap: boolean
  spellCheck: boolean
  highlightActiveLine: boolean
  bracketMatching: boolean
  autoIndent: boolean
  showInvisibles: boolean
  scrollPastEnd: boolean
}

export interface AppearanceSettings {
  theme: ThemeMode
  accent: AccentName
  sidebarVisible: boolean
  toolbarVisible: boolean
  statusBarVisible: boolean
  sidebarWidth: number
  uiDensity: 'comfortable' | 'compact'
  /**
   * Scale factor for the application chrome — sidebar, tabs, toolbar, status
   * bar, settings. Deliberately *not* applied to the document surfaces: editor
   * text has its own font-size setting, and scaling both from one control makes
   * neither adjustable on its own.
   */
  uiScale: number
  reduceMotion: boolean
  palette: PaletteName
  /**
   * Per-token overrides, applied on top of the theme and the palette.
   *
   * Sparse on purpose: only what the user actually changed is stored, so a
   * later change to a palette still reaches anyone who did not override that
   * particular token.
   *
   * Kept **per theme**, because a colour is only ever right for one of them.
   * A single shared map meant that picking a light background and then
   * switching to dark left that light background behind while every text
   * token went dark — light text on a light page, and no way to see what had
   * happened.
   */
  customColors: Record<ResolvedTheme, Partial<Record<CustomColorToken, string>>>
  /**
   * The formatting toolbar, in order. Empty means the built-in arrangement.
   *
   * Stored as ids rather than as a set of booleans so one field carries both
   * *which* tools and *in what order* — two fields would let them disagree.
   * An id the build no longer knows is ignored, so removing a tool in a later
   * version cannot break a saved arrangement.
   */
  toolbarItems: string[]
  /** Show the launch splash while the editor bundle is parsed. */
  splashScreen: boolean
  /** Play a short chime on launch. */
  startupSound: boolean
}

export const UI_SCALE_MIN = 0.8
export const UI_SCALE_MAX = 1.5
export const UI_SCALE_STEP = 0.05

export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) return 1
  // Rounded to the step so repeated zooming cannot drift onto odd fractions.
  const stepped = Math.round(value / UI_SCALE_STEP) * UI_SCALE_STEP
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Number(stepped.toFixed(2))))
}

/**
 * The Markdown serialisation options here are the application's single
 * canonical output style (see ARCHITECTURE.md §"Round-trip policy"). They are
 * user-visible precisely so the normalisation the rich editor performs is never
 * a surprise.
 */
export interface MarkdownSettings {
  gfm: boolean
  defaultViewMode: ViewMode
  syncScroll: boolean
  codeHighlighting: boolean
  linkifyBareUrls: boolean
  imageHandling: 'relative' | 'absolute'
  imageFolder: string
  bullet: '-' | '*' | '+'
  emphasis: '_' | '*'
  strong: '*' | '_'
  fence: '`' | '~'
  incrementListMarker: boolean
  setext: boolean
  listIndent: 'one' | 'tab' | 'mixed'
}

export interface FileSettings {
  autoSave: AutoSaveMode
  autoSaveDelayMs: number
  recoveryEnabled: boolean
  recoveryIntervalMs: number
  recentLimit: number
  watchExternalChanges: boolean
  confirmDelete: boolean
  /**
   * How many deleted documents to keep. Zero means keep them all.
   *
   * A limit rather than none by default, because the trash holds real bytes
   * and an unbounded one is a disk leak the user never asked for.
   */
  trashLimit: number
  /**
   * Versions kept per document, oldest dropped first. Zero turns history off.
   *
   * Snapshots are whole copies of the text, so this is a real disk cost — a
   * default rather than unlimited, and a number the user can see.
   */
  historyLimit: number
  defaultEol: 'auto' | Eol
  showHiddenFiles: boolean
  /**
   * Show only Markdown documents in the explorer.
   *
   * On by default: this is a Markdown editor, and a project folder is usually
   * full of files it cannot open. Folders are always shown, so the tree still
   * navigates.
   */
  markdownOnly: boolean
  sortKey: SortKey
  sortDirection: SortDirection
  foldersFirst: boolean
}

export interface IconSettings {
  /**
   * Icon and colour overrides for the file tree, most-specific-wins.
   *
   * Kept in settings rather than in the workspace slot because a rule for
   * `*.md` or a folder named `drafts` is a preference about how the user wants
   * to see things, not a property of one project.
   */
  rules: IconRule[]
}

export interface KeyboardSettings {
  /** commandId -> accelerator string, or null to unbind the default. */
  overrides: Record<string, string | null>
}

export interface LanguageSettings {
  /**
   * A BCP-47 locale code, or `system` to follow the operating system.
   * Unknown codes resolve to the closest available locale, then to English.
   */
  preference: string
}

/**
 * State the application keeps about itself rather than about the user's
 * preferences. It lives in settings because it has to survive a restart and
 * belongs to the person, not to a workspace.
 */
export interface WritingSettings {
  /**
   * Words a day to aim for. Zero is off, which is the default: a goal nobody
   * set is a goal nobody has, and showing progress towards one is a way of
   * telling somebody they are behind on something they never agreed to.
   */
  dailyGoal: number
  /**
   * Dims everything but the paragraph being written.
   *
   * Off by default. It is a preference about how somebody works and a strange
   * thing to have imposed the first time they open a file.
   */
  focusMode: boolean
}

export interface AppStateSettings {
  /** The last build whose release notes were shown. Empty on a first run. */
  lastSeenVersion: string
}

export interface Settings {
  version: number
  editor: EditorSettings
  appearance: AppearanceSettings
  markdown: MarkdownSettings
  files: FileSettings
  icons: IconSettings
  language: LanguageSettings
  keyboard: KeyboardSettings
  ai: AiSettings
  writing: WritingSettings
  app: AppStateSettings
}

export const SETTINGS_VERSION = 2

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  editor: {
    // Must be one of EDITOR_FONT_PRESETS verbatim, or the picker in settings
    // cannot show the default as the selected option.
    fontFamily: "'JetBrains Mono', Consolas, monospace",
    fontSize: 14,
    lineHeight: 1.7,
    wordWrap: true,
    tabSize: 2,
    insertSpaces: true,
    lineNumbers: true,
    minimap: false,
    spellCheck: true,
    highlightActiveLine: true,
    bracketMatching: true,
    autoIndent: true,
    showInvisibles: false,
    scrollPastEnd: true
  },
  appearance: {
    theme: 'system',
    accent: 'indigo',
    sidebarVisible: true,
    toolbarVisible: true,
    statusBarVisible: true,
    sidebarWidth: 264,
    uiDensity: 'comfortable',
    uiScale: 1,
    reduceMotion: false,
    palette: 'default',
    customColors: { light: {}, dark: {} },
    toolbarItems: [],
    splashScreen: true,
    startupSound: true
  },
  markdown: {
    gfm: true,
    defaultViewMode: 'split',
    syncScroll: true,
    codeHighlighting: true,
    linkifyBareUrls: false,
    imageHandling: 'relative',
    imageFolder: 'images',
    bullet: '-',
    emphasis: '_',
    strong: '*',
    fence: '`',
    incrementListMarker: true,
    setext: false,
    listIndent: 'one'
  },
  files: {
    autoSave: 'off',
    autoSaveDelayMs: 1200,
    recoveryEnabled: true,
    recoveryIntervalMs: 2500,
    recentLimit: 20,
    watchExternalChanges: true,
    confirmDelete: true,
    trashLimit: 30,
    historyLimit: DEFAULT_HISTORY_LIMIT,
    defaultEol: 'auto',
    showHiddenFiles: false,
    markdownOnly: true,
    sortKey: 'name',
    sortDirection: 'asc',
    foldersFirst: true
  },
  icons: {
    rules: []
  },
  language: {
    preference: 'system'
  },
  keyboard: {
    overrides: {}
  },
  ai: DEFAULT_AI_SETTINGS,
  writing: { dailyGoal: 0, focusMode: false },
  app: { lastSeenVersion: '' }
}

export const EDITOR_FONT_PRESETS = [
  { label: 'JetBrains Mono', value: "'JetBrains Mono', Consolas, monospace" },
  { label: 'Cascadia Code', value: "'Cascadia Code', Consolas, monospace" },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'SF Mono', value: "'SF Mono', Menlo, monospace" },
  { label: 'Fira Code', value: "'Fira Code', Consolas, monospace" },
  { label: 'System monospace', value: 'ui-monospace, monospace' },
  { label: 'Georgia (prose)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'System sans (prose)', value: 'system-ui, -apple-system, sans-serif' }
] as const
