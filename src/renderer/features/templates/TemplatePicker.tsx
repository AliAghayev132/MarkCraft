// ── @lib ───────────────────────────────────────────────────────────────────
import { FilePlus2 } from '@icons'
import { useMemo, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Modal, ModalActions } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { newDocument } from '@features/documents'
import { documentTemplates } from './templates'

// ── types ──────────────────────────────────────────────────────────────────
import type { TemplatePickerProps } from './types'

/**
 * Choosing what a new document starts as.
 *
 * Kept off the `New Document` path on purpose: the common case is a blank file
 * and it should stay one keystroke. This is the deliberate route, for when the
 * shape of the document is already known.
 */
export function TemplatePicker({ open, onClose }: TemplatePickerProps): ReactElement {
  const t = useT()

  // Rebuilt per open so the date inside a template is today's, not the date
  // the application happened to launch.
  const templates = useMemo(() => (open ? documentTemplates() : []), [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('templates.title')}
      description={t('templates.description')}
      icon={<FilePlus2 size={17} />}
      size="md"
      footer={
        <ModalActions>
          <Button data-autofocus onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </ModalActions>
      }
    >
      <div className="flex flex-col gap-1">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="flex flex-col gap-px rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-line-subtle hover:bg-hover focus-visible:shadow-focus focus-visible:outline-none"
            onClick={() => {
              newDocument(template.body)
              onClose()
            }}
          >
            <span className="text-base text-ink">{template.title}</span>
            <span className="text-xs leading-normal text-ink-tertiary">
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
