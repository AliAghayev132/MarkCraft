/**
 * A small Markdown linter.
 *
 * Every rule earns its place by catching something that *renders wrong or reads
 * wrong* — not by enforcing a house style. A linter that complains about line
 * length in prose gets switched off within a day, and takes the useful warnings
 * with it.
 *
 * Rule ids follow the markdownlint convention where one exists, so a user who
 * already knows `MD001` is not learning a second vocabulary.
 */
export type LintSeverity = 'warning' | 'error'

export interface LintProblem {
  /** e.g. `MD001`. Stable, so a rule can be looked up or muted later. */
  rule: string
  severity: LintSeverity
  /** 1-based, so a result can be clicked through to the line. */
  line: number
  /** Filled into the translated message for this rule. */
  values: Record<string, string | number>
}

const FENCE_LINE = /^\s*(```|~~~)/

export function lintMarkdown(markdown: string): LintProblem[] {
  const problems: LintProblem[] = []
  const lines = markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '').split('\n')

  let inFence = false
  let fenceMarker = ''
  let previousLevel = 0
  let firstHeadingLine = 0
  let topLevelCount = 0

  lines.forEach((line, index) => {
    const number = index + 1

    // ── Fences ───────────────────────────────────────────────────────────
    const fence = line.match(FENCE_LINE)
    if (fence) {
      if (!inFence) {
        inFence = true
        fenceMarker = fence[1]

        const info = line.slice(line.indexOf(fenceMarker) + fenceMarker.length).trim()
        if (info === '') {
          problems.push({ rule: 'MD040', severity: 'warning', line: number, values: {} })
        }
      } else if (line.trim().startsWith(fenceMarker)) {
        inFence = false
      }
      return
    }

    if (inFence) return

    // ── Headings ─────────────────────────────────────────────────────────
    const heading = line.match(/^(#{1,6})(\s*)(.*)$/)
    if (heading) {
      const level = heading[1].length

      if (heading[2] === '' && heading[3] !== '') {
        // `#Heading` is not a heading at all — it renders as literal text.
        problems.push({ rule: 'MD018', severity: 'error', line: number, values: {} })
      }

      if (level === 1) {
        topLevelCount++
        if (topLevelCount === 2) {
          problems.push({ rule: 'MD025', severity: 'warning', line: number, values: {} })
        }
      }

      if (previousLevel !== 0 && level > previousLevel + 1) {
        problems.push({
          rule: 'MD001',
          severity: 'warning',
          line: number,
          values: { from: previousLevel, to: level }
        })
      }

      previousLevel = level
      if (firstHeadingLine === 0) firstHeadingLine = number
      return
    }

    // ── Inline content ───────────────────────────────────────────────────
    for (const match of line.matchAll(/!\[([^\]]*)\]\(/g)) {
      if (match[1].trim() === '') {
        problems.push({ rule: 'MD045', severity: 'warning', line: number, values: {} })
      }
    }

    for (const match of line.matchAll(/\[([^\]]*)\]\(([^)\s]*)\)/g)) {
      if (match[2].trim() === '') {
        problems.push({ rule: 'MD042', severity: 'error', line: number, values: {} })
      }
    }

    if (/\t/.test(line)) {
      problems.push({ rule: 'MD010', severity: 'warning', line: number, values: {} })
    }

    /*
     * Exactly two trailing spaces are a deliberate hard break. One is invisible
     * dirt, and three or more is someone who meant two — "ends with two spaces"
     * would wave all of those through.
     */
    const trailing = line.match(/[ \t]+$/)
    if (trailing && line.trim() !== '' && trailing[0] !== '  ') {
      problems.push({ rule: 'MD009', severity: 'warning', line: number, values: {} })
    }
  })

  if (inFence) {
    problems.push({ rule: 'MD046', severity: 'error', line: lines.length, values: {} })
  }

  return problems.sort((a, b) => a.line - b.line)
}

/** Every rule this build can report, for a settings screen or documentation. */
export const LINT_RULES = [
  'MD001',
  'MD009',
  'MD010',
  'MD018',
  'MD025',
  'MD040',
  'MD042',
  'MD045',
  'MD046'
] as const
