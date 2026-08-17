// ── @lib ───────────────────────────────────────────────────────────────────
import { LifeBuoy } from '@icons'
import { useEffect, useState } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import { basename, formatRelativeTime, pluralize } from '@shared'
import type { RecoveryRecord } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { getSettings, recoveryService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { contentChanged, dispatch, fileAdopted, untitledCreated } from '@store'

// ── @ui ────────────────────────────────────────────────────────────────────
import { Button, Checkbox, Modal, ModalActions } from '@ui'

// ── @features ──────────────────────────────────────────────────────────────
import { readAllowingRemembered } from '.'

/**
 * Crash recovery (§21).
 *
 * Anything left in the journal at startup is, by definition, work that never
 * reached disk. The user is offered it explicitly — nothing is restored behind
 * their back, and discarding requires a deliberate click.
 */
export function RecoveryPrompt(): React.ReactElement | null {
  const [records, setRecords] = useState<RecoveryRecord[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void recoveryService.list().then((found) => {
      const usable = found.filter((record) => record.content.trim().length > 0)
      if (usable.length === 0) {
        setRecords([])
        return
      }
      setRecords(usable)
      setSelected(new Set(usable.map((record) => record.id)))
    })
  }, [])

  if (!records || records.length === 0) return null

  const restore = async (): Promise<void> => {
    setBusy(true)
    const viewMode = getSettings().markdown.defaultViewMode
    let restored = 0

    for (const record of records) {
      if (!selected.has(record.id)) {
        await recoveryService.drop(record.id)
        continue
      }

      try {
        if (record.path) {
          // Load the on-disk version first so the document keeps a real file
          // identity and a valid stamp, then apply the recovered text on top.
          const file = await readAllowingRemembered(record.path)
          const action = fileAdopted(file, viewMode)
          dispatch(action)
          dispatch(contentChanged({ id: action.payload.id, content: record.content }))
        } else {
          dispatch(untitledCreated(record.content, viewMode))
        }
        restored++
      } catch {
        // The file is gone; keep the text as an untitled document rather than
        // losing it.
        dispatch(untitledCreated(record.content, viewMode))
        restored++
      }

      await recoveryService.drop(record.id)
    }

    setBusy(false)
    setRecords([])
    if (restored > 0) {
      toast.success(
        `Recovered ${pluralize(restored, 'document')}`,
        'Review the changes, then save the ones you want to keep.'
      )
    }
  }

  const discard = async (): Promise<void> => {
    setBusy(true)
    await recoveryService.clear()
    setBusy(false)
    setRecords([])
  }

  const toggle = (id: string): void => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Modal
      open
      onClose={() => setRecords([])}
      title="Recover unsaved work"
      description={`MarkCraft closed with ${pluralize(
        records.length,
        'document'
      )} that had unsaved changes. They were kept in the recovery journal.`}
      icon={<LifeBuoy size={17} />}
      size="md"
      closeOnBackdrop={false}
      showCloseButton={false}
      footer={
        <ModalActions
          aside={`${selected.size} of ${records.length} selected`}
        >
          <Button variant="dangerGhost" disabled={busy} onClick={() => void discard()}>
            Discard All
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={selected.size === 0}
            data-autofocus
            onClick={() => void restore()}
          >
            Recover Selected
          </Button>
        </ModalActions>
      }
    >
      <ul className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
        {records.map((record) => (
          <li key={record.id} className="rounded-md border border-line-subtle bg-inset p-2">
            <Checkbox
              checked={selected.has(record.id)}
              onChange={() => toggle(record.id)}
              label={record.path ? basename(record.path) : record.title}
              description={
                <span className="block text-2xs break-all text-ink-tertiary">
                  {record.path ?? 'Never saved'} · edited {formatRelativeTime(record.updatedAt)} ·{' '}
                  {pluralize(record.content.length, 'character')}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </Modal>
  )
}
