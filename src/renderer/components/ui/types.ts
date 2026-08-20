/**
 * Ui contracts.
 *
 * The types this folder exposes, kept together so its shape can be read
 * without opening every implementation file.
 */

// ── @lib ───────────────────────────────────────────────────────────────────
import type {
  ButtonHTMLAttributes,
  FocusEvent,
  InputHTMLAttributes,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
  TextareaHTMLAttributes
} from '@lib/react'

// ── types ──────────────────────────────────────────────────────────────────
import type { AnchorRect, Placement } from '@hooks/types'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'dangerGhost'

export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Rendered before the label. Pass an icon element. */
  icon?: ReactNode
  iconAfter?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

/* ── Checkbox ────────────────────────────────────────────────────────────── */

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  indeterminate?: boolean
  disabled?: boolean
  id?: string
  className?: string
}

/* ── Switch ──────────────────────────────────────────────────────────────── */

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: ReactNode
  disabled?: boolean
  ariaLabel?: string
  id?: string
  className?: string
}

/* ── Radio group ─────────────────────────────────────────────────────────── */

export interface RadioOption<T extends string> {
  value: T
  label: string
  description?: string
  disabled?: boolean
}

export interface RadioGroupProps<T extends string> {
  value: T
  options: readonly RadioOption<T>[]
  onChange: (value: T) => void
  name?: string
  ariaLabel?: string
  className?: string
}

/* ── Slider ──────────────────────────────────────────────────────────────── */

export interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  ariaLabel?: string
  /** Rendered to the right; pass a formatted result such as "14 px". */
  valueLabel?: string
  disabled?: boolean
  className?: string
}

/* ── Segmented control ───────────────────────────────────────────────────── */

export interface SegmentedOption<T extends string> {
  value: T
  label?: string
  icon?: ReactNode
  ariaLabel?: string
  disabled?: boolean
}

export interface SegmentedProps<T extends string> {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
  className?: string
}

/* ── Empty state ─────────────────────────────────────────────────────────── */

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/* ── Badge ───────────────────────────────────────────────────────────────── */

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

export interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export interface KbdProps {
  /** An accelerator such as "Ctrl+Shift+P"; rendered as individual keycaps. */
  keys: string
  className?: string
}

export interface DropdownProps {
  items: MenuEntry[]
  placement?: Placement
  ariaLabel?: string
  /** The trigger. Cloned with ref/onClick/aria wiring. */
  children: ReactElement<DropdownTriggerProps>
  onOpenChange?: (open: boolean) => void
}

/* ── Field ───────────────────────────────────────────────────────────────── */

export interface FieldProps {
  label?: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  htmlFor?: string
  /** Puts the control on the right of the label, for settings rows. */
  layout?: 'stacked' | 'inline'
  children: ReactNode
  className?: string
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  invalid?: boolean
  prefixIcon?: ReactNode
  suffix?: ReactNode
  monospace?: boolean
}

export interface SearchInputProps extends InputProps {
  onClear?: () => void
}

/* ── Textarea ────────────────────────────────────────────────────────────── */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  monospace?: boolean
  autoGrow?: boolean
}

/* ── Select ──────────────────────────────────────────────────────────────────
 * A custom listbox. The native <select> is never used: it cannot be themed on
 * Windows and would break the design system.
 * ─────────────────────────────────────────────────────────────────────────── */

export interface SelectOption<T extends string> {
  value: T
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

export interface SelectProps<T extends string> {
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  ariaLabel?: string
  className?: string
  id?: string
}

export type IconButtonVariant = 'ghost' | 'subtle' | 'solid' | 'danger'

export type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  icon: ReactNode
  /** Required: it is both the accessible name and the tooltip text. */
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  active?: boolean
  shortcut?: string
  tooltip?: boolean
  tooltipPlacement?: Placement
}

/* Structural primitives shared by every panel and screen. */

/* ── Panel ───────────────────────────────────────────────────────────────── */

export interface PanelProps {
  title?: ReactNode
  /** Controls rendered on the right of the header. */
  actions?: ReactNode
  children: ReactNode
  /** Removes the body padding, for lists that manage their own insets. */
  flush?: boolean
  className?: string
  bodyClassName?: string
}

/* ── Card ────────────────────────────────────────────────────────────────── */

