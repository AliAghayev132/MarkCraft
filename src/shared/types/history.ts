/**
 * A saved state of one document.
 *
 * The path is stored so an entry can be shown when the file is reopened in a
 * later session, and so a rename does not silently orphan the history.
 */
export interface HistoryEntry {
  id: string
  /** The document this version belongs to, as it was at the time. */
  path: string
  savedAt: number
  bytes: number
  /** First heading or first line, so the list is scannable without opening. */
  summary: string
}

export interface HistoryVersion {
  entry: HistoryEntry
  content: string
}

/** Default number of versions kept per document. Zero turns history off. */
export const DEFAULT_HISTORY_LIMIT = 50
