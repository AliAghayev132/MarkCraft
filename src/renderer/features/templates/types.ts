/**
 * Templates contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

export type TemplateId = 'blank' | 'note' | 'meeting' | 'article' | 'todo'

export interface DocumentTemplate {
  id: TemplateId
  title: string
  description: string
  /** Markdown, already localised. Empty for the blank template. */
  body: string
}

export interface TemplatePickerProps {
  open: boolean
  onClose: () => void
}
