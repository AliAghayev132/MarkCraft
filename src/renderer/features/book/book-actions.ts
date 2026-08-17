// ── @shared ────────────────────────────────────────────────────────────────
import {
  combineBook,
  joinPath,
  parseSummary,
  readingOrder,
  summaryBase,
  type Chapter,
  type ChapterContent
} from '@shared'

// ── @i18n ──────────────────────────────────────────────────────────────────
import { t } from '@i18n'

// ── @services ──────────────────────────────────────────────────────────────
import { fileService, toast } from '@services'

// ── @store ─────────────────────────────────────────────────────────────────
import { getState } from '@store'

// ── @features ──────────────────────────────────────────────────────────────
import { newDocument } from '@features/documents'

/** The file that makes a folder a book. */
export const SUMMARY_NAME = 'SUMMARY.md'

export interface Book {
  /** Absolute path of the summary. */
  path: string
  chapters: Chapter[]
  /** Chapters whose file could not be read, by relative path. */
  missing: string[]
}

function summaryPath(): string | null {
  const root = getState().workspace.root
  return root ? joinPath(root, SUMMARY_NAME) : null
}

/**
 * Reads the book, if the open folder is one.
 *
 * A missing `SUMMARY.md` is not an error — most folders are not books. It is
 * the difference between "you have no book here" and "something went wrong",
 * and reporting the second for the first is how a feature becomes noise.
 */
export async function loadBook(): Promise<Book | null> {
  const path = summaryPath()
  if (!path) return null

  // Most folders are not books; asking first keeps that out of the log.
  if (!(await fileService.exists(path))) return null

  let markdown: string
  try {
    markdown = (await fileService.read(path)).content
  } catch {
    return null
  }

  const chapters = parseSummary(markdown)
  const base = summaryBase(path)
  const missing: string[] = []

  // Checked up front rather than at export time: a book with a chapter that
  // was renamed should say so while the author is looking at the list.
  await Promise.all(
    readingOrder(chapters).map(async (chapter) => {
      const there = await fileService.exists(joinPath(base, chapter.path as string))
      if (!there) missing.push(chapter.path as string)
    })
  )

  return { path, chapters, missing }
}

/**
 * Opens the whole book as one untitled document.
 *
 * Deliberately not a ninth export format. The combined text is a document like
 * any other, so every format the application already has — HTML, PDF, Word,
 * RTF, PNG — works on it without a second path to build and keep correct.
 */
export async function openBookAsDocument(book: Book): Promise<boolean> {
  const base = summaryBase(book.path)

  const contents: ChapterContent[] = []
  for (const chapter of book.chapters) {
    if (chapter.path === null) {
      contents.push({ chapter, markdown: '' })
      continue
    }

    try {
      const file = await fileService.read(joinPath(base, chapter.path))
      contents.push({ chapter, markdown: file.content })
    } catch {
      // A chapter that cannot be read is reported, not silently dropped: a
      // book missing a chapter without saying so is worse than a failed export.
      toast.warning(t('book.chapterMissing', { path: chapter.path }))
    }
  }

  const combined = combineBook(contents)
  if (combined.trim() === '') {
    toast.info(t('book.empty'))
    return false
  }

  newDocument(combined)
  toast.success(t('book.opened', { count: contents.filter((c) => c.markdown !== '').length }))

  return true
}

/** Absolute path of a chapter, for opening it on its own. */
export function chapterPath(book: Book, chapter: Chapter): string | null {
  return chapter.path === null ? null : joinPath(summaryBase(book.path), chapter.path)
}
