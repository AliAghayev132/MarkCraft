// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useRef, type ReactElement } from '@lib/react'

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
import { CardRichEditor } from './CardRichEditor'
import { FileCard, LinkCard } from './CanvasReferences'

// ── types ──────────────────────────────────────────────────────────────────
import type { CanvasCardProps, CardDraft } from './types'

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

/** How the writing sits across the card, and down it. */
const ALIGNMENT: Record<string, string> = {
  left: 'items-start text-left',
  centre: 'items-center text-center',
  right: 'items-end text-right'
}

const VERTICAL: Record<string, string> = {
  top: 'justify-start',
  middle: 'justify-center',
  bottom: 'justify-end'
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
  draft,
  onDraft
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
        borderWidth: 2,
        backgroundColor: `color-mix(in srgb, ${colour} 22%, var(--mc-bg-app))`
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
  const clipped = shape !== 'rectangle' && shape !== 'rounded' && shape !== 'plain'
  const bare = shape === 'plain'

  /*
   * A shape that is not a rectangle has less room at its edges than in its
   * middle, so it starts centred — otherwise the first card anyone turns into a
   * triangle has its text hanging outside the triangle. An explicit choice
   * still wins.
   */
  const align =
    node.align ?? (shape === 'rectangle' || shape === 'rounded' || shape === 'plain' ? 'left' : 'centre')
  const valign = node.valign ?? (clipped ? (shape === 'triangle' ? 'bottom' : 'middle') : 'top')

  return (
    <div
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        ...(node.type === 'group' && colour ? { borderColor: colour } : bare ? {} : painted),
        ...(bare && colour ? { color: colour } : {}),
        ...(clipped ? { clipPath: CLIP[shape], border: 'none' } : {}),
        ...(shape === 'ellipse' ? { borderRadius: '50%' } : {}),
        ...(shape === 'rounded' ? { borderRadius: '1.75rem' } : {})
      }}
      className={cx(
        'absolute',
        shape === 'rectangle' ? 'rounded-lg' : '',
        // Writing on the canvas has no card: no border, no fill, no shadow.
        // Selected it still shows a ring, or there would be no way to tell it
        // apart from the surface it is written on.
        bare
          ? 'border border-transparent'
          : node.type === 'group'
            ? 'border border-dashed border-line bg-transparent'
            : 'border border-line bg-app shadow-sm',
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
          'flex h-full w-full flex-col overflow-hidden p-2.5',
          shape === 'rectangle' ? 'rounded-lg' : '',
          // A triangle's usable room is its lower middle; a diamond's is its
          // centre. Text laid out corner to corner would fall outside the shape.
          shape === 'triangle' ? 'px-6 pb-2' : '',
          shape === 'diamond' ? 'px-8' : '',
          shape === 'ellipse' ? 'px-5' : '',
          bare ? 'p-0' : '',
          VERTICAL[valign],
          ALIGNMENT[align]
        )}
      >
        {editing && node.type !== 'group' ? (
          <CardRichEditor
            value={draft?.text ?? node.text ?? ''}
            onChange={(markdown) => onDraft({ text: markdown, from: 0, to: 0 })}
            onDone={() => onCommitEdit(draft?.text ?? node.text ?? '')}
            onCancel={onCancelEdit}
          />
        ) : editing ? (
          <CardEditor
            value={node.type === 'group' ? (node.label ?? '') : (node.text ?? '')}
            // A group's label is one line, and Markdown in it would not be
            // rendered anywhere — so it gets a field and no formatting.
            single
            draft={draft}
            onDraft={onDraft}
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
 *
 * What is being written is reported upwards as it changes, because the
 * formatting bar is docked to the surface rather than floating over the card:
 * above a card near the top of the canvas it would sit under the window's own
 * header, where a click reaches the header instead.
 */
function CardEditor({
  value,
  single,
  draft,
  onDraft,
  onCommit,
  onCancel
}: {
  value: string
  single: boolean
  draft: CardDraft | null
  onDraft: (draft: CardDraft | null) => void
  onCommit: (text: string) => void
  onCancel: () => void
}): ReactElement {
  const field = useRef<HTMLTextAreaElement>(null)
  const text = draft?.text ?? value

  useEffect(() => {
    const element = field.current
    if (!element) return

    element.focus()
    element.setSelectionRange(element.value.length, element.value.length)
    onDraft({ text: value, from: value.length, to: value.length })

    return () => onDraft(null)
    // Once, when the editor opens: `onDraft` is stable and `value` is the text
    // it opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * The bar's operations arrive as a whole new document. The range is written
   * after React has put the text in, or it would be set against the old value
   * and land somewhere else.
   */
  useEffect(() => {
    const element = field.current
    if (!element || !draft || element.value !== draft.text) return
    if (element.selectionStart === draft.from && element.selectionEnd === draft.to) return

    element.focus()
    element.setSelectionRange(draft.from, draft.to)
  }, [draft])

  const track = (): void => {
    const element = field.current
    if (!element) return
    onDraft({ text: element.value, from: element.selectionStart, to: element.selectionEnd })
  }

  return (
    <Textarea
      ref={field}
      value={text}
      monospace
      spellCheck={false}
      className="h-full min-h-0 resize-none border-none bg-transparent p-0 shadow-none focus:shadow-none"
      onChange={track}
      onSelect={track}
      onBlur={() => onCommit(text)}
      // The surface below is listening for drags and keystrokes; neither should
      // fire while a card is being written in.
      onPointerDown={(event) => event.stopPropagation()}
      /*
       * Deliberately not stopped here.
       *
       * The field used to swallow every key to keep them off the canvas, and
       * the canvas's own listener already declines everything while a card is
       * being written in — so all the stopping did was hide Ctrl+B from the one
       * place that answers it. Escape and Enter are handled and prevented; the
       * rest travel, and the canvas lets writing through.
       */
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onCancel()
          return
        }

        if (single && event.key === 'Enter') {
          event.preventDefault()
          event.stopPropagation()
          onCommit(text)
        }
      }}
    />
  )
}
