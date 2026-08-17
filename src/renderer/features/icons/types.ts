/**
 * Icons contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactNode } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { IconSubject } from '@shared'

export interface CustomSvgIconProps {
  source: string
  size?: number
  className?: string
  /** Resolves `currentColor` inside the file. */
  color?: string
}

export interface IconPickerDialogProps {
  open: boolean
  onClose: () => void
  /** The entry the menu was opened on. */
  subject: IconSubject | null
}

export interface IconAppearance {
  /** A name from `ICON_LIBRARY`, or null to keep the built-in glyph. */
  iconName: string | null
  /** The imported icon's markup, when the rule names one. */
  customSource: string | null
  /** A resolved CSS colour, or null to keep the built-in hue. */
  color: string | null
}

/** Which allowlist  applies — see features/icons/svg-tree.tsx. */
export type SvgProfile = 'icon' | 'diagram'

export interface ParsedSvg {
  viewBox: string
  children: ReactNode[]
}
