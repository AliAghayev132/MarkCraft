// ── @lib ───────────────────────────────────────────────────────────────────
import { Smile } from '@icons'
import { useMemo, useState, type ReactElement } from '@lib/react'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Modal, SearchInput } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── ./ ─────────────────────────────────────────────────────────────────────
import { EMOJI_GROUPS, searchEmoji } from './emoji-data'

// ── types ──────────────────────────────────────────────────────────────────
import type { EmojiGroup, EmojiPickerProps } from './types'

/**
 * Insert an emoji, without leaving the keyboard.
 *
 * The character is inserted directly rather than as a `:shortcode:`. Markdown
 * has no shortcode syntax — GitHub's renderer supplies it, and a document
 * carrying `:rocket:` renders as literal text everywhere else. The emoji *is*
 * the text.
 */
export function EmojiPicker({ open, onClose }: EmojiPickerProps): ReactElement | null {
  const t = useT()
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<EmojiGroup | null>(null)

  const results = useMemo(() => {
    const found = searchEmoji(query)
    // A category filter is meaningless once someone is searching: they want the
    // match, not the match that happens to be in the open tab.
    return query.trim() || group === null ? found : found.filter((e) => e.group === group)
  }, [query, group])

  if (!open) return null

  const insert = (char: string): void => {
    editorRegistry.insertText(char)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={<Smile size={18} />}
      title={t('emoji.title')}
      description={t('emoji.hint')}
      size="md"
    >
      <div className="flex flex-col gap-3">
        <SearchInput
          autoFocus
          value={query}
          placeholder={t('emoji.search')}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery('')}
          onKeyDown={(event) => {
            // Enter takes the first match, which is what a search box is for.
            if (event.key !== 'Enter') return
            const first = results[0]
            if (first) insert(first.char)
          }}
        />

        {query.trim() === '' ? (
          <div className="flex flex-wrap gap-1">
            <GroupTab active={group === null} onClick={() => setGroup(null)}>
              {t('emoji.groups.all')}
            </GroupTab>
            {EMOJI_GROUPS.map((id) => (
              <GroupTab key={id} active={group === id} onClick={() => setGroup(id)}>
                {t(`emoji.groups.${id}`)}
              </GroupTab>
            ))}
          </div>
        ) : null}

        {results.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-tertiary">{t('emoji.empty')}</p>
        ) : (
          <div className="grid max-h-64 grid-cols-10 gap-0.5 overflow-y-auto">
            {results.map((entry) => (
              <button
                key={entry.char}
                type="button"
                aria-label={entry.keywords.split(' ')[0]}
                title={entry.keywords}
                onClick={() => insert(entry.char)}
                className="rounded p-1 text-xl leading-none hover:bg-hover focus-visible:shadow-focus focus-visible:outline-none"
              >
                {entry.char}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function GroupTab({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: string
}): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'rounded-md px-2 py-1 text-xs transition-colors',
        active ? 'bg-selected text-ink' : 'text-ink-secondary hover:bg-hover'
      )}
    >
      {children}
    </button>
  )
}
