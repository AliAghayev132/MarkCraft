// ── @lib ───────────────────────────────────────────────────────────────────
import { memo, useMemo, type ReactElement } from '@lib/react'

// ── @features ──────────────────────────────────────────────────────────────
import { parseSvg, renderSvg } from './svg-tree'

// ── types ──────────────────────────────────────────────────────────────────
import type { CustomSvgIconProps } from './types'

/**
 * Renders a user-imported SVG.
 *
 * The parsing and the allowlist live in `svg-tree`, shared with the diagram
 * renderer; this component is the icon-shaped wrapper around it. The markup is
 * never assigned to `innerHTML` — an icon file from the internet is precisely
 * the kind of content that would make such a sink dangerous.
 */
export const CustomSvgIcon = memo(function CustomSvgIcon({
  source,
  size = 14,
  className,
  color
}: CustomSvgIconProps): ReactElement | null {
  const parsed = useMemo(() => parseSvg(source, 'icon'), [source])
  if (!parsed) return null

  return renderSvg(parsed, { size, className, color })
})
