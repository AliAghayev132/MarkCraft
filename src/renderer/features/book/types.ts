export interface BookDialogProps {
  open: boolean
  onClose: () => void
  onOpenDocument: (absolutePath: string) => void
}

export interface BookPanelProps {
  onOpenDocument: (absolutePath: string) => void
}
