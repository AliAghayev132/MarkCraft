/**
 * Icon and colour customisation for the file tree.
 *
 * A rule is a match plus an appearance. Rules are evaluated most-specific
 * first — an exact path beats a name, which beats an extension — so "make this
 * one folder red" and "give every .md file this icon" can coexist without
 * either having to know about the other.
 */

export type IconRuleMatch = 'path' | 'name' | 'extension'
export type IconRuleTarget = 'file' | 'directory' | 'any'

export interface IconRule {
  id: string
  match: IconRuleMatch
  /**
   * An absolute path, a file/folder name, or an extension without the dot.
   * Compared case-insensitively for names and extensions.
   */
  value: string
  target: IconRuleTarget
  /** A name from `ICON_LIBRARY`, `custom:<id>` for an imported SVG, or null. */
  icon: string | null
  /** A name from `ICON_COLORS`, or null to keep the built-in hue. */
  color: string | null
}

/**
 * The icons offered in the picker.
 *
 * A deliberately small, curated set: every one of these is already in the
 * application's bundle, so choosing one costs nothing, and a short list is
 * pickable at a glance in a way that a thousand-icon grid is not. Anything
 * outside it is what SVG import is for.
 */
export const ICON_LIBRARY = [
  // Folders and containers
  'folder', 'folder-open', 'folder-git', 'folder-heart', 'folder-lock', 'archive', 'package', 'box',
  // Documents
  'file-text', 'file-code', 'file-json', 'file-image', 'book', 'notebook', 'newspaper', 'scroll',
  // Meaning
  'star', 'heart', 'flag', 'bookmark', 'pin', 'tag', 'zap', 'flame',
  // Work
  'briefcase', 'target', 'rocket', 'wrench', 'beaker', 'palette', 'camera', 'music',
  // Status
  'check-circle', 'alert-circle', 'clock', 'lock', 'eye', 'trash', 'inbox', 'globe'
] as const

export type IconName = (typeof ICON_LIBRARY)[number]

/**
 * Named colours for icons.
 *
 * Literal hex pairs rather than theme tokens: a folder colour is a *choice*,
 * and it has to read the same after a theme switch. Each pair is tuned so the
 * two versions look like the same colour at their respective backgrounds'
 * contrast, rather than one washing out.
 */
export const ICON_COLORS: Record<string, { light: string; dark: string }> = {
  slate: { light: '#5b6478', dark: '#98a2b6' },
  red: { light: '#c2413b', dark: '#f08a83' },
  orange: { light: '#b5651d', dark: '#eda05a' },
  amber: { light: '#a67c00', dark: '#e0b53f' },
  green: { light: '#2f7d44', dark: '#6cc286' },
  teal: { light: '#0f7f78', dark: '#3bbfb2' },
  blue: { light: '#2f6fd0', dark: '#5c9dff' },
  indigo: { light: '#4f5cd6', dark: '#7e8aff' },
  violet: { light: '#7c3fd4', dark: '#a97bf0' },
  pink: { light: '#c03060', dark: '#ef7ba1' },
  brown: { light: '#8a6244', dark: '#c09372' }
}

export type IconColorName = keyof typeof ICON_COLORS

/** An SVG the user dropped into `userData/icons`. */
export interface CustomIcon {
  /** The filename without its extension; also what `custom:<id>` refers to. */
  id: string
  name: string
  path: string
  /** The file's markup, already stripped of scripts and event handlers. */
  source: string
}

export const CUSTOM_ICON_PREFIX = 'custom:'

export function isCustomIcon(icon: string | null): boolean {
  return typeof icon === 'string' && icon.startsWith(CUSTOM_ICON_PREFIX)
}

export function customIconId(icon: string): string {
  return icon.slice(CUSTOM_ICON_PREFIX.length)
}

/** Specificity order, highest first — see the note at the top of this file. */
const MATCH_RANK: Record<IconRuleMatch, number> = { path: 3, name: 2, extension: 1 }

export interface IconSubject {
  kind: 'file' | 'directory'
  name: string
  path: string
  /** Lowercase, no dot. Empty for directories and extensionless files. */
  ext: string
}

function matches(rule: IconRule, subject: IconSubject): boolean {
  if (rule.target !== 'any' && rule.target !== subject.kind) return false

  switch (rule.match) {
    case 'path':
      // Case-insensitive: Windows and macOS paths are, and a rule that stopped
      // working because of capitalisation would be baffling.
      return rule.value.toLowerCase() === subject.path.toLowerCase()
    case 'name':
      return rule.value.toLowerCase() === subject.name.toLowerCase()
    case 'extension': {
      // Both sides must be non-empty, or a rule with a blank extension would
      // match every directory and every extensionless file.
      const wanted = rule.value.replace(/^\./, '').toLowerCase()
      return wanted.length > 0 && wanted === subject.ext
    }
  }
}

/** The winning rule for an entry, or null if none apply. */
export function resolveIconRule(rules: IconRule[], subject: IconSubject): IconRule | null {
  let best: IconRule | null = null

  for (const rule of rules) {
    if (!matches(rule, subject)) continue
    if (!best || MATCH_RANK[rule.match] > MATCH_RANK[best.match]) best = rule
  }

  return best
}
