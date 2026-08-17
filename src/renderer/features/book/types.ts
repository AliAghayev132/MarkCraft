export interface BookDialogProps {
  open: boolean
  onClose: () => void
  onOpenDocument: (absolutePath: string) => void
}
