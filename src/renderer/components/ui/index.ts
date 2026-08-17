/**
 * The design system's public surface.
 *
 * Features import from here, never from individual files, so the set of
 * approved primitives is visible in one place and a one-off control is an
 * obvious deviation in review.
 */

export { Button } from '@ui/Button'
export { IconButton } from '@ui/IconButton'

export { Field, Input, SearchInput, Select, Textarea } from '@ui/Form'
export { Checkbox, RadioGroup, Segmented, Slider, Switch } from '@ui/Controls'

export { Modal, ModalActions, ModalSection } from '@ui/Modal'
export { DialogLayer, dialogs } from '@ui/dialogs'
export { ColorPicker } from '@ui/ColorPicker'
export { Popover } from '@ui/Popover'
export { MenuList, isSeparator } from '@ui/Menu'
export { Dropdown } from '@ui/Dropdown'
export { ContextMenuLayer, useContextMenu } from '@ui/ContextMenu'
export { Tooltip } from '@ui/Tooltip'
export { ToastViewport } from '@ui/ToastViewport'

// ── Feedback ───────────────────────────────────────────────────────────────
export { LoadingBlock, Progress, Skeleton, Spinner } from '@ui/Spinner'
export { Badge, EmptyState, Kbd } from '@ui/Display'

export { Card, Divider, Panel, SectionHeading, Spacer, Toolbar, ToolbarGroup } from '@ui/Layout'

/*
 * ── Contracts ──────────────────────────────────────────────────────────────
 * Every prop type lives in `@ui/types`, so the whole design system's API can
 * be read in one file. Re-exported here because a feature should never need to
 * know which file a control happens to be implemented in.
 */
export type * from '@ui/types'
