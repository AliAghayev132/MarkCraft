/** `gap` stands in for a run of unchanged lines that was collapsed away. */
export type DiffKind = 'same' | 'added' | 'removed' | 'gap'

export interface DiffLine {
  kind: DiffKind
  /** For a `gap`, how many lines were hidden — as a string, like every other. */
  text: string
  beforeLine: number | null
  afterLine: number | null
}

export interface DiffSummary {
  added: number
  removed: number
  unchanged: number
}

export interface HistoryDialogProps {
  open: boolean
  onClose: () => void
}
