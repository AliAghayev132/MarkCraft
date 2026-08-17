/**
 * Settings contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactNode } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { AppInfo } from '@shared'

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
  appInfo: AppInfo | null
}

export interface SettingsRowProps {
  /** Stable id, also the search key — see `settings-catalogue.ts`. */
  id: string
  label?: string
  hint?: ReactNode
  layout?: 'stacked' | 'inline'
  /** Set while a settings search is running and this row is a hit. */
  highlighted?: boolean
  children: ReactNode
}

export type SettingsSectionId =
  | 'editor'
  | 'appearance'
  | 'markdown'
  | 'files'
  | 'icons'
  | 'language'
  | 'keyboard'
  | 'ai'
  | 'about'

export interface SettingEntry {
  /** Matches the `id` on the corresponding `<SettingsRow>`. */
  id: string
  section: SettingsSectionId
  /** i18n key for the control's label. */
  labelKey: string
  /** i18n key for its hint, when it has one. */
  hintKey?: string
  /** Extra English search terms, for words that never appear in the label. */
  keywords?: string
}

export interface SettingsSearchHit {
  entry: SettingEntry
  label: string
}
