// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useMemo } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  ICON_COLORS,
  customIconId,
  isCustomIcon,
  resolveIconRule,
  type CustomIcon,
  type IconSubject
} from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { iconsService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { resolveTheme, useAppSelector } from '@store'

// ── @utils ─────────────────────────────────────────────────────────────────
import { createExternalStore, useExternalStore } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { IconAppearance } from './types'

/**
 * Custom icons live outside Redux.
 *
 * They are file *markup* — bulky, non-serialisable in spirit, and changed only
 * by an explicit import — so keeping them in the store would make every
 * dispatch pay to scan them. A tiny external store gives components the same
 * subscribe-and-rerender behaviour without that cost.
 */
const customIcons = createExternalStore<CustomIcon[]>([])

let loaded = false

export async function reloadCustomIcons(): Promise<CustomIcon[]> {
  const icons = await iconsService.list()
  loaded = true
  customIcons.set(icons)
  return icons
}

export function setCustomIcons(icons: CustomIcon[]): void {
  loaded = true
  customIcons.set(icons)
}

/** The imported icons, loading them on first use. */
export function useCustomIcons(): CustomIcon[] {
  const icons = useExternalStore(customIcons)

  useEffect(() => {
    if (!loaded) void reloadCustomIcons()
  }, [])

  return icons
}

const NONE: IconAppearance = { iconName: null, customSource: null, color: null }

/**
 * The icon and colour a tree entry should use.
 *
 * Returns nulls when no rule matches, so the caller keeps its default
 * behaviour — the override is additive and never has to be undone.
 */
export function useIconAppearance(subject: IconSubject | null): IconAppearance {
  const rules = useAppSelector((state) => state.settings.values.icons.rules)
  const theme = useAppSelector((state) =>
    resolveTheme(state.settings.values, state.settings.systemPrefersDark)
  )
  const icons = useCustomIcons()

  return useMemo(() => {
    if (!subject || rules.length === 0) return NONE

    const rule = resolveIconRule(rules, subject)
    if (!rule) return NONE

    const color = rule.color ? (ICON_COLORS[rule.color]?.[theme] ?? null) : null

    if (isCustomIcon(rule.icon)) {
      const id = customIconId(rule.icon as string)
      const found = icons.find((icon) => icon.id === id)
      return { iconName: null, customSource: found?.source ?? null, color }
    }

    return { iconName: rule.icon, customSource: null, color }
  }, [rules, subject, theme, icons])
}

/**
 * A stable subject object, so `useIconAppearance`'s memo is not defeated by a
 * fresh object literal on every render of a tree row.
 */
export function useIconSubject(
  kind: 'file' | 'directory',
  name: string | undefined,
  path: string | undefined,
  ext: string | undefined
): IconSubject | null {
  return useMemo(
    () => (name && path ? { kind, name, path, ext: (ext ?? '').toLowerCase() } : null),
    [kind, name, path, ext]
  )
}
