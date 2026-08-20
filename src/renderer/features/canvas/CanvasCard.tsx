// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { canvasColorCss, SIDES, type Side } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Textarea } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { renderMarkdown } from '@features/editor/markdown'
import { FileCard, LinkCard } from './CanvasReferences'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasCardProps } from './types'

/**
 * The outlines, in a hundred-unit box stretched to the card.
 *
 * Percentages rather than pixels so a card keeps its shape at any size, and
 * `non-scaling-stroke` so the line stays one pixel wide however far it is
 * stretched.
 */
const CLIP: Record<string, string> = {
  ellipse: 'ellipse(50% 50% at 50% 50%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)'
}

const OUTLINE: Record<string, string> = {
  ellipse: 'M 50 0 A 50 50 0 1 1 49.99 0 Z',
  diamond: 'M 50 0 L 100 50 L 50 100 L 0 50 Z',
  triangle: 'M 50 0 L 100 100 L 0 100 Z'
}

/** Where each anchor handle sits on the card's border. */
const HANDLE_AT: Record<Side, string> = {
  top: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2',
  right: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
  left: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2'
}

/**
 * One card.
 *
 * The four anchor handles and the resize corner only appear on the selected
 * card. Showing them on every card would put twenty grab targets on screen at
 * once, and dragging a card would become a game of missing them.
 */
export function CanvasCard({
  node,
  selected,
  editing,
  zoom,
  onCommitEdit,
  onCancelEdit,
  onStartLink,
  onStartResize,
}: CanvasCardProps): ReactElement {
  const t = useT()
  const colour = canvasColorCss(node.color)

  /*
   * Colour is the border and a wash, never a solid fill. A card is read, and
   * filling it would put the document's text on an arbitrary background where
   * nothing can promise it stays legible — the wash keeps the card's own
   * surface underneath and only tints it.
   */
  const painted = colour
    ? {
        borderColor: colour,
        backgroundColor: `color-mix(in srgb, ${colour} 12%, var(--mc-bg-app))`
      }
    : undefined

  /*
   * Anything that is not a rectangle is cut out of the card rather than drawn
   * over it. A clip path keeps one element: the border, the wash, the selection
   * ring and the text all follow the same outline, and there is no second shape
   * underneath to keep in step with the first.
   *
   * The border is redrawn inside the clip, because a clipped element has no
   * outside edge left for a CSS border to sit on.
   */
  const shape = node.shape ?? 'rectangle'
  const clipped = shape !== 'rectangle' && shape !== 'rounded'

  return (
    <div
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        ...(node.type === 'group' && colour ? { borderColor: colour } : painted),
        ...(clipped ? { clipPath: CLIP[shape], border: 'none' } : {}),
        ...(shape === 'ellipse' ? { borderRadius: '50%' } : {}),
        ...(shape === 'rounded' ? { borderRadius: '1.75rem' } : {})
      }}
      className={cx(
        'absolute border',
        shape === 'rectangle' ? 'rounded-lg' : '',
        node.type === 'group'
          ? 'border-dashed border-line bg-transparent'
          : 'border-line bg-app shadow-sm',
        selected ? 'ring-2 ring-accent' : ''
      )}
    >
      {/* The outline, for a shape a CSS border cannot follow. */}
      {clipped ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <path
            d={OUTLINE[shape]}
            fill="none"
            stroke={colour ?? 'var(--mc-line)'}
            strokeWidth={selected ? 1.6 : 1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}

      <div
        className={cx(
          'h-full w-full overflow-hidden p-2.5',
          shape === 'rectangle' ? 'rounded-lg' : '',
          // A triangle's usable room is its lower middle; a diamond's is its
          // centre. Text laid out corner to corner would fall outside the shape.
          shape === 'triangle' ? 'flex items-end justify-center px-6 pb-2' : '',
          shape === 'diamond' ? 'flex items-center justify-center px-8' : '',
          shape === 'ellipse' ? 'flex items-center justify-center px-5' : ''
        )}
      >
        {editing ? (
          <CardEditor
            value={node.type === 'group' ? (node.label ?? '') : (node.text ?? '')}
            single={node.type === 'group'}
            onCommit={onCommitEdit}
            onCancel={onCancelEdit}
          />
        ) : node.type === 'group' ? (
          <span className="text-2xs font-semibold uppercase tracking-wider text-ink-tertiary">
            {node.label ?? ''}
          </span>
        ) : node.type === 'file' ? (
          <FileCard node={node} />
        ) : node.type === 'link' ? (
          <LinkCard node={node} />
        ) : (
          <article className="mc-document mc-canvas-card">
            {renderMarkdown(node.text ?? '', { baseDir: null, gfm: true, highlight: false })}
          </article>
        )}
      </div>

      {selected && !editing ? (
        <>
          {SIDES.map((side) => (
            <button
              key={side}
              type="button"
              aria-label={t(`canvas.linkFrom.${side}`)}
              // Counter-scaled so the handle is the same size on screen at
              // every zoom — at 25% it would otherwise be four pixels across.
              style={{ transform: `scale(${1 / zoom})` }}
              className={cx(
                'absolute size-3 rounded-full border-2 border-app bg-accent',
                'cursor-crosshair hover:scale-125',
                HANDLE_AT[side]
              )}
              onPointerDown={(event) => {
                event.stopPropagation()
                onStartLink(side, event)
              }}
            />
          ))}

          <button
            type="button"
            aria-label={t('canvas.resize')}
            style={{ transform: `scale(${1 / zoom})` }}
            className="absolute -bottom-1 -right-1 size-3 cursor-nwse-resize rounded-sm border-2 border-app bg-ink-tertiary"
            onPointerDown={(event) => {
              event.stopPropagation()
              onStartResize(event)
            }}
          />
        </>
      ) : null}
    </div>
  )
}

/**
 * The editor that replaces a card's contents while it is being written.
 *
 * Escape abandons the edit and Enter commits it for a group label, because a
 * label is one line. A text card keeps Enter for what it means everywhere else
 * in the application — a new line — and commits when focus leaves.
 */
function CardEditor({
  value,
  single,
  onCommit,
  onCancel
}: {
  value: string
  single: boolean
  onCommit: (text: string) => void
  onCancel: () => void
}): ReactElement {
  const [text, setText] = useState(value)
  const field = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const element = field.current
    if (!element) return

    element.focus()
    element.setSelectionRange(element.value.length, element.value.length)
  }, [])

  return (
    <Textarea
      ref={field}
      value={text}
      monospace
      spellCheck={false}
      className="h-full min-h-0 resize-none border-none bg-transparent p-0 shadow-none focus:shadow-none"
      onChange={(event) => setText(event.currentTarget.value)}
      onBlur={() => onCommit(text)}
      // The surface below is listening for drags and keystrokes; neither should
      // fire while a card is being written in.
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation()

        if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
          return
        }

        if (single && event.key === 'Enter') {
          event.preventDefault()
          onCommit(text)
        }
      }}
    />
  )
}
