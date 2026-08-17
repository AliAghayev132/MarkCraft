export interface LinksDialogProps {
  open: boolean
  onClose: () => void
  /** Opens a document by absolute path; the graph is keyed by relative ones. */
  onOpenDocument: (absolutePath: string) => void
}
