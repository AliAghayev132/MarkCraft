/**
 * Repairs for the linter's findings.
 *
 * Only the four rules where the correct output is not a judgement call. A
 * "clean up" that guessed — inventing alt text, picking a language for a fence,
 * renumbering headings — would edit meaning rather than form, and a user who
 * found it had rewritten a sentence would never run it again.
 *
 * The four here are all form: whitespace that does not render, a heading whose
 * hash is not separated from its words, and a fence that was never closed.
 */
export interface FixOutcome {
  text: string
  /** Rule ids repaired, with how many times each was applied. */
  applied: Record<string, number>
  /** True when nothing needed doing — the caller can say so rather than lie. */
  clean: boolean
}

const FENCE = /^\s*(```|~~~)/

export interface FixOptions {
  /** Spaces a tab becomes. Matches the editor's own setting. */
  tabWidth?: number
}

export function fixMarkdown(markdown: string, { tabWidth = 2 }: FixOptions = {}): FixOutcome {
  const applied: Record<string, number> = {}
  const count = (rule: string): void => {
    applied[rule] = (applied[rule] ?? 0) + 1
  }

  const lines = markdown.split('\n')
  const out: string[] = []

  let inFence = false
  let marker = ''

  for (const line of lines) {
    const fence = line.match(FENCE)
    if (fence) {
      if (!inFence) {
        inFence = true
        marker = fence[1]
      } else if (line.trim().startsWith(marker)) {
        inFence = false
      }
      out.push(line)
      continue
    }

    // Inside a fence the whitespace is the content. Touching it would change
    // what the code says, which is the opposite of a safe repair.
    if (inFence) {
      out.push(line)
      continue
    }

    let fixed = line

    /*
     * ── MD009: trailing whitespace ───────────────────────────────────────
     *
     * First, and measured against the line as written. Expanding a trailing
     * tab before this ran would turn it into two spaces — a hard break the
     * author never asked for, invented by the tool meant to tidy up.
     *
     * Exactly two spaces is a deliberate hard break and is left alone. Three
     * or more is someone who meant two, so it becomes two rather than none.
     */
    const trailing = fixed.match(/[ \t]+$/)
    if (trailing && trailing[0] !== '  ') {
      const body = fixed.slice(0, -trailing[0].length)
      // A blank line's whitespace is never a hard break; it just goes.
      fixed = body.trim() === '' ? '' : trailing[0].length > 2 ? `${body}  ` : body
      count('MD009')
    }

    // ── MD010: tabs ──────────────────────────────────────────────────────
    if (fixed.includes('\t')) {
      fixed = fixed.replace(/\t/g, ' '.repeat(tabWidth))
      count('MD010')
    }

    // ── MD018: `#Heading` is not a heading at all ────────────────────────
    const jammed = fixed.match(/^(#{1,6})([^#\s].*)$/)
    if (jammed) {
      fixed = `${jammed[1]} ${jammed[2]}`
      count('MD018')
    }

    out.push(fixed)
  }

  // ── MD046: a fence that was opened and never closed ────────────────────
  if (inFence) {
    out.push(marker)
    count('MD046')
  }

  return {
    text: out.join('\n'),
    applied,
    clean: Object.keys(applied).length === 0
  }
}

/** Total repairs, for a "fixed N problems" message. */
export function fixCount(outcome: FixOutcome): number {
  return Object.values(outcome.applied).reduce((total, n) => total + n, 0)
}
