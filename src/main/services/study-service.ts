// ── node: ──────────────────────────────────────────────────────────────────
import { createHash } from 'node:crypto'

// ── @shared ────────────────────────────────────────────────────────────────
import { pathKey, type CardState, type StudyRecord } from '@shared'

// ── ../util ────────────────────────────────────────────────────────────────
import { JsonStore } from '../util/json-store'

/**
 * When each flashcard is next due.
 *
 * Kept beside the application's data rather than in the document, because a
 * review schedule is personal: two people studying the same shared file have
 * different ones, and writing "next due Thursday" into someone's notes would
 * put churn into their version control for a fact only their machine cares
 * about.
 *
 * Keyed by a hash of the document path and then by a hash of the card's own
 * text. Hashing the text rather than numbering the cards is what lets the
 * document be reordered, added to, and rewritten around a card without the
 * card losing its history — which is the whole point of studying from a note
 * you keep editing.
 */
interface StudyFile {
  /** Document hash → card hash → schedule. */
  documents: Record<string, Record<string, StudyRecord>>
}

let store: JsonStore<StudyFile> | null = null

function getStore(): JsonStore<StudyFile> {
  store ??= new JsonStore<StudyFile>({
    file: 'study.json',
    defaults: { documents: {} },
    version: 1,
    debounceMs: 200
  })

  return store
}

function documentKey(documentPath: string): string {
  return createHash('sha256').update(pathKey(documentPath)).digest('hex').slice(0, 16)
}


export async function loadStudy(documentPath: string): Promise<Record<string, StudyRecord>> {
  const data = await getStore().read()
  return data.documents[documentKey(documentPath)] ?? {}
}

export async function saveStudy(
  documentPath: string,
  card: string,
  state: CardState,
  due: number
): Promise<void> {
  const key = documentKey(documentPath)

  // A read-modify-write would lose a grade if two cards were saved in the same
  // tick; `update` serialises them through the store itself.
  await getStore().update((current) => ({
    documents: {
      ...current.documents,
      [key]: { ...(current.documents[key] ?? {}), [card]: { ...state, due } }
    }
  }))
}

/**
 * Forgets a document's schedule.
 *
 * Offered because a deck that has drifted out of step with the notes is worth
 * restarting, and hunting for a JSON file in an application data folder is not
 * something a user should have to do.
 */
export async function resetStudy(documentPath: string): Promise<void> {
  await getStore().update((current) => {
    const documents = { ...current.documents }
    delete documents[documentKey(documentPath)]
    return { documents }
  })
}
