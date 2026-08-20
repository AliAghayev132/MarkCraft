// ── @lib ───────────────────────────────────────────────────────────────────
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileImage,
  FileJson,
  FileLock2,
  FileText,
  FileType2,
  Folder,
  FolderOpen,
  Shapes
} from '@icons'
import { memo, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { CANVAS_EXTENSION, ENCRYPTED_EXTENSION, type IconName } from '@shared'

// ── @features ──────────────────────────────────────────────────────────────
import { CustomSvgIcon, ICON_COMPONENTS, useIconAppearance, useIconSubject } from '@features/icons'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { FileIconProps } from '@components/types'

const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'php', 'sh', 'bash', 'sql', 'html', 'css', 'scss', 'vue', 'svelte', 'xml'
])

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif', 'ico'])
const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdown', 'mkd', 'mdx'])
const DATA_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'toml', 'ini', 'csv'])

/**
 * One icon system for the whole application.
 *
 * File type is expressed through both glyph and hue, so the tree stays
 * scannable at a glance without needing a legend. A user rule (Settings >
 * Icons, or the right-click menu) overrides either or both — see
 * features/icons.
 */
export const FileIcon = memo(function FileIcon({
  kind,
  ext = '',
  name,
  path,
  expanded = false,
  size = 14,
  className
}: FileIconProps): ReactElement {
  const subject = useIconSubject(kind === 'directory' ? 'directory' : 'file', name, path, ext)
  const appearance = useIconAppearance(subject)

  if (appearance.customSource) {
    return (
      <CustomSvgIcon
        source={appearance.customSource}
        size={size}
        color={appearance.color ?? undefined}
        className={cx('flex-none', className)}
      />
    )
  }

  // A table lookup, not a factory call: the component identity is fixed at
  // module load, so this is picking one, not creating one during render.
  const Chosen = appearance.iconName
    ? ICON_COMPONENTS[appearance.iconName as IconName]
    : undefined

  if (Chosen) {
    return (
      <Chosen
        size={size}
        style={appearance.color ? { color: appearance.color } : undefined}
        className={cx('flex-none', appearance.color ? undefined : 'text-accent', className)}
      />
    )
  }

  // No glyph override, but a colour on its own is a legitimate rule.
  const tint = appearance.color ? { color: appearance.color } : undefined

  if (kind === 'directory') {
    const Icon = expanded ? FolderOpen : Folder
    return (
      <Icon
        size={size}
        style={tint}
        className={cx('flex-none', tint ? undefined : 'text-accent', className)}
      />
    )
  }

  const extension = ext.toLowerCase()

  const [Glyph, tone] = extension
    ? extension === CANVAS_EXTENSION
      ? ([Shapes, 'text-[var(--mc-canvas-6)]'] as const)
      : extension === ENCRYPTED_EXTENSION
        ? ([FileLock2, 'text-warning'] as const)
      : MARKDOWN_EXTENSIONS.has(extension)
      ? ([FileType2, 'text-info'] as const)
      : IMAGE_EXTENSIONS.has(extension)
        ? ([FileImage, 'text-success'] as const)
        : DATA_EXTENSIONS.has(extension)
          ? ([FileJson, 'text-warning'] as const)
          : CODE_EXTENSIONS.has(extension)
            ? ([FileCode2, 'text-[var(--mc-syn-emphasis)]'] as const)
            : ([FileText, 'text-ink-tertiary'] as const)
    : ([FileText, 'text-ink-tertiary'] as const)

  return (
    <Glyph
      size={size}
      style={tint}
      className={cx('flex-none', tint ? undefined : tone, className)}
    />
  )
})

export function TreeTwisty({
  expanded,
  visible
}: {
  expanded: boolean
  visible: boolean
}): ReactElement {
  if (!visible) return <span className="inline-block w-[13px] flex-none" aria-hidden="true" />

  const Icon = expanded ? ChevronDown : ChevronRight
  return <Icon size={13} className="flex-none text-ink-tertiary" aria-hidden="true" />
}
