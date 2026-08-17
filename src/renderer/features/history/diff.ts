// ── types ──────────────────────────────────────────────────────────────────
import type { DiffLine, DiffSummary } from './types'

/**
 * A line diff, written out rather than pulled in.
 *
 * The algorithm below is the standard longest-common-subsequence walk, which is
 * about sixty lines — cheaper than a dependency in a process that renders
 * untrusted Markdown, and small enough to be read and tested. Line granularity
 * is the right unit for prose: a character diff of a rewritten paragraph is
 * noise, and the user is deciding whether to restore a version, not reviewing a
 * patch.
 *
 * The common prefix and suffix are stripped first. Two versions of a document
 * usually differ in one place, and trimming turns the quadratic table from
 * "every line" into "the part that changed" — which is what keeps this usable
 * on a long file.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n')
  const b = after.split('\n')

  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++

  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++
  }

  const middleA = a.slice(head, a.length - tail)
  const middleB = b.slice(head, b.length - tail)

  const result: DiffLine[] = []

  for (let index = 0; index < head; index++) {
    result.push({ kind: 'same', text: a[index] ?? '', beforeLine: index + 1, afterLine: index + 1 })
  }

  result.push(...walk(middleA, middleB, head))

  for (let index = 0; index < tail; index++) {
    const beforeIndex = a.length - tail + index
    const afterIndex = b.length - tail + index
    result.push({
      kind: 'same',
      text: a[beforeIndex] ?? '',
      beforeLine: beforeIndex + 1,
      afterLine: afterIndex + 1
    })
  }

  return result
}

/** The LCS table for the part that actually differs. */
function walk(a: string[], b: string[], offset: number): DiffLine[] {
  const rows = a.length
  const columns = b.length

  // lengths[i][j] = length of the LCS of a[i..] and b[j..]
  const lengths: number[][] = Array.from({ length: rows + 1 }, () =>
    new Array<number>(columns + 1).fill(0)
  )

  for (let i = rows - 1; i >= 0; i--) {
    for (let j = columns - 1; j >= 0; j--) {
      lengths[i][j] =
        a[i] === b[j]
          ? (lengths[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(lengths[i + 1]?.[j] ?? 0, lengths[i]?.[j + 1] ?? 0)
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0

  while (i < rows && j < columns) {
    if (a[i] === b[j]) {
      result.push({
        kind: 'same',
        text: a[i] ?? '',
        beforeLine: offset + i + 1,
        afterLine: offset + j + 1
      })
      i++
      j++
    } else if ((lengths[i + 1]?.[j] ?? 0) >= (lengths[i]?.[j + 1] ?? 0)) {
      result.push({ kind: 'removed', text: a[i] ?? '', beforeLine: offset + i + 1, afterLine: null })
      i++
    } else {
      result.push({ kind: 'added', text: b[j] ?? '', beforeLine: null, afterLine: offset + j + 1 })
      j++
    }
  }

  while (i < rows) {
    result.push({ kind: 'removed', text: a[i] ?? '', beforeLine: offset + i + 1, afterLine: null })
    i++
  }
  while (j < columns) {
    result.push({ kind: 'added', text: b[j] ?? '', beforeLine: null, afterLine: offset + j + 1 })
    j++
  }

  return result
}

export function summariseDiff(lines: DiffLine[]): DiffSummary {
  let added = 0
  let removed = 0

  for (const line of lines) {
    if (line.kind === 'added') added++
    else if (line.kind === 'removed') removed++
  }

  return { added, removed, unchanged: lines.length - added - removed }
}

/**
 * Drops long stretches of unchanged text, keeping `context` lines either side.
 *
 * Without this the panel is mostly lines the user did not change, and the two
 * edits they are looking for are somewhere in the middle of it.
 */
export function collapseUnchanged(lines: DiffLine[], context = 3): DiffLine[] {
  const keep = new Array<boolean>(lines.length).fill(false)

  lines.forEach((line, index) => {
    if (line.kind === 'same') return
    for (let offset = -context; offset <= context; offset++) {
      const target = index + offset
      if (target >= 0 && target < lines.length) keep[target] = true
    }
  })

  const result: DiffLine[] = []
  let skipped = 0

  lines.forEach((line, index) => {
    if (keep[index]) {
      if (skipped > 0) {
        result.push({ kind: 'gap', text: String(skipped), beforeLine: null, afterLine: null })
        skipped = 0
      }
      result.push(line)
    } else {
      skipped++
    }
  })

  if (skipped > 0) {
    result.push({ kind: 'gap', text: String(skipped), beforeLine: null, afterLine: null })
  }

  return result
}
