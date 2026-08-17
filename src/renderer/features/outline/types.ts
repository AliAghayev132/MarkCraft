/**
 * Outline contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

export interface OutlineHeading {
  /** 1-based, so it can be handed straight to `goToLine`. */
  line: number
  /** 1–6, as written. */
  level: number
  /** The heading with its inline syntax stripped. */
  text: string
}

export interface OutlinePanelProps {
  /** Jumps the editor to a line, exactly as a search result does. */
  onRevealLine: (line: number) => void
}
