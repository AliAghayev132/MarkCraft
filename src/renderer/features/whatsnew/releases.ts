// ── types ──────────────────────────────────────────────────────────────────
import type { Release } from './types'

/**
 * The release notes.
 *
 * The *structure* lives here and the *prose* lives in the locale files, keyed
 * by note id — the same split as everywhere else, so a release is written once
 * and translated three times rather than duplicated per language. Adding a
 * release means one entry here and one block per locale; the i18n coverage test
 * fails until all three exist, which is what stops a language quietly showing
 * an empty changelog.
 *
 * Newest first. That is the order it is read in, and the order it is shown in.
 */
export const RELEASES: readonly Release[] = [
  {
    version: '0.4.0',
    date: '2026-08-17',
    notes: [
      { id: 'book', kind: 'new' },
      { id: 'study', kind: 'new' },
      { id: 'canvas', kind: 'new' },
      { id: 'httpTester', kind: 'new' },
      { id: 'runCode', kind: 'new' },
      { id: 'lock', kind: 'new' },
      { id: 'streak', kind: 'new' },
      { id: 'pasteMarkdown', kind: 'new' },
      { id: 'codeLanguage', kind: 'new' },
      { id: 'cleanUp', kind: 'new' },
      { id: 'aiReview', kind: 'new' },
      { id: 'quietLog', kind: 'fixed' }
    ]
  },
  {
    version: '0.3.0',
    date: '2026-08-16',
    notes: [
      { id: 'present', kind: 'new' },
      { id: 'slashBlocks', kind: 'new' },
      { id: 'devTools', kind: 'new' },
      { id: 'links', kind: 'new' },
      { id: 'website', kind: 'new' },
      { id: 'imageEditor', kind: 'new' },
      { id: 'exportWordProcessor', kind: 'new' },
      { id: 'callouts', kind: 'new' },
      { id: 'emoji', kind: 'new' },
      { id: 'headingIds', kind: 'new' },
      { id: 'codeCopy', kind: 'new' },
      { id: 'lintAndAudit', kind: 'new' },
      { id: 'toolbarCustom', kind: 'improved' },
      { id: 'dropAnything', kind: 'improved' },
      { id: 'startupSize', kind: 'improved' },
      { id: 'functionKeys', kind: 'fixed' }
    ]
  },
  {
    version: '0.2.0',
    date: '2026-08-15',
    notes: [
      { id: 'ai', kind: 'new' },
      { id: 'trash', kind: 'new' },
      { id: 'palettes', kind: 'new' },
      { id: 'customColors', kind: 'new' },
      { id: 'exportPng', kind: 'new' },
      { id: 'exportJson', kind: 'new' },
      { id: 'share', kind: 'improved' },
      { id: 'previewLatency', kind: 'improved' },
      { id: 'recentOpensFolder', kind: 'improved' },
      { id: 'lastFolder', kind: 'fixed' },
      { id: 'listContinuation', kind: 'fixed' },
      { id: 'toolbarCaret', kind: 'fixed' },
      { id: 'modalLayering', kind: 'fixed' },
      { id: 'languageTemplate', kind: 'fixed' }
    ]
  }
]

/**
 * Whether there is anything to show.
 *
 * Compared by exact string rather than by parsing a semantic version: the only
 * question is "has this build been seen", and a comparison that cannot be wrong
 * beats one that handles pre-release suffixes almost correctly.
 */
export function hasUnseenRelease(currentVersion: string, lastSeen: string): boolean {
  if (!currentVersion) return false
  if (lastSeen === currentVersion) return false

  // A first run has nothing to announce — the whole application is new.
  return lastSeen !== ''
}

export function latestRelease(): Release | undefined {
  return RELEASES[0]
}
