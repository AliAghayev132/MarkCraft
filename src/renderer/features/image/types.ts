// ── @shared ────────────────────────────────────────────────────────────────
import type { Rect } from '@shared'

export interface ImageEditorResult {
  /** Base64 payload without the data-URL prefix, ready to write. */
  base64: string
  /** File name including the extension the chosen format implies. */
  name: string
  width: number
  height: number
  bytes: number
}

export interface ImageEditorProps {
  open: boolean
  /** Data URL of the picked file. */
  source: string | null
  /** Original file name, used to name the result. */
  name: string
  /** Bytes on disk, so the saving can be shown honestly. */
  originalBytes: number
  onCancel: () => void
  onApply: (result: ImageEditorResult) => void
}

export interface CropOverlayProps {
  selection: Rect | null
  onChange: (selection: Rect | null) => void
}
