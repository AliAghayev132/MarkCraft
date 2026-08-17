// ── @lib ───────────────────────────────────────────────────────────────────
import { Check, ChevronDown, Search, X } from '@icons'
import { forwardRef, useId, useRef, useState, type KeyboardEvent, type ReactElement } from '@lib/react'

// ── @hooks ─────────────────────────────────────────────────────────────────
import { rectOf } from '@hooks'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Popover } from '@ui/Popover'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { FieldProps, InputProps, SearchInputProps, SelectOption, SelectProps, TextareaProps } from '@ui/types'
import type { AnchorRect } from '@hooks/types'

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  layout = 'stacked',
  children,
  className
}: FieldProps): ReactElement {
  const inline = layout === 'inline'

  return (
    <div
      className={cx(
        'flex min-w-0',
        inline ? 'flex-row items-center justify-between gap-4' : 'flex-col gap-1.5',
        className
      )}
    >
      {label || hint ? (
        <div className={cx('flex min-w-0 flex-col gap-px', inline && 'flex-1')}>
          {label ? (
            <label className="text-sm font-medium text-ink" htmlFor={htmlFor}>
              {label}
              {required ? <span className="text-danger"> *</span> : null}
            </label>
          ) : null}
          {hint ? <div className="text-xs leading-normal text-ink-tertiary">{hint}</div> : null}
        </div>
      ) : null}

      <div className={cx('min-w-0', inline && 'flex-none')}>{children}</div>

      {error ? (
        <div className="text-xs text-danger" role="alert">
          {error}
        </div>
      ) : null}
    </div>
  )
}

/* ── Input ───────────────────────────────────────────────────────────────── */

const INPUT_SHELL =
  'flex min-w-0 items-center gap-1.5 rounded-md border border-line bg-surface transition-all ' +
  'hover:border-line-strong focus-within:border-accent focus-within:shadow-focus'

const INPUT_SIZES = {
  sm: 'h-control-sm px-1.5 rounded-sm',
  md: 'h-control px-2',
  lg: 'h-control-lg px-3'
} as const

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'md', invalid, prefixIcon, suffix, monospace, className, ...rest },
  ref
) {
  return (
    <div
      className={cx(
        INPUT_SHELL,
        INPUT_SIZES[size],
        invalid && 'border-danger focus-within:border-danger focus-within:shadow-[0_0_0_3px_var(--mc-danger-bg)]',
        rest.disabled && 'pointer-events-none opacity-55',
        className
      )}
    >
      {prefixIcon ? (
        <span className="grid flex-none place-items-center text-ink-tertiary">{prefixIcon}</span>
      ) : null}

      <input
        {...rest}
        ref={ref}
        aria-invalid={invalid || undefined}
        spellCheck={rest.spellCheck ?? false}
        className={cx(
          'h-full min-w-0 flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-ink-tertiary',
          monospace && 'font-mono text-xs'
        )}
      />

      {suffix ? <span className="grid flex-none place-items-center text-ink-tertiary">{suffix}</span> : null}
    </div>
  )
})

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { onClear, value, ...rest },
  ref
) {
  const hasValue = typeof value === 'string' && value.length > 0

  return (
    <Input
      {...rest}
      ref={ref}
      value={value}
      type="text"
      prefixIcon={<Search size={13} />}
      suffix={
        hasValue && onClear ? (
          <button
            type="button"
            aria-label="Clear"
            onClick={onClear}
            className="grid size-4 place-items-center rounded-xs text-ink-tertiary hover:bg-active hover:text-ink"
          >
            <X size={12} />
          </button>
        ) : null
      }
    />
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, monospace, autoGrow, className, onInput, ...rest },
  ref
) {
  return (
    <textarea
      {...rest}
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(
        'w-full min-h-[76px] resize-y rounded-md border border-line bg-surface p-2 text-sm leading-normal text-ink outline-none',
        'transition-all placeholder:text-ink-tertiary hover:border-line-strong focus:border-accent focus:shadow-focus',
        monospace && 'font-mono text-xs',
        invalid && 'border-danger',
        className
      )}
      onInput={(event) => {
        if (autoGrow) {
          const element = event.currentTarget
          element.style.height = 'auto'
          element.style.height = `${element.scrollHeight}px`
        }
        onInput?.(event)
      }}
    />
  )
})

const SELECT_SIZES = {
  sm: 'h-control-sm text-xs rounded-sm',
  md: 'h-control text-sm',
  lg: 'h-control-lg text-sm'
} as const

export function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  size = 'md',
  disabled,
  ariaLabel,
  className,
  id
}: SelectProps<T>): ReactElement {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const listId = useId()

  const selected = options.find((option) => option.value === value)
  const open = anchor !== null

  const openList = (): void => {
    if (disabled) return
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    setAnchor(rectOf(triggerRef.current))
  }

  const commit = (option: SelectOption<T>): void => {
    if (option.disabled) return
    onChange(option.value)
    setAnchor(null)
    triggerRef.current?.focus()
  }

  const onListKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => {
        for (let step = 1; step <= options.length; step++) {
          const next = (current + delta * step + options.length * options.length) % options.length
          if (!options[next]?.disabled) return next
        }
        return current
      })
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const option = options[activeIndex]
      if (option) commit(option)
    } else if (event.key === 'Tab') {
      setAnchor(null)
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cx(
          'flex min-w-[120px] items-center gap-1.5 rounded-md border border-line bg-surface pr-1.5 pl-2 text-left text-ink',
          'transition-all hover:border-line-strong hover:bg-hover focus-visible:border-accent focus-visible:shadow-focus focus-visible:outline-none',
          SELECT_SIZES[size],
          disabled && 'pointer-events-none opacity-55',
          className
        )}
        onClick={() => (open ? setAnchor(null) : openList())}
        onKeyDown={(event) => {
          if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
            event.preventDefault()
            openList()
          }
        }}
      >
        {selected?.icon ? (
          <span className="grid flex-none place-items-center text-ink-tertiary">{selected.icon}</span>
        ) : null}

        <span className={cx('flex-1 truncate', !selected && 'text-ink-tertiary')}>
          {selected?.label ?? placeholder}
        </span>

        <ChevronDown size={13} className="flex-none text-ink-tertiary" />
      </button>

      <Popover
        open={open}
        anchor={anchor}
        onClose={() => setAnchor(null)}
        placement="bottom-start"
        role="listbox"
        ariaLabel={ariaLabel}
        ignoreRefs={[triggerRef]}
        matchAnchorWidth
      >
        <div
          id={listId}
          role="listbox"
          tabIndex={-1}
          data-autofocus
          className="flex flex-col outline-none"
          onKeyDown={onListKeyDown}
          aria-activedescendant={`${listId}-${activeIndex}`}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              data-active={index === activeIndex || undefined}
              className={cx(
                'flex items-start gap-1.5 rounded-sm px-2 py-1.5 text-sm text-ink data-active:bg-hover',
                option.disabled && 'pointer-events-none opacity-55'
              )}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(option)}
            >
              <span className="grid h-[18px] w-3.5 flex-none place-items-center text-accent">
                {option.value === value ? <Check size={13} strokeWidth={2.6} /> : null}
              </span>

              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate">{option.label}</span>
                {option.description ? (
                  <span className="text-xs leading-snug text-ink-tertiary">{option.description}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </Popover>
    </>
  )
}
