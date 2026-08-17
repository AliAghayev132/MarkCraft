// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactNode } from '@lib/react'

// ── @hooks ─────────────────────────────────────────────────────────────────
import type { AnchorRect } from '@hooks/types'

export interface SlashBlockDefinition {
  id: string
  icon: ReactNode
  /** English shorthands — `h1`, `ul` — matched alongside the translated label. */
  keywords: string[]
  run: () => void
}

export interface SlashBlock extends SlashBlockDefinition {
  label: string
}

export interface SlashState {
  /** Document range the trigger occupies, replaced when a block is chosen. */
  from: number
  to: number
  anchor: AnchorRect
  /** Already ranked; the menu renders these in order. */
  items: SlashBlock[]
  index: number
}

export interface SlashMenuProps {
  state: SlashState | null
}
