// ── @lib ───────────────────────────────────────────────────────────────────
import { Ban } from '@icons'
import { type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { CANVAS_COLOR_SLOTS, canvasColorCss } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @ui ────────────────────────────────────────────────────────────────────
import { ColorPicker } from '@ui'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasPaletteProps } from './types'

/**
 * The six colours, plus none.
 *
 * Six rather than a full picker because that is what the file format carries
 * between applications: a canvas coloured with slot 4 opens green everywhere,
 * while a hex only means something to whoever chose it. The seventh button
 * clears the colour, which is a different thing from choosing grey.
 */
export function CanvasPalette({ current, onPick }: CanvasPaletteProps): ReactElement {
  const t = useT()

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('canvas.colour')}>
      <button
        type="button"
        aria-label={t('canvas.noColour')}
        aria-pressed={current === undefined}
        title={t('canvas.noColour')}
        onClick={() => onPick(undefined)}
        className={cx(
          'flex size-5 items-center justify-center rounded-full border border-line',
          'text-ink-tertiary transition-transform hover:scale-110',
          'focus-visible:shadow-focus focus-visible:outline-none',
          current === undefined ? 'ring-2 ring-accent ring-offset-1 ring-offset-app' : ''
        )}
      >
        <Ban size={11} />
      </button>

      {CANVAS_COLOR_SLOTS.map((slot) => (
        <button
          key={slot}
          type="button"
          aria-label={t(`canvas.colours.${slot}`)}
          aria-pressed={current === slot}
          title={t(`canvas.colours.${slot}`)}
          onClick={() => onPick(slot)}
          style={{ backgroundColor: canvasColorCss(slot) ?? undefined }}
          className={cx(
            'size-5 rounded-full border border-line/40 transition-transform hover:scale-110',
            'focus-visible:shadow-focus focus-visible:outline-none',
            current === slot ? 'ring-2 ring-accent ring-offset-1 ring-offset-app' : ''
          )}
        />
      ))}

      {/*
       * A colour of their own, beside the six. The format carries a hex as
       * readily as a slot, so this costs nothing in what the file can say — and
       * six colours is a good default, not a limit somebody else gets to set.
       */}
      <span className="mx-0.5 h-4 w-px bg-line-subtle" role="presentation" />

      <ColorPicker
        value={current && current.startsWith('#') ? current : '#4f8ef7'}
        label={t('canvas.ownColour')}
        onChange={(hex) => onPick(hex)}
      />
    </div>
  )
}
