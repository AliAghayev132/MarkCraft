// ── @shared ────────────────────────────────────────────────────────────────
import { basename, dirname, normalizeSeparators, stem } from './path'

/**
 * A folder of documents, read as one book.
 *
 * The order comes from a `SUMMARY.md` written as a nested Markdown list of
 * links — the convention mdBook, GitBook and Honkit already use. That choice
 * matters more than it looks: the table of contents is then a normal document
 * the author edits in this editor, reorders by dragging lines, and reads on
 * GitHub. A JSON manifest or a hidden database would be a second thing to keep
 * in step, editable only through UI we would have to build.
 */
export interface Chapter {
  /** Workspace-relative, forward slashes. Null for a heading with no link. */
  path: string | null
  title: string
  /** 0 for a top-level entry, 1 for a child, and so on. */
  depth: number
  /** 1-based line in the summary, so an entry can be clicked through to. */
  line: number
}

const ENTRY = /^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[([^\]]*)\]\(([^)]*)\)|(.+))\s*$/
const HEADING = /^(#{1,6})\s+(.*\S)\s*$/

/*
 * Indentation is measured in the units the file actually uses rather than
 * assumed to be two spaces: a summary written with tabs or four-space indents
 * is just as valid, and guessing wrong flattens the whole structure.
 */
function depthOf(indent: string, unit: number): number {
  const width = indent.replace(/\t/g, '    ').length
  return unit === 0 ? 0 : Math.round(width / unit)
}

export function parseSummary(markdown: string): Chapter[] {
  const lines = markdown.split('\n')

  // The first indented entry establishes the unit for the whole file.
  let unit = 0
  for (const line of lines) {
    const matched = line.match(ENTRY)
    const width = matched?.[1].replace(/\t/g, '    ').length ?? 0
    if (matched && width > 0) {
      unit = width
      break
    }
  }

  const chapters: Chapter[] = []

  lines.forEach((line, index) => {
    // A heading in the summary is a part title — a divider, not a document.
    const heading = line.match(HEADING)
    if (heading) {
      chapters.push({ path: null, title: heading[2], depth: 0, line: index + 1 })
      return
    }

    const entry = line.match(ENTRY)
    if (!entry) return

    const [, indent, label, target, bare] = entry

    // A list item with no link is a section that groups the ones beneath it.
    if (bare !== undefined) {
      chapters.push({ path: null, title: bare.trim(), depth: depthOf(indent, unit), line: index + 1 })
      return
    }

    const path = normalizeSeparators(decodeTarget(target.trim()))
    if (path === '') return

    chapters.push({
      path,
      title: label.trim() || stem(basename(path)),
      depth: depthOf(indent, unit),
      line: index + 1
    })
  })

  return chapters
}

function decodeTarget(target: string): string {
  try {
    return decodeURI(target)
  } catch {
    return target
  }
}

export interface ChapterContent {
  chapter: Chapter
  markdown: string
}

/**
 * Joins the chapters into a single document.
 *
 * Each chapter's headings are pushed down by its depth in the book, so a
 * chapter that is an `# Introduction` on its own becomes `## Introduction`
 * under a part — otherwise a combined export has a dozen level-one headings
 * and no structure at all. A chapter with a heading already at level six stays
 * there; Markdown has no seventh.
 */
export function combineBook(contents: ChapterContent[]): string {
  const parts: string[] = []

  for (const { chapter, markdown } of contents) {
    if (chapter.path === null) {
      // A part divider carries no file, so its title is the only content.
      parts.push(`${'#'.repeat(Math.min(6, chapter.depth + 1))} ${chapter.title}`)
      continue
    }

    const shifted = shiftHeadings(stripFrontMatter(markdown), chapter.depth)
    if (shifted.trim() !== '') parts.push(shifted.trim())
  }

  return `${parts.join('\n\n')}\n`
}

/* Front matter belongs to its own file; repeated mid-document it is text. */
function stripFrontMatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---(\r?\n|$)/, '')
}

const FENCE = /^\s*(```|~~~)/

export function shiftHeadings(markdown: string, by: number): string {
  if (by <= 0) return markdown

  let inFence = false
  let marker = ''

  return markdown
    .split('\n')
    .map((line) => {
      const fence = line.match(FENCE)
      if (fence) {
        if (!inFence) {
          inFence = true
          marker = fence[1]
        } else if (line.trim().startsWith(marker)) {
          inFence = false
        }
        return line
      }

      // A `#` inside a fence is a comment, not a heading.
      if (inFence) return line

      const heading = line.match(/^(#{1,6})(\s+.*)$/)
      if (!heading) return line

      return '#'.repeat(Math.min(6, heading[1].length + by)) + heading[2]
    })
    .join('\n')
}

/** Chapters that point at a file, in reading order — what an export needs. */
export function readingOrder(chapters: Chapter[]): Chapter[] {
  return chapters.filter((chapter) => chapter.path !== null)
}

/** Where a summary's links are resolved from. */
export function summaryBase(summaryPath: string): string {
  return dirname(normalizeSeparators(summaryPath))
}

export interface ChapterPosition {
  /** 1-based place in reading order, or 0 when the file is not in the book. */
  index: number
  total: number
  previous: Chapter | null
  next: Chapter | null
}

/**
 * Where a file sits in the book, and what comes either side of it.
 *
 * Reading order rather than list order: a part divider is a label, and stepping
 * "next" onto something with no file to open would be a dead end.
 */
export function chapterPosition(
  chapters: Chapter[],
  path: string | null,
  /** Chapters whose file could not be read; stepped over rather than into. */
  missing: string[] = []
): ChapterPosition {
  const order = readingOrder(chapters)

  /*
   * Compared on forward slashes throughout, rather than through
   * `normalizeSeparators` — that normalises towards the platform a path looks
   * like, so a summary's forward-slash path and the backslash one the platform
   * hands back would normalise in opposite directions and never match.
   */
  const canonical = (value: string): string => value.replace(/\\/g, '/').toLowerCase()
  const wanted = path === null ? null : canonical(path)
  const gone = new Set(missing.map(canonical))

  const at =
    wanted === null ? -1 : order.findIndex((chapter) => canonical(chapter.path as string) === wanted)

  /*
   * The count is over the whole summary, because that is the book the author
   * wrote — but stepping stops only on chapters that can actually be opened.
   * Landing on a renamed-away file would leave the reader where they were with
   * no explanation, which reads as a broken button.
   */
  const step = (from: number, by: number): Chapter | null => {
    for (let at = from + by; at >= 0 && at < order.length; at += by) {
      if (!gone.has(canonical(order[at].path as string))) return order[at]
    }
    return null
  }

  return {
    index: at + 1,
    total: order.length,
    previous: at > 0 ? step(at, -1) : null,
    next: at >= 0 ? step(at, 1) : null
  }
}
