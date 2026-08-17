// ── @lib ───────────────────────────────────────────────────────────────────
import { ChevronDown, ChevronUp, RotateCcw } from '@icons'
import { useMemo, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { updateSettings } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Checkbox, IconButton } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { toolbarToolIds } from '@features/editor/toolbar'

/**
 * Which formatting buttons appear, and in what order.
 *
 * The stored list is the *chosen* arrangement; an empty list means "the one the
 * application ships with". That distinction matters — storing the defaults
 * explicitly would freeze today's toolbar into every existing installation, so
 * a tool added in a later version would never appear for anyone.
 *
 * Reordering is buttons rather than drag-and-drop: a drag target this small is
 * awkward with a mouse and impossible with a keyboard, and the list is short
 * enough that two arrows are faster anyway.
 */
export function ToolbarCustomizer(): ReactElement {
  const t = useT()
  const chosen = useAppSelector((state) => state.settings.values.appearance.toolbarItems)
  const available = useMemo(() => toolbarToolIds(), [])

  // The visible order: what the user picked, then everything they turned off.
  const order = useMemo(() => {
    if (chosen.length === 0) return available.map((tool) => tool.id)

    const known = new Set(available.map((tool) => tool.id))
    const picked = chosen.filter((id) => known.has(id))
    const rest = available.map((tool) => tool.id).filter((id) => !picked.includes(id))
    return [...picked, ...rest]
  }, [chosen, available])

  const enabled = useMemo(
    () => new Set(chosen.length === 0 ? available.map((tool) => tool.id) : chosen),
    [chosen, available]
  )

  const labelFor = (id: string): string => available.find((tool) => tool.id === id)?.label ?? id

  const save = (next: string[]): void => {
    void updateSettings({ appearance: { toolbarItems: next } })
  }

  const toggle = (id: string): void => {
    save(enabled.has(id) ? order.filter((item) => item !== id && enabled.has(item)) : [...order.filter((item) => enabled.has(item) || item === id)])
  }

  const move = (id: string, delta: number): void => {
    const list = [...order]
    const from = list.indexOf(id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= list.length) return

    list.splice(to, 0, ...list.splice(from, 1))
    save(list.filter((item) => enabled.has(item)))
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex max-h-64 flex-col overflow-y-auto rounded-md border border-line-subtle">
        {order.map((id, index) => (
          <li
            key={id}
            className="flex items-center gap-2 border-b border-line-subtle px-2 py-1 last:border-b-0"
          >
            <Checkbox
              checked={enabled.has(id)}
              onChange={() => toggle(id)}
              label={labelFor(id)}
            />

            <span className="ml-auto flex flex-none items-center gap-0.5">
              <IconButton
                icon={<ChevronUp size={13} />}
                label={t('settings.appearance.moveUp')}
                size="sm"
                disabled={index === 0}
                onClick={() => move(id, -1)}
              />
              <IconButton
                icon={<ChevronDown size={13} />}
                label={t('settings.appearance.moveDown')}
                size="sm"
                disabled={index === order.length - 1}
                onClick={() => move(id, 1)}
              />
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={13} />}
          disabled={chosen.length === 0}
          onClick={() => save([])}
        >
          {t('settings.appearance.resetToolbar')}
        </Button>
        <span className="text-xs text-ink-tertiary">
          {chosen.length === 0
            ? t('settings.appearance.toolbarDefault')
            : t('settings.appearance.toolbarCount', { count: enabled.size })}
        </span>
      </div>
    </div>
  )
}
