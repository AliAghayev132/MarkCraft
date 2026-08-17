// ── @lib ───────────────────────────────────────────────────────────────────
import { useEffect, useRef } from '@lib/react'

// ── @shared ────────────────────────────────────────────────────────────────
import type { RecoveryRecord } from '@shared'

// ── @services ──────────────────────────────────────────────────────────────
import { recoveryService } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState, isDirty, selectDirtyDocuments, store, useAppSelector } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { saveDocument } from './document-save'

// ── types ──────────────────────────────────────────────────────────────────
import type { DocumentModel, DocumentsState } from '@store/slices/types'

/**
 * Autosave and the crash-recovery journal.
 *
 * Two independent protections, deliberately not conflated:
 *
 *  - The **journal** always runs while a document is dirty. It writes the
 *    in-memory content to the app's data directory, never to the user's file,
 *    so an unexpected exit can be recovered from — including for untitled
 *    documents that have no file at all.
 *
 *  - **Autosave** is opt-in and writes to the real file, through exactly the
 *    same conflict-checked path as a manual save. It can never silently clobber
 *    an external change.
 */
export function useAutosave(): void {
  const settings = useAppSelector((state) => state.settings.values.files)

  const journalTimers = useRef(new Map<string, number>())
  const autosaveTimers = useRef(new Map<string, number>())
  const lastJournaled = useRef(new Map<string, string>())

  useEffect(() => {
    const journal = journalTimers.current
    const autosave = autosaveTimers.current
    const journaled = lastJournaled.current

    const onChange = (documents: DocumentsState): void => {
      for (const id of documents.order) {
        const document = documents.entities[id]
        if (!document) continue

        if (!isDirty(document)) {
          // Saved or reverted: the journal entry is now meaningless.
          if (journaled.has(id)) {
            journaled.delete(id)
            void recoveryService.drop(id)
          }
          clearTimer(journal, id)
          clearTimer(autosave, id)
          continue
        }

        if (settings.recoveryEnabled && journaled.get(id) !== document.content) {
          scheduleJournal(id, journal, journaled, settings.recoveryIntervalMs)
        }

        if (settings.autoSave === 'afterDelay' && document.path) {
          scheduleAutosave(id, autosave, settings.autoSaveDelayMs)
        }
      }

      // Documents closed since the last tick.
      for (const id of [...journaled.keys()]) {
        if (!documents.entities[id]) {
          journaled.delete(id)
          clearTimer(journal, id)
          clearTimer(autosave, id)
        }
      }
    }

    onChange(getState().documents)

    let previous = getState().documents
    const unsubscribe = store.subscribe(() => {
      const next = getState().documents
      // Only react to document changes — settings and workspace actions also
      // fire this listener.
      if (next === previous) return
      previous = next
      onChange(next)
    })

    return () => {
      unsubscribe()
      for (const timer of journal.values()) window.clearTimeout(timer)
      for (const timer of autosave.values()) window.clearTimeout(timer)
      journal.clear()
      autosave.clear()
    }
  }, [
    settings.recoveryEnabled,
    settings.recoveryIntervalMs,
    settings.autoSave,
    settings.autoSaveDelayMs
  ])

  /* ── Save on focus loss ────────────────────────────────────────────────── */
  useEffect(() => {
    if (settings.autoSave !== 'onFocusChange') return

    const onBlur = (): void => {
      for (const document of selectDirtyDocuments(getState())) {
        if (document.path) void saveDocument(document.id, { silent: true })
      }
    }

    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [settings.autoSave])

  /* ── Last-chance journal flush ─────────────────────────────────────────── */
  useEffect(() => {
    const onBeforeUnload = (): void => {
      if (!settings.recoveryEnabled) return
      for (const document of selectDirtyDocuments(getState())) {
        void recoveryService.put(recordFor(document))
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [settings.recoveryEnabled])
}

function recordFor(document: DocumentModel): RecoveryRecord {
  return {
    id: document.id,
    path: document.path,
    title: document.title,
    content: document.content,
    baseHash: document.stamp?.hash ?? null,
    updatedAt: Date.now()
  }
}

function clearTimer(timers: Map<string, number>, id: string): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timers.delete(id)
  }
}

function scheduleJournal(
  id: string,
  timers: Map<string, number>,
  journaled: Map<string, string>,
  delayMs: number
): void {
  clearTimer(timers, id)
  timers.set(
    id,
    window.setTimeout(() => {
      timers.delete(id)
      const current = getState().documents.entities[id]
      if (!current || !isDirty(current)) return
      journaled.set(id, current.content)
      void recoveryService.put(recordFor(current))
    }, delayMs)
  )
}

function scheduleAutosave(id: string, timers: Map<string, number>, delayMs: number): void {
  clearTimer(timers, id)
  timers.set(
    id,
    window.setTimeout(() => {
      timers.delete(id)
      const current = getState().documents.entities[id]
      // Never autosave over an external change — the user must decide.
      if (!current || !isDirty(current) || !current.path || current.external !== 'none') return
      void saveDocument(id, { silent: true })
    }, delayMs)
  )
}