export interface CardProps {
  children: ReactNode
  interactive?: boolean
  selected?: boolean
  className?: string
  onClick?: () => void
  onContextMenu?: (event: MouseEvent) => void
  ariaLabel?: string
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */

export interface ToolbarProps {
  children: ReactNode
  ariaLabel?: string
  className?: string
}

/* ── Section heading ─────────────────────────────────────────────────────── */

export interface SectionHeadingProps {
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export interface MenuItemDescriptor {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  /** Renders a check on the left; use for toggles inside a menu. */
  checked?: boolean
  /** Muted second line — for a path or other disambiguator under the label. */
  hint?: string
  submenu?: MenuItemDescriptor[]
  onSelect?: () => void
}

export type MenuEntry = MenuItemDescriptor | { id: string; separator: true; label?: string }

export interface MenuListProps {
  items: MenuEntry[]
  onSelect: (item: MenuItemDescriptor) => void
  /** Closes the whole menu tree, called after a leaf item is chosen. */
  onClose: () => void
  ariaLabel?: string
  className?: string
  /**
   * A list opened from another one. Escape steps back to it rather than
   * closing the whole menu, which is what "escape" means in a nested menu.
   */
  nested?: boolean
}

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export type ModalIconTone = 'accent' | 'danger' | 'warning' | 'info'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  /** Colours the icon chip; defaults to the accent. */
  iconTone?: ModalIconTone
  size?: ModalSize
  /** Footer content, usually a `<ModalActions>`. */
  footer?: ReactNode
  children?: ReactNode
  /** Set false for destructive flows where a stray click should not dismiss. */
  closeOnBackdrop?: boolean
  showCloseButton?: boolean
  className?: string
  bodyClassName?: string
}

/* ── Actions row ─────────────────────────────────────────────────────────── */

export interface ModalActionsProps {
  children: ReactNode
  /** Extra content pinned to the left, e.g. a summary or a checkbox. */
  aside?: ReactNode
}

/* ── Section ─────────────────────────────────────────────────────────────── */

export interface ModalSectionProps {
  title?: string
  children: ReactNode
  className?: string
}

export interface PopoverProps {
  open: boolean
  /** Screen-space rect the popover is positioned against. */
  anchor: AnchorRect | null
  onClose: () => void
  placement?: Placement
  offset?: number
  /** Elements that should not count as "outside" — usually the trigger. */
  ignoreRefs?: RefObject<HTMLElement | null>[]
  trapFocus?: boolean
  role?: 'dialog' | 'menu' | 'listbox'
  ariaLabel?: string
  className?: string
  children: ReactNode
  /** Match the anchor's width — used by Select so the list lines up. */
  matchAnchorWidth?: boolean
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */

export interface SpinnerProps {
  size?: number
  className?: string
  label?: string
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

export interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: string
  className?: string
}

/* ── Progress ────────────────────────────────────────────────────────────── */

export interface ProgressProps {
  /** 0–1. Omit for an indeterminate bar. */
  value?: number
  label?: string
  className?: string
}

/* ── Loading block ───────────────────────────────────────────────────────── */

export interface LoadingBlockProps {
  message?: string
  className?: string
}

export interface TooltipProps {
  content: ReactNode
  /** Optional shortcut rendered in a dimmer style after the label. */
  shortcut?: string
  placement?: Placement
  delay?: number
  disabled?: boolean
  children: ReactElement<TooltipTriggerProps>
}

/* ────────────────────────────────────────────────────────────────────────────
 * A promise-based dialog service.
 *
 * Business logic can `await dialogs.confirm(...)` exactly the way it would have
 * used `window.confirm`, but what appears is a real component from the design
 * system. This is what makes the "no native dialogs" rule enforceable rather
 * than aspirational: no feature ever needs to reach for the native API.
 *
 * The queue lives in an external store rather than Redux — each entry carries a
 * `resolve` function and React nodes, neither of which belongs in serialisable
 * application state.
 * ─────────────────────────────────────────────────────────────────────────── */

export type DialogTone = 'default' | 'danger' | 'warning' | 'info'

export interface ChoiceOption<T extends string> {
  id: T
  label: string
  variant?: ButtonVariant
  autoFocus?: boolean
}

/** The element a `Dropdown` clones to wire up its trigger. */
export interface DropdownTriggerProps {
  ref?: Ref<HTMLElement>
  onClick?: (event: MouseEvent) => void
  'aria-expanded'?: boolean
  'aria-haspopup'?: boolean
}

/** The element a `Tooltip` clones to wire up its trigger. */
export interface TooltipTriggerProps {
  ref?: Ref<HTMLElement>
  onMouseEnter?: (event: MouseEvent) => void
  onMouseLeave?: (event: MouseEvent) => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
}

/* ── ColorPicker ─────────────────────────────────────────────────────────── */

export interface ColorPickerProps {
  /** Always a #rrggbb string; the picker has no alpha channel. */
  value: string
  onChange: (hex: string) => void
  /** Required: it is the accessible name of both the trigger and the field. */
  label: string
  disabled?: boolean
}
