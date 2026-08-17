// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useRef, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Popover } from '@ui'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'
import { commitSlash } from './slash-extension'
import { slashMenu } from './slash-store'

// ── types ──────────────────────────────────────────────────────────────────
import type { SlashMenuProps } from './types'

/**
 * The `/` block menu.
 *
 * Drawn on the shared popover so it dismisses, positions and flips like every
 * other floating surface, but without a focus trap: the caret has to stay in
 * the document, because the query is the text the user is still typing there.
 */
export function SlashMenu({ state }: SlashMenuProps): ReactElement | null {
  const t = useT()
  const listRef = useRef<HTMLDivElement>(null)

  const index = state?.index ?? 0

  /* Arrow keys are handled in the editor, so the list has to be scrolled from
     here — the highlighted row is never the focused element. */
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!state) return null

  const choose = (at: number): void => {
    const view = editorRegistry.getSourceView()
    if (!view) return
    slashMenu.highlight(at)
    commitSlash(view)
  }

  return (
    <Popover
      open
      anchor={state.anchor}
      onClose={() => slashMenu.close()}
      placement="bottom-start"
      offset={6}
      trapFocus={false}
      role="listbox"
      ariaLabel={t('slash.title')}
      className="w-[264px]"
    >
      <div ref={listRef}>
        {state.items.map((block, at) => (
          <button
            key={block.id}
            type="button"
            role="option"
            aria-selected={at === index}
            data-index={at}
            /* The caret must not leave the document, and a mousedown inside a
               popover would take it. */
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => slashMenu.highlight(at)}
            onClick={() => choose(at)}
            className={cx(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm',
              at === index ? 'bg-active text-ink' : 'text-ink-secondary'
            )}
          >
            <span className="flex size-6 flex-none items-center justify-center rounded border border-line text-ink-tertiary">
              {block.icon}
            </span>
            {block.label}
          </button>
        ))}
      </div>
    </Popover>
  )
}
