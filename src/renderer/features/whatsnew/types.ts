/** What a note is: a feature, a refinement, or a repair. */
export type ReleaseNoteKind = 'new' | 'improved' | 'fixed'

export interface ReleaseNote {
  /** Keys `whatsNew.notes.<id>.title` and `.body` in every locale. */
  id: string
  kind: ReleaseNoteKind
}

export interface Release {
  version: string
  /** ISO date, formatted for the reader's locale at render time. */
  date: string
  notes: ReleaseNote[]
}

export interface WhatsNewModalProps {
  open: boolean
  onClose: () => void
  /** The running build, shown beside the newest entry. */
  version: string
}
