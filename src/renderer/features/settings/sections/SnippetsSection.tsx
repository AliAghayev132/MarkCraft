// ── @lib ───────────────────────────────────────────────────────────────────
import { Copy, PenLine, Plus, Trash2 } from '@icons'
import { useState, type ReactElement } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { Snippet } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Badge, Button, EmptyState, IconButton, dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { SettingsRow } from '@features/settings'
import { SnippetDialog, deleteSnippet, newSnippetId, saveSnippet } from '@features/snippets'

// ── types ──────────────────────────────────────────────────────────────────
import type { SectionProps } from './types'

/** How much of a body to show in the list before it stops being a preview. */
const PREVIEW = 90

/**
 * The saved blocks, all of them, with their triggers.
 *
 * A snippet is invisible until somebody types its trigger, which makes a
 * forgotten one indistinguishable from one that never saved. The whole list
 * being here — with the exact text `/…` needs — is what makes the feature
 * trustworthy rather than magic.
 */
export function SnippetsSection({ matches }: SectionProps): ReactElement {
  const t = useT()
  const snippets = useAppSelector((state) => state.settings.values.snippets.items)

  /** The snippet open in the editor, new or existing. */
  const [editing, setEditing] = useState<Snippet | null>(null)

  const create = (): void => {
    setEditing({ id: newSnippetId(), name: '', trigger: '', body: '' })
  }

  const duplicate = async (snippet: Snippet): Promise<void> => {
    await saveSnippet({
      ...snippet,
      id: newSnippetId(),
      name: t('snippets.copyOf', { name: snippet.name }),
      trigger: `${snippet.trigger}-2`
    })
  }

  const remove = async (snippet: Snippet): Promise<void> => {
    const confirmed = await dialogs.confirm({
      title: t('snippets.removeTitle', { name: snippet.name }),
      message: t('snippets.removeBody'),
      confirmLabel: t('common.delete'),
      tone: 'danger'
    })
    if (confirmed) await deleteSnippet(snippet.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-[64ch] text-xs leading-relaxed text-ink-tertiary">
        {t('snippets.description')}
      </p>

      <SettingsRow
        id="snippets.items"
        label={t('snippets.saved')}
        layout="stacked"
        highlighted={matches.has('snippets.items')}
      >
        {snippets.length === 0 ? (
          <EmptyState title={t('snippets.none')} description={t('snippets.noneHint')} />
        ) : (
          <ul className="flex flex-col gap-px">
            {snippets.map((snippet) => (
              <li
                key={snippet.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-hover"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-ink">{snippet.name}</span>
                    <Badge tone="neutral">{`/${snippet.trigger}`}</Badge>
                  </div>
                  <p className="truncate text-xs text-ink-tertiary">{preview(snippet.body)}</p>
                </div>

                <IconButton
                  icon={<PenLine size={13} />}
                  label={t('common.edit')}
                  size="sm"
                  onClick={() => setEditing(snippet)}
                />
                <IconButton
                  icon={<Copy size={13} />}
                  label={t('common.duplicate')}
                  size="sm"
                  onClick={() => void duplicate(snippet)}
                />
                <IconButton
                  icon={<Trash2 size={13} />}
                  label={t('common.delete')}
                  size="sm"
                  onClick={() => void remove(snippet)}
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsRow>

      <SettingsRow
        id="snippets.new"
        label={t('snippets.newTitle')}
        hint={t('snippets.newHint')}
        layout="stacked"
        highlighted={matches.has('snippets.new')}
      >
        <Button size="sm" icon={<Plus size={14} />} onClick={create}>
          {t('snippets.new')}
        </Button>
      </SettingsRow>

      <SnippetDialog snippet={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

/** One line of the body, short enough to sit in a list row. */
function preview(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > PREVIEW ? `${flat.slice(0, PREVIEW - 1)}…` : flat
}
