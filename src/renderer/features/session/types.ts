// ── @shared ────────────────────────────────────────────────────────────────
import type { CanvasData, Participant, SessionState } from '@shared'

export interface SessionCursorsProps {
  participants: Participant[]
  zoom: number
}

export interface SessionDialogProps {
  open: boolean
  onClose: () => void
  canvas: CanvasData
  path: string
  state: SessionState
}
