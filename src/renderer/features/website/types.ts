export interface WebsiteViewProps {
  open: boolean
  onClose: () => void
}

export interface Device {
  id: string
  /** CSS pixels the document is laid out in — the whole point of the view. */
  width: number
  height: number
}
