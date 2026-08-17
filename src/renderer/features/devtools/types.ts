// ── @lib ───────────────────────────────────────────────────────────────────
import type { ReactNode } from '@lib/react'

export type DevToolId = 'json' | 'yaml' | 'base64' | 'url' | 'jwt' | 'timestamp' | 'regex' | 'uuid'

export interface DevTool {
  id: DevToolId
  icon: ReactNode
  /** Has an inverse — the panel offers a direction switch for these. */
  reversible: boolean
  /** Produces its own output; the input box is hidden. */
  generator?: boolean
}

export interface DevToolsDialogProps {
  open: boolean
  onClose: () => void
}
