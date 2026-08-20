// ── @lib ───────────────────────────────────────────────────────────────────
import { LayoutTemplate } from '@icons'
import { useMemo, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { CanvasData } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Modal, ModalActions } from '@ui'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { canvasTemplateChoices } from './canvas-templates'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasTemplatePickerProps } from './types'

/**
 * Starting a canvas from a shape.
 *
 * The templates are *added* rather than applied: they land beside whatever is
 * already on the canvas, keep their own cards, and can be added twice. A
 * template that replaced the canvas would be a destructive command hiding
 * behind a friendly name, and the first person to try one on a canvas they had
 * been working on all afternoon would never open the menu again.
 */
export function CanvasTemplatePicker({
  open,
  onClose,
  onChoose
}: CanvasTemplatePickerProps): ReactElement {
  const t = useT()

  // Built per open, so the labels follow a language changed while the
  // application was running.
  const choices = useMemo(() => (open ? canvasTemplateChoices() : []), [open])

  const choose = (build: () => CanvasData): void => {
    onChoose(build())
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('canvas.templates.title')}
      description={t('canvas.templates.description')}
      icon={<LayoutTemplate size={17} />}
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
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="flex flex-col gap-px rounded-md border border-transparent px-3 py-2 text-left transition-colors hover:border-line-subtle hover:bg-hover focus-visible:shadow-focus focus-visible:outline-none"
            onClick={() => choose(choice.build)}
          >
            <span className="text-base text-ink">{choice.title}</span>
            <span className="text-xs leading-normal text-ink-tertiary">{choice.description}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
