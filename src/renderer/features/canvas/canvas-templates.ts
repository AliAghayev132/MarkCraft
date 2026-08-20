// ── @shared ────────────────────────────────────────────────────────────────
import {
  CANVAS_TEMPLATES,
  EMPTY_CANVAS,
  boardCanvas,
  mindMapCanvas,
  timelineCanvas,
  type CanvasData,
  type CanvasTemplateId
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

/** A template as the picker shows it: named, described, and ready to build. */
export interface CanvasTemplateChoice {
  id: CanvasTemplateId
  title: string
  description: string
  build: () => CanvasData
}

/*
 * The words come from translations rather than the layout module because they
 * are prose: a Russian writer opening a retrospective should find "Что прошло
 * хорошо" over the first column, not an English heading they have to replace
 * before the board is theirs.
 */
function buildTemplate(id: CanvasTemplateId): CanvasData {
  switch (id) {
    case 'kanban':
      return boardCanvas(
        [
          { label: t('canvas.templates.kanban.todo'), color: '6' },
          { label: t('canvas.templates.kanban.doing'), color: '3' },
          { label: t('canvas.templates.kanban.done'), color: '4' }
        ],
        t('canvas.templates.placeholder')
      )

    case 'retrospective':
      return boardCanvas(
        [
          { label: t('canvas.templates.retro.well'), color: '4' },
          { label: t('canvas.templates.retro.badly'), color: '1' },
          { label: t('canvas.templates.retro.next'), color: '5' }
        ],
        t('canvas.templates.placeholder')
      )

    case 'mindMap':
      return mindMapCanvas(t('canvas.templates.mind.centre'), [
        t('canvas.templates.mind.branch1'),
        t('canvas.templates.mind.branch2'),
        t('canvas.templates.mind.branch3'),
        t('canvas.templates.mind.branch4')
      ])

    case 'timeline':
      return timelineCanvas([
        t('canvas.templates.timeline.step1'),
        t('canvas.templates.timeline.step2'),
        t('canvas.templates.timeline.step3')
      ])

    case 'blank':
      return EMPTY_CANVAS
  }
}

/** What the picker offers, in the active language. */
export function canvasTemplateChoices(): CanvasTemplateChoice[] {
  return CANVAS_TEMPLATES.map((id) => ({
    id,
    title: t(`canvas.templates.${id}.title`),
    description: t(`canvas.templates.${id}.description`),
    build: () => buildTemplate(id)
  }))
}
