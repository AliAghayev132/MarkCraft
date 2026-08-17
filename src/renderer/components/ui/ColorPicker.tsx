// ── @lib ───────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState, type ReactElement } from '@lib/react'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Input } from '@ui/Form'
import { Popover } from '@ui/Popover'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { AnchorRect } from '@hooks/types'

// ── types ──────────────────────────────────────────────────────────────────
import type { ColorPickerProps } from '@ui/types'

/**
 * A colour picker built out of our own parts.
 *
 * `<input type="color">` would be four lines instead of two hundred, and it is
 * the reason this file exists: it opens the operating system's colour dialog —
 * a window MarkCraft cannot theme, cannot place and cannot make keyboard-
 * navigable in the way the rest of the application is. The saturation square,
 * the hue rail and the hex field below are the same three controls that dialog
 * offers, rendered where the user is already looking.
 */
export function ColorPicker({ value, onChange, label, disabled }: ColorPickerProps): ReactElement {
  const [hsv, setHsv] = useState(() => hexToHsv(value))
  const [text, setText] = useState(value)

  // Track the value while the popover is closed, but never fight the user's own
  // dragging: the incoming hex is the same colour they are already editing.
  useEffect(() => {
    if (!sameColor(hsvToHex(hsv), value)) {
      setHsv(hexToHsv(value))
      setText(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const commit = useCallback(
    (next: Hsv): void => {
      setHsv(next)
      const hex = hsvToHex(next)
      setText(hex)
      onChange(hex)
    },
    [onChange]
  )

  const triggerRef = useRef<HTMLButtonElement>(null)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)

  /*
   * The anchor is measured when the picker opens rather than read from the ref
   * during render — the same shape Dropdown and Tooltip already use. Reading a
   * ref while rendering is a value React does not promise is current, and it
   * left this one component measuring on every render for no benefit.
   */
  const toggle = (): void => {
    setAnchor((current) => (current ? null : (triggerRef.current?.getBoundingClientRect() ?? null)))
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        className={cx(
          'size-6 flex-none rounded border border-line transition-transform',
          'focus-visible:shadow-focus focus-visible:outline-none',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'
        )}
        style={{ backgroundColor: value }}
        onClick={toggle}
      />

      <Popover
        open={anchor !== null}
        anchor={anchor}
        onClose={() => setAnchor(null)}
        placement="bottom-start"
        role="dialog"
        ariaLabel={label}
        trapFocus
        ignoreRefs={[triggerRef]}
      >
        <div className="flex w-56 flex-col gap-3 p-3">
          <SaturationField hsv={hsv} onChange={commit} label={label} />
          <HueRail hue={hsv.h} onChange={(h) => commit({ ...hsv, h })} />

          <div className="flex items-center gap-2">
            <span
              className="size-6 flex-none rounded border border-line"
              style={{ backgroundColor: hsvToHex(hsv) }}
            />
            <Input
              value={text}
              monospace
              size="sm"
              spellCheck={false}
              aria-label={label}
              onChange={(event) => {
                const raw = event.target.value
                setText(raw)
                if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
                  setHsv(hexToHsv(raw))
                  onChange(raw.toLowerCase())
                }
              }}
            />
          </div>
        </div>
      </Popover>
    </>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * The two draggable surfaces
 * ─────────────────────────────────────────────────────────────────────────── */

/**
 * Saturation across, value down.
 *
 * Pointer capture rather than window listeners: dragging past the edge of the
 * square — which is what everyone does when they want pure white or pure black
 * — has to keep working, and releasing outside it must still end the drag.
 */
function SaturationField({
  hsv,
  onChange,
  label
}: {
  hsv: Hsv
  onChange: (hsv: Hsv) => void
  label: string
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  const pick = (event: { clientX: number; clientY: number }): void => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return

    onChange({
      ...hsv,
      s: clamp01((event.clientX - box.left) / box.width),
      v: 1 - clamp01((event.clientY - box.top) / box.height)
    })
  }

  return (
    <div
      ref={ref}
      role="application"
      aria-label={label}
      tabIndex={0}
      className="relative h-28 w-full cursor-crosshair rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        pick(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event)
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.1 : 0.02
        const moves: Record<string, Partial<Hsv>> = {
          ArrowLeft: { s: clamp01(hsv.s - step) },
          ArrowRight: { s: clamp01(hsv.s + step) },
          ArrowUp: { v: clamp01(hsv.v + step) },
          ArrowDown: { v: clamp01(hsv.v - step) }
        }
        const move = moves[event.key]
        if (!move) return

        event.preventDefault()
        onChange({ ...hsv, ...move })
      }}
    >
      <span
        className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
      />
    </div>
  )
}

function HueRail({ hue, onChange }: { hue: number; onChange: (hue: number) => void }): ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  const pick = (event: { clientX: number }): void => {
    const box = ref.current?.getBoundingClientRect()
    if (box) onChange(Math.round(clamp01((event.clientX - box.left) / box.width) * 360))
  }

  return (
    <div
      ref={ref}
      role="slider"
      aria-label="Hue"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={hue}
      tabIndex={0}
      className="relative h-3 w-full cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      style={{
        background:
          'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        pick(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event)
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 15 : 3
        if (event.key === 'ArrowLeft') onChange((hue - step + 360) % 360)
        else if (event.key === 'ArrowRight') onChange((hue + step) % 360)
        else return

        event.preventDefault()
      }}
    >
      <span
        className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
        style={{ left: `${(hue / 360) * 100}%`, backgroundColor: `hsl(${hue} 100% 50%)` }}
      />
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────────
 * Colour maths
 * ─────────────────────────────────────────────────────────────────────────── */

interface Hsv {
  h: number
  s: number
  v: number
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function sameColor(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

export function hexToHsv(hex: string): Hsv {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#000000'
  const r = parseInt(normalized.slice(1, 3), 16) / 255
  const g = parseInt(normalized.slice(3, 5), 16) / 255
  const b = parseInt(normalized.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const span = max - min

  let h = 0
  if (span !== 0) {
    if (max === r) h = ((g - b) / span) % 6
    else if (max === g) h = (b - r) / span + 2
    else h = (r - g) / span + 4
  }

  return {
    h: Math.round(((h * 60) + 360) % 360),
    s: max === 0 ? 0 : span / max,
    v: max
  }
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]

  const channel = (value: number): string =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${channel(r)}${channel(g)}${channel(b)}`
}
