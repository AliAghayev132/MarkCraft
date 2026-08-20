// ── @lib ───────────────────────────────────────────────────────────────────
import {
  Ban,
  BringToFront,
  Circle,
  Copy,
  FileText,
  Group,
  ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  Scaling,
  Search,
  Scissors,
  SendToBack,
  Shapes,
  Square,
  Trash2,
  Triangle,
  Type
} from '@icons'
import { useCallback, type RefObject } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import {
  CANVAS_ALIGNS,
  CANVAS_COLOR_SLOTS,
  CANVAS_SHAPES,
  CANVAS_VALIGNS,
  canvasColorCss,
  type CanvasNode,
  type CanvasShape
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { useContextMenu } from '@ui'

// ── types ──────────────────────────────────────────────────────────────────
import type { MenuEntry, MenuItemDescriptor } from '@ui/types'
import type { CanvasMenuActions } from './types'

const SHAPE_ICON: Record<CanvasShape, typeof Square> = {
  rectangle: Square,
  rounded: Square,
  ellipse: Circle,
  diamond: Shapes,
  triangle: Triangle,
  plain: Type
}

/**
 * The menu the right button opens.
 *
 * Everything the toolbar offers, plus the things that only make sense where the
 * click landed — pasting *here*, adding a card *here*. A canvas is a surface
 * people point at, and a toolbar at the bottom of the window cannot know where
 * they were pointing.
 */
export function useCanvasMenu(
  actionsRef: RefObject<CanvasMenuActions | null>
): (event: React.MouseEvent, node: CanvasNode | null) => void {
  const t = useT()
  const show = useContextMenu()

  return useCallback(
    (event, node) => {
      const actions = actionsRef.current
      if (!actions) return

      const colours: MenuItemDescriptor[] = [
        {
          id: 'colour-none',
          label: t('canvas.noColour'),
          icon: <Ban size={14} />,
          onSelect: () => actions.colour(undefined)
        },
        ...CANVAS_COLOR_SLOTS.map((slot) => ({
          id: `colour-${slot}`,
          label: t(`canvas.colours.${slot}`),
          icon: (
            <span
              aria-hidden="true"
              style={{ backgroundColor: canvasColorCss(slot) ?? undefined }}
              className="size-3.5 rounded-full"
            />
          ),
          onSelect: () => actions.colour(slot)
        }))
      ]

      /*
       * Across and down, as one list rather than two submenus. Nine entries is
       * a lot to name, but "centred, at the bottom" is one place a person is
       * pointing at — and making them open two menus to say it would be
       * pedantry about a distinction they are not making.
       */
      const positions: MenuItemDescriptor[] = CANVAS_VALIGNS.flatMap((valign) =>
        CANVAS_ALIGNS.map((align) => ({
          id: `align-${valign}-${align}`,
          label: t(`canvas.positions.${valign}.${align}`),
          checked: (node?.valign ?? 'top') === valign && (node?.align ?? 'left') === align,
          onSelect: () => actions.align(align, valign)
        }))
      )

      const shapes: MenuItemDescriptor[] = CANVAS_SHAPES.map((shape) => {
        const Glyph = SHAPE_ICON[shape]
        return {
          id: `shape-${shape}`,
          label: t(`canvas.shapes.${shape}`),
          icon: <Glyph size={14} />,
          checked: (node?.shape ?? 'rectangle') === shape,
          onSelect: () => actions.shape(shape)
        }
      })

      const forCard = (card: CanvasNode): MenuEntry[] => [
            {
              id: 'edit',
              label:
                card.type === 'text' || card.type === 'group'
                  ? t('canvas.editCard')
                  : t('canvas.followCard'),
              shortcut: 'enter',
              onSelect: () => actions.open(card)
            },
            { id: 'sep1', separator: true },
            { id: 'colour', label: t('canvas.colour'), submenu: colours },
            { id: 'shape', label: t('canvas.shape'), submenu: shapes },
            { id: 'align', label: t('canvas.textPosition'), submenu: positions },
            { id: 'sep2', separator: true },
            {
              id: 'copy',
              label: t('common.copy'),
              icon: <Copy size={14} />,
              shortcut: 'mod+c',
              onSelect: actions.copy
            },
            {
              id: 'cut',
              label: t('common.cut'),
              icon: <Scissors size={14} />,
              shortcut: 'mod+x',
              onSelect: actions.cut
            },
            {
              id: 'duplicate',
              label: t('canvas.duplicate'),
              shortcut: 'mod+d',
              onSelect: actions.duplicate
            },
            { id: 'sep3', separator: true },
            {
              id: 'front',
              label: t('canvas.bringToFront'),
              icon: <BringToFront size={14} />,
              onSelect: () => actions.restack('front')
            },
            {
              id: 'back',
              label: t('canvas.sendToBack'),
              icon: <SendToBack size={14} />,
              onSelect: () => actions.restack('back')
            },
            {
              id: 'group',
              label: t('canvas.groupSelection'),
              icon: <Group size={14} />,
              onSelect: actions.group
            },
            { id: 'sep4', separator: true },
            {
              id: 'delete',
              label: t('common.delete'),
              icon: <Trash2 size={14} />,
              shortcut: 'delete',
              danger: true,
              onSelect: actions.remove
            }
      ]

      const onSurfaceItems: MenuEntry[] = [
            {
              id: 'add',
              label: t('canvas.addCardHere'),
              onSelect: () => actions.addHere(event.clientX, event.clientY)
            },
            {
              id: 'addText',
              label: t('canvas.addTextHere'),
              icon: <Type size={14} />,
              onSelect: () => actions.addTextHere(event.clientX, event.clientY)
            },
            {
              id: 'paste',
              label: t('canvas.pasteHere'),
              shortcut: 'mod+v',
              disabled: !actions.canPaste(),
              onSelect: () => actions.paste(event.clientX, event.clientY)
            },
            { id: 'sep5', separator: true },
            { id: 'selectAll', label: t('canvas.selectAll'), shortcut: 'mod+a', onSelect: actions.selectAll },
            { id: 'sep-out', separator: true },
            {
              id: 'find',
              label: t('canvas.find'),
              icon: <Search size={14} />,
              shortcut: 'mod+f',
              onSelect: actions.find
            },
            {
              id: 'fitCards',
              label: t('canvas.fitCards'),
              icon: <Scaling size={14} />,
              onSelect: actions.fitCards
            },
            {
              id: 'exportImage',
              label: t('canvas.exportImage'),
              icon: <ImageIcon size={14} />,
              submenu: [
                {
                  id: 'export-png',
                  label: t('canvas.exportPng'),
                  onSelect: () => actions.exportImage('png')
                },
                {
                  id: 'export-svg',
                  label: t('canvas.exportSvg'),
                  onSelect: () => actions.exportImage('svg')
                }
              ]
            },
            {
              id: 'templates',
              label: t('canvas.templates.add'),
              icon: <LayoutTemplate size={14} />,
              onSelect: actions.templates
            },
            {
              id: 'tidy',
              label: t('canvas.tidy'),
              icon: <LayoutGrid size={14} />,
              onSelect: actions.tidy
            },
            {
              id: 'writeUp',
              label: t('canvas.writeUp'),
              icon: <FileText size={14} />,
              onSelect: actions.writeUp
            },
        { id: 'fit', label: t('canvas.fit'), onSelect: actions.fit }
      ]

      show(event, node ? forCard(node) : onSurfaceItems, t('canvas.title'))
    },
    [t, show, actionsRef]
  )
}
