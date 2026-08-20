// ── @lib ───────────────────────────────────────────────────────────────────
import { Check, MessageSquareText, Quote, Trash2 } from '@icons'
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement
} from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { annotationLabel, placeAll } from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { useT } from '@i18n'

// ── @store ─────────────────────────────────────────────────────────────────
import { selectActiveDocument, useAppSelector } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, EmptyState, IconButton, Textarea, dialogs } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { editorRegistry } from '@features/editor'

// ── @utils ─────────────────────────────────────────────────────────────────
import { cx } from '@utils'

// ── types ──────────────────────────────────────────────────────────────────
import type { CommentRowProps } from './types'

// ── ./annotations ──────────────────────────────────────────────────────────
import {
  addComment,
  annotationStore,
  deleteComment,
  editComment,
  resolveComment
} from './annotation-store'

/**
 * The comments on the open document.
 *
 * They are listed in the order they appear in the text rather than the order
 * they were written, because that is the order somebody reads them in — a
 * comment list sorted by time is a list you have to hold the document in your
 * head to follow.
 *
 * A comment whose passage has been deleted is kept and marked, at the bottom.
 * The sentence going is often exactly what the comment was asking for, and
 * quietly deleting the note would throw away the record of why.
 */
export function CommentPanel(): ReactElement {
  const t = useT()
  const document = useAppSelector(selectActiveDocument)

  const state = useSyncExternalStore(annotationStore.subscribe, annotationStore.get)

  /** What is being written into the new-comment box. */
  const [draft, setDraft] = useState('')

  // The list belongs to the open document; opening another loads its own.
  useEffect(() => {
    void annotationStore.open(document?.path ?? null)
  }, [document?.path])

  const placed = useMemo(
    () => placeAll(document?.content ?? '', state.annotations),
    [document?.content, state.annotations]
  )

  const open = placed.filter((each) => !each.resolved)
  const resolved = placed.filter((each) => each.resolved)

  const submit = async (): Promise<void> => {
    const body = draft.trim()
    if (body === '') return
    if (await addComment(body)) setDraft('')
  }

  if (!document) {
    return (
      <div className="p-3">
        <EmptyState title={t('comments.noDocument')} description={t('comments.noDocumentHint')} />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-1.5 border-b border-line-subtle p-2.5">
        <Textarea
          rows={2}
          value={draft}
          placeholder={t('comments.placeholder')}
          onChange={(event) => setDraft(event.currentTarget.value)}
          onKeyDown={(event) => {
            // Enter alone makes a paragraph; a comment is prose and often runs
            // to more than one line.
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              void submit()
            }
          }}
        />
        <Button
          size="sm"
          icon={<MessageSquareText size={14} />}
          disabled={draft.trim() === ''}
          onClick={() => void submit()}
        >
          {t('comments.add')}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {placed.length === 0 ? (
          <EmptyState title={t('comments.none')} description={t('comments.noneHint')} />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {open.map((comment) => (
              <CommentRow key={comment.id} comment={comment} />
            ))}

            {resolved.length > 0 ? (
              <li className="px-1 pt-2 text-[11px] uppercase tracking-wide text-ink-tertiary">
                {t('comments.resolvedCount', { count: resolved.length })}
              </li>
            ) : null}

            {resolved.map((comment) => (
              <CommentRow key={comment.id} comment={comment} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** One comment: what it is about, what it says, and what can be done to it. */
function CommentRow({ comment }: CommentRowProps): ReactElement {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(comment.body)

  const label = annotationLabel(comment.anchor)

  const remove = async (): Promise<void> => {
    const confirmed = await dialogs.confirm({
      title: t('comments.removeTitle'),
      message: t('comments.removeBody'),
      confirmLabel: t('common.delete'),
      tone: 'danger'
    })
    if (confirmed) await deleteComment(comment.id)
  }

  const commit = async (): Promise<void> => {
    setEditing(false)
    const next = body.trim()
    if (next !== '' && next !== comment.body) await editComment(comment.id, next)
    else setBody(comment.body)
  }

  return (
    <li
      className={cx(
        'rounded-md border border-line-subtle bg-surface p-2',
        comment.resolved ? 'opacity-60' : ''
      )}
    >
      <button
        type="button"
        disabled={comment.at === null}
        onClick={() => {
          if (comment.at) editorRegistry.revealRange(comment.at.from, comment.at.to)
        }}
        className={cx(
          'mb-1 flex w-full items-start gap-1.5 text-left',
          comment.at === null ? 'cursor-default' : 'group'
        )}
      >
        <Quote size={12} className="mt-[3px] flex-none text-ink-tertiary" />
        <span
          className={cx(
            'min-w-0 flex-1 truncate text-xs',
            comment.at === null
              ? 'text-ink-tertiary line-through'
              : 'text-ink-secondary group-hover:text-accent'
          )}
        >
          {label === '' ? t('comments.noQuote') : label}
        </span>
      </button>

      {comment.at === null ? (
        <p className="mb-1 text-[11px] text-warning">{t('comments.orphaned')}</p>
      ) : comment.at.confidence === 'moved' ? (
        <p className="mb-1 text-[11px] text-ink-tertiary">{t('comments.moved')}</p>
      ) : null}

      {editing ? (
        <Textarea
          autoFocus
          rows={3}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              setBody(comment.body)
              setEditing(false)
            }
          }}
        />
      ) : (
        <p
          className="whitespace-pre-wrap break-words text-sm text-ink"
          onDoubleClick={() => setEditing(true)}
        >
          {comment.body}
        </p>
      )}

      <div className="mt-1 flex items-center justify-end gap-0.5">
        <IconButton
          icon={<Check size={13} />}
          label={comment.resolved ? t('comments.reopen') : t('comments.resolve')}
          size="sm"
          onClick={() => void resolveComment(comment.id)}
        />
        <IconButton
          icon={<Trash2 size={13} />}
          label={t('common.delete')}
          size="sm"
          onClick={() => void remove()}
        />
      </div>
    </li>
  )
}
