export interface GuideSection {
  id: string
  title: string
  /** Rendered through the application's own Markdown pipeline. */
  markdown: string
}

export interface HelpViewProps {
  open: boolean
  onClose: () => void
}
