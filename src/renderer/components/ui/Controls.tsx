// ── @lib ───────────────────────────────────────────────────────────────────
import { Check, Minus } from '@icons'
import { useId, type CSSProperties, type KeyboardEvent, type ReactElement } from '@lib/react'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { CheckboxProps, RadioGroupProps, SegmentedProps, SliderProps, SwitchProps } from '@ui/types'

/*
 * Every control here renders a visually hidden native input and paints the
 * control itself. That keeps full keyboard semantics, form association and
 * screen-reader support while giving the design system total visual control.
 */

const NATIVE_INPUT = 'peer absolute size-px opacity-0 m-0 pointer-events-none'
const ROW_LABEL = 'flex min-w-0 items-start gap-2 cursor-default'
const FOCUS_RING = 'peer-focus-visible:shadow-focus'

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  indeterminate = false,
  disabled = false,
  id,
  className
}: CheckboxProps): ReactElement {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const on = checked || indeterminate

  return (
    <div className={cx('relative flex min-w-0', disabled && 'pointer-events-none opacity-50', className)}>
      <input
        id={inputId}
        type="checkbox"
        className={NATIVE_INPUT}
        checked={checked}
        disabled={disabled}
        aria-checked={indeterminate ? 'mixed' : checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />

      <label htmlFor={inputId} className={cx(ROW_LABEL, 'group')}>
        <span
          className={cx(
            'grid size-4 flex-none place-items-center rounded-xs border-[1.5px] transition-colors',
            FOCUS_RING,
            on
              ? 'border-accent bg-accent text-on-accent'
              : 'border-line-strong bg-surface text-transparent group-hover:border-accent'
          )}
        >
          {indeterminate ? (
            <Minus size={11} strokeWidth={3} />
          ) : checked ? (
            <Check size={11} strokeWidth={3} />
          ) : null}
        </span>

        {label || description ? (
          <span className="flex min-w-0 flex-col gap-px">
            {label ? <span className="text-sm leading-4 text-ink">{label}</span> : null}
            {description ? (
              <span className="text-xs leading-normal text-ink-tertiary">{description}</span>
            ) : null}
          </span>
        ) : null}
      </label>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  ariaLabel,
  id,
  className
}: SwitchProps): ReactElement {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={cx('relative flex min-w-0', disabled && 'pointer-events-none opacity-50', className)}>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className={NATIVE_INPUT}
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />

      <label htmlFor={inputId} className={cx(ROW_LABEL, 'items-center gap-3')}>
        <span
          className={cx(
            'relative h-[17px] w-[30px] flex-none rounded-full transition-colors',
            FOCUS_RING,
            checked ? 'bg-accent' : 'bg-line-strong'
          )}
        >
          <span
            className={cx(
              'absolute top-0.5 left-0.5 size-[13px] rounded-full bg-white shadow-xs transition-transform duration-100 ease-out',
              checked && 'translate-x-[13px]'
            )}
          />
        </span>

        {label ? <span className="text-sm leading-4 text-ink">{label}</span> : null}
      </label>
    </div>
  )
}

export function RadioGroup<T extends string>({
  value,
  options,
  onChange,
  name,
  ariaLabel,
  className
}: RadioGroupProps<T>): ReactElement {
  const generatedName = useId()
  const groupName = name ?? generatedName

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cx('flex flex-col gap-2', className)}>
      {options.map((option) => {
        const inputId = `${groupName}-${option.value}`
        const selected = option.value === value

        return (
          <div
            key={option.value}
            className={cx('relative flex min-w-0', option.disabled && 'pointer-events-none opacity-50')}
          >
            <input
              id={inputId}
              type="radio"
              name={groupName}
              className={NATIVE_INPUT}
              checked={selected}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
            />

            <label htmlFor={inputId} className={cx(ROW_LABEL, 'group')}>
              <span
                className={cx(
                  'grid size-4 flex-none place-items-center rounded-full border-[1.5px] bg-surface transition-colors',
                  FOCUS_RING,
                  selected ? 'border-accent' : 'border-line-strong group-hover:border-accent'
                )}
              >
                <span
                  className={cx(
                    'size-2 rounded-full bg-accent transition-transform duration-100 ease-out',
                    selected ? 'scale-100' : 'scale-0'
                  )}
                />
              </span>

              <span className="flex min-w-0 flex-col gap-px">
                <span className="text-sm leading-4 text-ink">{option.label}</span>
                {option.description ? (
                  <span className="text-xs leading-normal text-ink-tertiary">{option.description}</span>
                ) : null}
              </span>
            </label>
          </div>
        )
      })}
    </div>
  )
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  ariaLabel,
  valueLabel,
  disabled,
  className
}: SliderProps): ReactElement {
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100

  return (
    <div
      className={cx(
        'flex min-w-[140px] items-center gap-3',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <input
        type="range"
        className="mc-slider h-4 flex-1 cursor-default appearance-none bg-transparent outline-none"
        style={{ '--mc-slider-fill': `${percent}%` } as CSSProperties}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />

      {valueLabel ? (
        <span className="min-w-[46px] flex-none text-right text-xs tabular-nums text-ink-secondary">
          {valueLabel}
        </span>
      ) : null}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  ariaLabel,
  className
}: SegmentedProps<T>): ReactElement {
  const onKeyDown = (event: KeyboardEvent, index: number): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 1 : -1

    for (let step = 1; step <= options.length; step++) {
      const next = (index + delta * step + options.length * options.length) % options.length
      const option = options[next]
      if (option && !option.disabled) {
        onChange(option.value)
        return
      }
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx('inline-flex flex-none items-center gap-px rounded-md bg-active p-px', className)}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          aria-label={option.ariaLabel ?? option.label}
          tabIndex={option.value === value ? 0 : -1}
          disabled={option.disabled}
          className={cx(
            'inline-flex items-center justify-center gap-1.5 rounded-sm font-medium text-ink-secondary',
            'transition-all hover:text-ink focus-visible:shadow-focus focus-visible:outline-none',
            size === 'sm' ? 'h-5 px-1.5 text-2xs' : 'h-6 px-2 text-xs',
            option.value === value && 'bg-surface text-ink shadow-xs'
          )}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
        >
          {option.icon}
          {option.label ? <span>{option.label}</span> : null}
        </button>
      ))}
    </div>
  )
}
