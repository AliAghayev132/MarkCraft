/**
 * Sections contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @shared ────────────────────────────────────────────────────────────────
import type { AppInfo } from '@shared'

export interface AboutSectionProps {
  appInfo: AppInfo | null
}

export interface SectionProps {
  matches: Set<string>
}
