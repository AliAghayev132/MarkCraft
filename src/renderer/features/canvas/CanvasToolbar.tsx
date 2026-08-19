// ── @lib ───────────────────────────────────────────────────────────────────
import { Copy, Group, Tag, Trash2 } from '@icons'
import { useEffect, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { IconButton, Input } from '@ui'

// ── ./canvas ───────────────────────────────────────────────────────────────
import { CanvasPalette } from './CanvasPalette'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasToolbarProps } from './types'

/**
 * What can be done to what is selected.
 *
 * Docked at the bottom of the surface rather than floating over the selection.
 * A floating bar has to be moved out of the way of the very thing it acts on,
 * and at two cards apart it ends up covering one of them; down here it is
 * always in the same place, and the canvas above it stays whole.
 */
export function CanvasToolbar({
  selection,
  canvas,
  onColor,
  onDuplicate,
  onDelete,
  onGroup,
  onLabelEdge
}: CanvasToolbarProps): ReactElement | null {
  const t = useT()

  const count = selection.nodes.length + selection.edges.length

  // One edge selected on its own is the only case where labelling means
  // something — a label belongs to a line, not to a set of them.
  const soleEdge =
    selection.nodes.length === 0 && selection.edges.length === 1
      ? canvas.edges.find((edge) => edge.id === selection.edges[0])
      : undefined

  const [label, setLabel] = useState('')
  useEffect(() => setLabel(soleEdge?.label ?? ''), [soleEdge?.id, soleEdge?.label])

  if (count === 0) return null

  /*
   * The colour shown as current is the one every selected mark shares.
   * Anything else shows none selected, because there is no single answer and
   * pretending otherwise would highlight a colour half the selection is not.
   */
  const colours = new Set([
    ...canvas.nodes.filter((n) => selection.nodes.includes(n.id)).map((n) => n.color),
    ...canvas.edges.filter((e) => selection.edges.includes(e.id)).map((e) => e.color)
  ])
  const shared = colours.size === 1 ? [...colours][0] : undefined

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3">
      <div className="mc-no-drag pointer-events-auto flex items-center gap-2 rounded-xl border border-line bg-app/95 px-2.5 py-1.5 shadow-lg backdrop-blur">
        <span className="px-1 text-xs tabular-nums text-ink-tertiary">
          {t('canvas.selected', { count })}
        </span>

        <span className="h-5 w-px bg-line-subtle" role="presentation" />

        <CanvasPalette current={shared} onPick={onColor} />

        {soleEdge ? (
          <>
            <span className="h-5 w-px bg-line-subtle" role="presentation" />
            <Tag size={13} className="flex-none text-ink-tertiary" />
            <Input
              value={label}
              size="sm"
              placeholder={t('canvas.edgeLabel')}
              aria-label={t('canvas.edgeLabel')}
              className="w-36"
              onChange={(event) => setLabel(event.currentTarget.value)}
              onBlur={() => onLabelEdge(soleEdge.id, label)}
              // The surface below listens for Delete and Escape; a line's label
              // is text, and both mean something else while it is being typed.
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === 'Enter') onLabelEdge(soleEdge.id, label)
              }}
            />
          </>
        ) : null}

        <span className="h-5 w-px bg-line-subtle" role="presentation" />

        {selection.nodes.length > 0 ? (
          <>
            <IconButton
              icon={<Group size={15} />}
              label={t('canvas.groupSelection')}
              onClick={onGroup}
            />
            <IconButton
              icon={<Copy size={15} />}
              label={t('canvas.duplicate')}
              shortcut="mod+d"
              onClick={onDuplicate}
            />
          </>
        ) : null}

        <IconButton
          icon={<Trash2 size={15} />}
          label={t('common.delete')}
          shortcut="delete"
          onClick={onDelete}
        />
      </div>
    </div>
  )
}
